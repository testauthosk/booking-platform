#!/usr/bin/env python3
"""
Fresha.com Full Scanner — максимальный сбор для реверс-инжиниринга
Собирает: скриншоты, API, стили, ассеты, структуру
"""

import asyncio
import json
import os
import re
import hashlib
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, urljoin
import base64

from camoufox.async_api import AsyncCamoufox

# Папки для результатов
OUTPUT_DIR = Path(__file__).parent / "output"
PAGES_DIR = OUTPUT_DIR / "pages"  # Все страницы с файлами вместе
API_DIR = OUTPUT_DIR / "api"
ASSETS_DIR = OUTPUT_DIR / "assets"
ANALYSIS_DIR = OUTPUT_DIR / "analysis"


class FreshaScanner:
    def __init__(self):
        self.api_calls = []
        self.pages = []
        self.entities = {}
        self.navigation = []
        self.assets = set()
        
    async def setup_dirs(self):
        """Создаём папки"""
        for d in [OUTPUT_DIR, PAGES_DIR, API_DIR, ASSETS_DIR, ANALYSIS_DIR]:
            d.mkdir(parents=True, exist_ok=True)
    
    async def intercept_requests(self, route):
        """Перехватываем все API запросы"""
        request = route.request
        url = request.url
        
        # Пропускаем статику
        if any(ext in url for ext in ['.png', '.jpg', '.gif', '.ico', '.woff', '.ttf']):
            await route.continue_()
            return
        
        # Логируем API вызовы
        if '/api/' in url or 'graphql' in url.lower():
            self.api_calls.append({
                "timestamp": datetime.now().isoformat(),
                "method": request.method,
                "url": url,
                "headers": dict(request.headers),
                "post_data": request.post_data
            })
        
        await route.continue_()
    
    async def intercept_responses(self, response):
        """Перехватываем ответы API"""
        url = response.url
        
        if '/api/' in url or 'graphql' in url.lower():
            try:
                body = await response.text()
                # Ищем соответствующий запрос
                for call in reversed(self.api_calls):
                    if call["url"] == url and "response" not in call:
                        call["response"] = {
                            "status": response.status,
                            "headers": dict(response.headers),
                            "body": body[:50000]  # Лимит на размер
                        }
                        
                        # Парсим JSON для анализа сущностей
                        try:
                            data = json.loads(body)
                            self.extract_entities(url, data)
                        except:
                            pass
                        break
            except:
                pass
    
    def extract_entities(self, url, data, prefix=""):
        """Извлекаем сущности из API ответов"""
        if isinstance(data, dict):
            # Ищем типичные паттерны сущностей
            for key in ['id', 'uuid', 'type', 'name', 'title']:
                if key in data:
                    entity_type = self.guess_entity_type(url, data)
                    if entity_type not in self.entities:
                        self.entities[entity_type] = {
                            "fields": set(),
                            "examples": []
                        }
                    
                    # Собираем все поля
                    for field in data.keys():
                        self.entities[entity_type]["fields"].add(field)
                    
                    # Сохраняем пример (максимум 3)
                    if len(self.entities[entity_type]["examples"]) < 3:
                        self.entities[entity_type]["examples"].append(data)
                    break
            
            # Рекурсивно обходим вложенные объекты
            for key, value in data.items():
                self.extract_entities(url, value, f"{prefix}.{key}")
        
        elif isinstance(data, list):
            for item in data[:5]:  # Первые 5 элементов
                self.extract_entities(url, item, prefix)
    
    def guess_entity_type(self, url, data):
        """Угадываем тип сущности по URL и данным"""
        url_lower = url.lower()
        
        patterns = [
            ('appointment', ['appointment', 'booking', 'reservation']),
            ('client', ['client', 'customer', 'user', 'member']),
            ('service', ['service', 'treatment', 'product']),
            ('staff', ['staff', 'employee', 'team', 'worker']),
            ('location', ['location', 'venue', 'branch', 'salon']),
            ('schedule', ['schedule', 'calendar', 'availability', 'slot']),
            ('payment', ['payment', 'transaction', 'invoice', 'charge']),
            ('notification', ['notification', 'message', 'alert']),
        ]
        
        for entity_name, keywords in patterns:
            if any(kw in url_lower for kw in keywords):
                return entity_name
        
        # По типу в данных
        if 'type' in data:
            return str(data['type']).lower()
        
        # По URL
        parts = urlparse(url).path.split('/')
        for part in reversed(parts):
            if part and not part.isdigit():
                return part
        
        return "unknown"
    
    async def save_page(self, page, name: str):
        """Полное сохранение страницы — все файлы в одной папке"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = re.sub(r'[^\w\-]', '_', name)[:50]
        
        # Создаём папку для этой страницы
        page_dir = PAGES_DIR / f"{safe_name}"
        page_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"  📸 Скриншот...")
        screenshot_path = page_dir / "screenshot.png"
        await page.screenshot(path=str(screenshot_path), full_page=True)
        
        print(f"  📄 HTML...")
        html_path = page_dir / "page.html"
        html_content = await page.content()
        html_path.write_text(html_content, encoding="utf-8")
        
        print(f"  🎨 Стили...")
        styles = await self.extract_all_styles(page)
        styles_path = page_dir / "styles.json"
        styles_path.write_text(json.dumps(styles, indent=2, ensure_ascii=False), encoding="utf-8")
        
        print(f"  🧩 Компоненты...")
        components = await self.analyze_components(page)
        components_path = page_dir / "components.json"
        components_path.write_text(json.dumps(components, indent=2, ensure_ascii=False), encoding="utf-8")
        
        # Метаданные страницы
        meta = {
            "name": name,
            "url": page.url,
            "scanned_at": timestamp
        }
        meta_path = page_dir / "meta.json"
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        
        page_data = {
            "name": name,
            "url": page.url,
            "timestamp": timestamp,
            "folder": str(page_dir),
            "files": {
                "screenshot": str(screenshot_path),
                "html": str(html_path),
                "styles": str(styles_path),
                "components": str(components_path)
            },
            "components": components
        }
        
        self.pages.append(page_data)
        return page_data
    
    async def extract_all_styles(self, page):
        """Извлекаем все стили"""
        return await page.evaluate("""
            () => {
                const result = {
                    variables: {},
                    classes: {},
                    keyStyles: {}
                };
                
                // CSS переменные
                const root = getComputedStyle(document.documentElement);
                const rootStyles = document.documentElement.style.cssText;
                
                // Собираем все CSS переменные из :root
                for (const sheet of document.styleSheets) {
                    try {
                        for (const rule of sheet.cssRules) {
                            if (rule.selectorText === ':root') {
                                for (const prop of rule.style) {
                                    if (prop.startsWith('--')) {
                                        result.variables[prop] = rule.style.getPropertyValue(prop);
                                    }
                                }
                            }
                        }
                    } catch(e) {}
                }
                
                // Ключевые элементы и их стили
                const keyElements = [
                    'button', 'input', 'select', 'textarea',
                    '[class*="card"]', '[class*="modal"]', '[class*="header"]',
                    '[class*="sidebar"]', '[class*="nav"]', '[class*="menu"]',
                    '[class*="table"]', '[class*="form"]', '[class*="btn"]'
                ];
                
                keyElements.forEach(selector => {
                    const el = document.querySelector(selector);
                    if (el) {
                        const computed = getComputedStyle(el);
                        result.keyStyles[selector] = {
                            color: computed.color,
                            backgroundColor: computed.backgroundColor,
                            fontFamily: computed.fontFamily,
                            fontSize: computed.fontSize,
                            fontWeight: computed.fontWeight,
                            padding: computed.padding,
                            margin: computed.margin,
                            borderRadius: computed.borderRadius,
                            boxShadow: computed.boxShadow
                        };
                    }
                });
                
                // Уникальные классы
                const allClasses = new Set();
                document.querySelectorAll('*').forEach(el => {
                    el.classList.forEach(cls => allClasses.add(cls));
                });
                result.allClasses = Array.from(allClasses).slice(0, 500);
                
                return result;
            }
        """)
    
    async def analyze_components(self, page):
        """Детальный анализ компонентов"""
        return await page.evaluate("""
            () => {
                const components = {
                    buttons: [],
                    forms: [],
                    inputs: [],
                    tables: [],
                    modals: [],
                    cards: [],
                    lists: [],
                    navigation: [],
                    headers: [],
                    footers: []
                };
                
                // Кнопки
                document.querySelectorAll('button, [role="button"], a[class*="btn"], [class*="button"]').forEach(el => {
                    const rect = el.getBoundingClientRect();
                    components.buttons.push({
                        text: el.textContent?.trim().slice(0, 100),
                        classes: el.className,
                        type: el.type || 'button',
                        size: { width: rect.width, height: rect.height },
                        hasIcon: el.querySelector('svg, img, [class*="icon"]') !== null
                    });
                });
                
                // Инпуты
                document.querySelectorAll('input, select, textarea').forEach(el => {
                    components.inputs.push({
                        type: el.type || el.tagName.toLowerCase(),
                        name: el.name,
                        placeholder: el.placeholder,
                        required: el.required,
                        classes: el.className,
                        label: document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()
                    });
                });
                
                // Формы
                document.querySelectorAll('form').forEach(el => {
                    const inputs = el.querySelectorAll('input, select, textarea');
                    const buttons = el.querySelectorAll('button, [type="submit"]');
                    components.forms.push({
                        action: el.action,
                        method: el.method,
                        inputCount: inputs.length,
                        inputTypes: Array.from(inputs).map(i => i.type || i.tagName),
                        buttonCount: buttons.length,
                        classes: el.className
                    });
                });
                
                // Таблицы
                document.querySelectorAll('table, [role="table"], [class*="table"]').forEach(el => {
                    const headers = el.querySelectorAll('th, [role="columnheader"]');
                    const rows = el.querySelectorAll('tr, [role="row"]');
                    components.tables.push({
                        headers: Array.from(headers).map(h => h.textContent?.trim().slice(0, 50)),
                        rowCount: rows.length,
                        classes: el.className
                    });
                });
                
                // Карточки
                document.querySelectorAll('[class*="card"], [class*="Card"]').forEach(el => {
                    components.cards.push({
                        hasImage: el.querySelector('img') !== null,
                        hasTitle: el.querySelector('h1, h2, h3, h4, [class*="title"]') !== null,
                        hasActions: el.querySelector('button, a') !== null,
                        classes: el.className
                    });
                });
                
                // Навигация
                document.querySelectorAll('nav, [role="navigation"], [class*="sidebar"], [class*="menu"]').forEach(el => {
                    const links = el.querySelectorAll('a');
                    components.navigation.push({
                        linkCount: links.length,
                        links: Array.from(links).slice(0, 20).map(a => ({
                            text: a.textContent?.trim().slice(0, 50),
                            href: a.href
                        })),
                        classes: el.className
                    });
                });
                
                // Модальные окна
                document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"]').forEach(el => {
                    components.modals.push({
                        hasClose: el.querySelector('[class*="close"], button') !== null,
                        hasTitle: el.querySelector('h1, h2, h3, [class*="title"]') !== null,
                        hasForm: el.querySelector('form') !== null,
                        classes: el.className
                    });
                });
                
                return components;
            }
        """)
    
    async def collect_assets(self, page):
        """Собираем ссылки на ассеты"""
        assets = await page.evaluate(r"""
            () => {
                const assets = {
                    images: [],
                    fonts: [],
                    icons: []
                };
                
                // Картинки
                document.querySelectorAll('img').forEach(img => {
                    if (img.src) assets.images.push(img.src);
                });
                
                // SVG иконки
                document.querySelectorAll('svg').forEach(svg => {
                    const html = svg.outerHTML;
                    if (html.length < 5000) {
                        assets.icons.push(html);
                    }
                });
                
                // Шрифты из CSS
                for (const sheet of document.styleSheets) {
                    try {
                        for (const rule of sheet.cssRules) {
                            if (rule.cssText?.includes('@font-face')) {
                                const match = rule.cssText.match(/url\(['"]?([^'"]+)['"]?\)/);
                                if (match) assets.fonts.push(match[1]);
                            }
                        }
                    } catch(e) {}
                }
                
                return assets;
            }
        """)
        
        # Сохраняем уникальные SVG иконки
        icons_dir = ASSETS_DIR / "icons"
        icons_dir.mkdir(exist_ok=True)
        
        for i, svg in enumerate(assets.get("icons", [])[:100]):
            hash_name = hashlib.md5(svg.encode()).hexdigest()[:8]
            icon_path = icons_dir / f"icon_{hash_name}.svg"
            if not icon_path.exists():
                icon_path.write_text(svg, encoding="utf-8")
        
        return assets
    
    async def scan_page(self, page, name: str):
        """Полное сканирование одной страницы"""
        print(f"\n🔍 Сканирую: {name}")
        
        await page.wait_for_load_state("domcontentloaded")
        await asyncio.sleep(2)  # Даём время на рендер
        
        page_data = await self.save_page(page, name)
        await self.collect_assets(page)
        
        return page_data
    
    async def discover_navigation(self, page):
        """Находим все разделы навигации"""
        nav_items = await page.evaluate("""
            () => {
                const items = [];
                const seen = new Set();
                
                // Все ссылки в навигации/сайдбаре
                document.querySelectorAll('nav a, [class*="sidebar"] a, [class*="menu"] a, [role="navigation"] a').forEach(a => {
                    if (a.href && !seen.has(a.href) && a.href.startsWith('http')) {
                        seen.add(a.href);
                        items.push({
                            text: a.textContent?.trim(),
                            href: a.href,
                            icon: a.querySelector('svg') ? 'yes' : 'no'
                        });
                    }
                });
                
                return items;
            }
        """)
        
        self.navigation = nav_items
        return nav_items
    
    async def generate_architecture(self):
        """Генерируем документ архитектуры"""
        
        # Конвертируем sets в lists для JSON
        entities_json = {}
        for name, data in self.entities.items():
            entities_json[name] = {
                "fields": list(data["fields"]),
                "examples": data["examples"]
            }
        
        architecture = {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_pages": len(self.pages),
                "total_api_calls": len(self.api_calls),
                "entities_found": list(self.entities.keys()),
                "navigation_items": len(self.navigation)
            },
            "navigation": self.navigation,
            "entities": entities_json,
            "pages": self.pages,
            "api_endpoints": self.get_unique_endpoints()
        }
        
        # JSON отчёт
        arch_path = ANALYSIS_DIR / "architecture.json"
        arch_path.write_text(json.dumps(architecture, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
        
        # API calls отдельно
        api_path = API_DIR / "all_api_calls.json"
        api_path.write_text(json.dumps(self.api_calls, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
        
        # Markdown отчёт
        md_report = self.generate_markdown_report(architecture)
        md_path = ANALYSIS_DIR / "ARCHITECTURE.md"
        md_path.write_text(md_report, encoding="utf-8")
        
        print(f"\n📊 Архитектура сохранена: {arch_path}")
        print(f"📝 Markdown отчёт: {md_path}")
        
        return architecture
    
    def get_unique_endpoints(self):
        """Уникальные API endpoints"""
        endpoints = {}
        for call in self.api_calls:
            url = call["url"]
            # Убираем ID из URL для группировки
            clean_url = re.sub(r'/[0-9a-f-]{20,}', '/{id}', url)
            clean_url = re.sub(r'/\d+', '/{id}', clean_url)
            
            if clean_url not in endpoints:
                endpoints[clean_url] = {
                    "method": call["method"],
                    "example_url": url,
                    "call_count": 0,
                    "has_response": False
                }
            
            endpoints[clean_url]["call_count"] += 1
            if "response" in call:
                endpoints[clean_url]["has_response"] = True
        
        return endpoints
    
    def generate_markdown_report(self, arch):
        """Генерируем читаемый Markdown отчёт"""
        md = f"""# Fresha Architecture Report

Generated: {arch['generated_at']}

## Summary

- **Pages scanned:** {arch['summary']['total_pages']}
- **API calls captured:** {arch['summary']['total_api_calls']}
- **Entities discovered:** {', '.join(arch['summary']['entities_found']) or 'none'}
- **Navigation items:** {arch['summary']['navigation_items']}

---

## Navigation Structure

"""
        for nav in self.navigation[:30]:
            md += f"- [{nav['text']}]({nav['href']})\n"
        
        md += "\n---\n\n## Entities (Data Models)\n\n"
        
        for name, data in self.entities.items():
            fields = list(data["fields"])
            md += f"### {name.title()}\n\n"
            md += f"**Fields:** {', '.join(fields[:20])}\n\n"
            if data["examples"]:
                md += f"```json\n{json.dumps(data['examples'][0], indent=2, default=str)[:1000]}\n```\n\n"
        
        md += "---\n\n## API Endpoints\n\n"
        md += "| Method | Endpoint | Calls |\n"
        md += "|--------|----------|-------|\n"
        
        for endpoint, data in list(arch['api_endpoints'].items())[:50]:
            md += f"| {data['method']} | `{endpoint}` | {data['call_count']} |\n"
        
        md += "\n---\n\n## Pages Scanned\n\n"
        
        for page in self.pages:
            md += f"### {page['name']}\n\n"
            md += f"- URL: {page['url']}\n"
            md += f"- Screenshot: `{page['files']['screenshot']}`\n"
            
            components = page.get('components', {})
            md += f"- Buttons: {len(components.get('buttons', []))}\n"
            md += f"- Forms: {len(components.get('forms', []))}\n"
            md += f"- Tables: {len(components.get('tables', []))}\n"
            md += "\n"
        
        md += """---

## Next Steps

1. Review entities → create database schema
2. Review API → create API routes  
3. Review pages → create page components
4. Review components → create UI components
5. Review styles → create design system

"""
        return md
    
    async def close_popups(self, page):
        """Закрываем cookie и другие попапы"""
        try:
            await page.evaluate("""
                () => {
                    // Cookie попапы
                    const cookieSelectors = [
                        'button[data-testid="accept-all"]',
                        'button[data-testid="cookie-accept"]',
                        '[class*="cookie"] button',
                        '[class*="Cookie"] button',
                        '[class*="consent"] button',
                        '[id*="cookie"] button',
                        'button:has-text("Accept")',
                        'button:has-text("Accept all")',
                        'button:has-text("Принять")',
                        'button:has-text("OK")'
                    ];
                    
                    for (const selector of cookieSelectors) {
                        try {
                            const btn = document.querySelector(selector);
                            if (btn) {
                                btn.click();
                                console.log('Closed popup:', selector);
                                return;
                            }
                        } catch(e) {}
                    }
                    
                    // Fallback — кликаем первую кнопку в модальном окне
                    const modal = document.querySelector('[class*="modal"], [class*="popup"], [role="dialog"]');
                    if (modal) {
                        const btn = modal.querySelector('button');
                        if (btn) btn.click();
                    }
                }
            """)
        except:
            pass
    
    async def run(self):
        """Главный процесс"""
        print("🦊 Fresha Full Scanner — запуск...")
        
        await self.setup_dirs()
        
        # Папка для профиля браузера (сохраняет куки между сессиями)
        profile_dir = OUTPUT_DIR / "browser_profile"
        profile_dir.mkdir(parents=True, exist_ok=True)
        
        # Запускаем с человеческим поведением и сохранением профиля
        async with AsyncCamoufox(
            headless=False,
            window=(1280, 800),
            humanize=True,  # Человеческие движения мыши
            persistent_context=True,
            user_data_dir=str(profile_dir),
            os="windows",  # Имитируем Windows
        ) as context:
            # В persistent_context это уже context, не browser
            page = context.pages[0] if context.pages else await context.new_page()
            
            # Перехват запросов
            await page.route("**/*", self.intercept_requests)
            page.on("response", self.intercept_responses)
            
            print("\n🌐 Открываю Google...")
            await page.goto("https://www.google.com/", timeout=30000)
            
            print("\n" + "="*60)
            print("👆 ТЕПЕРЬ ТВОЯ ОЧЕРЕДЬ:")
            print("1. Перейди на Fresha (можешь загуглить или ввести адрес)")
            print("2. Залогинься в свой аккаунт")
            print("3. Когда будешь в дашборде — нажми Enter здесь")
            print("="*60)
            
            input("\n⏎ Enter для начала сканирования...")
            
            # Сканируем главную
            await self.scan_page(page, "dashboard")
            
            # Находим навигацию
            print("\n📋 Ищу разделы меню...")
            nav_items = await self.discover_navigation(page)
            print(f"   Найдено: {len(nav_items)} разделов")
            
            # Обходим все разделы
            visited = {page.url}
            
            for item in nav_items[:25]:  # Лимит 25 страниц
                href = item.get("href", "")
                if href in visited or not href.startswith("http"):
                    continue
                
                # Только страницы того же домена
                if "fresha.com" not in href:
                    continue
                
                visited.add(href)
                name = item.get("text", "unknown")
                
                try:
                    await page.goto(href, wait_until="domcontentloaded", timeout=30000)
                    await self.scan_page(page, name)
                except Exception as e:
                    print(f"⚠️ Ошибка: {name} — {e}")
            
            # Генерируем архитектуру
            print("\n📊 Генерирую архитектуру...")
            await self.generate_architecture()
            
            print("\n" + "="*60)
            print(f"✅ ГОТОВО!")
            print(f"   Страниц: {len(self.pages)}")
            print(f"   API вызовов: {len(self.api_calls)}")
            print(f"   Сущностей: {len(self.entities)}")
            print(f"\n📁 Результаты: {OUTPUT_DIR}")
            print("="*60)
            
            input("\n⏎ Enter чтобы закрыть браузер...")


if __name__ == "__main__":
    scanner = FreshaScanner()
    asyncio.run(scanner.run())
