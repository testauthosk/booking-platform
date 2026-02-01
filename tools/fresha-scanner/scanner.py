#!/usr/bin/env python3
"""
Fresha.com Scanner — вытаскиваем архитектуру для booking-platform
Использует Camoufox (антидетект Firefox) + Playwright
"""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

# Camoufox использует playwright под капотом
from camoufox.async_api import AsyncCamoufox

# Папка для результатов
OUTPUT_DIR = Path(__file__).parent / "output"
SCREENSHOTS_DIR = OUTPUT_DIR / "screenshots"
HTML_DIR = OUTPUT_DIR / "html"
ANALYSIS_DIR = OUTPUT_DIR / "analysis"


async def setup_dirs():
    """Создаём папки для вывода"""
    for d in [OUTPUT_DIR, SCREENSHOTS_DIR, HTML_DIR, ANALYSIS_DIR]:
        d.mkdir(parents=True, exist_ok=True)


async def save_page(page, name: str):
    """Сохраняем страницу: скриншот + HTML"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Скриншот
    screenshot_path = SCREENSHOTS_DIR / f"{name}_{timestamp}.png"
    await page.screenshot(path=str(screenshot_path), full_page=True)
    print(f"📸 Скриншот: {screenshot_path}")
    
    # HTML
    html_path = HTML_DIR / f"{name}_{timestamp}.html"
    html_content = await page.content()
    html_path.write_text(html_content, encoding="utf-8")
    print(f"📄 HTML: {html_path}")
    
    # CSS стили (inline + external)
    styles = await page.evaluate("""
        () => {
            const styles = [];
            // Inline стили
            document.querySelectorAll('style').forEach(s => {
                styles.push({type: 'inline', content: s.textContent});
            });
            // Ссылки на внешние стили
            document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
                styles.push({type: 'external', href: l.href});
            });
            return styles;
        }
    """)
    
    styles_path = HTML_DIR / f"{name}_{timestamp}_styles.json"
    styles_path.write_text(json.dumps(styles, indent=2, ensure_ascii=False), encoding="utf-8")
    
    return {
        "name": name,
        "screenshot": str(screenshot_path),
        "html": str(html_path),
        "styles": str(styles_path)
    }


async def analyze_components(page) -> dict:
    """Анализируем компоненты на странице"""
    analysis = await page.evaluate("""
        () => {
            const components = {
                buttons: [],
                forms: [],
                tables: [],
                modals: [],
                navigation: [],
                cards: [],
                inputs: []
            };
            
            // Кнопки
            document.querySelectorAll('button, [role="button"], .btn, [class*="button"]').forEach(el => {
                components.buttons.push({
                    text: el.textContent?.trim().slice(0, 50),
                    classes: el.className,
                    tag: el.tagName
                });
            });
            
            // Формы
            document.querySelectorAll('form').forEach(el => {
                const inputs = el.querySelectorAll('input, select, textarea');
                components.forms.push({
                    inputs: inputs.length,
                    action: el.action,
                    method: el.method
                });
            });
            
            // Таблицы
            document.querySelectorAll('table, [role="table"], [class*="table"]').forEach(el => {
                const rows = el.querySelectorAll('tr, [role="row"]');
                components.tables.push({
                    rows: rows.length,
                    classes: el.className
                });
            });
            
            // Навигация
            document.querySelectorAll('nav, [role="navigation"], [class*="sidebar"], [class*="menu"]').forEach(el => {
                const links = el.querySelectorAll('a');
                components.navigation.push({
                    links: links.length,
                    classes: el.className
                });
            });
            
            // Инпуты
            document.querySelectorAll('input, select, textarea').forEach(el => {
                components.inputs.push({
                    type: el.type || el.tagName.toLowerCase(),
                    name: el.name,
                    placeholder: el.placeholder,
                    classes: el.className
                });
            });
            
            return components;
        }
    """)
    
    return analysis


async def scan_dashboard(page):
    """Сканируем все разделы дашборда"""
    pages_scanned = []
    
    # Ждём загрузку дашборда
    await page.wait_for_load_state("networkidle")
    
    # Сохраняем главную страницу дашборда
    print("\n🔍 Сканирую главную страницу дашборда...")
    result = await save_page(page, "dashboard_main")
    result["components"] = await analyze_components(page)
    pages_scanned.append(result)
    
    # Ищем навигацию / меню
    nav_items = await page.evaluate("""
        () => {
            const items = [];
            // Ищем ссылки в сайдбаре/навигации
            document.querySelectorAll('nav a, [class*="sidebar"] a, [class*="menu"] a, [role="navigation"] a').forEach(a => {
                if (a.href && !a.href.includes('javascript:')) {
                    items.push({
                        text: a.textContent?.trim(),
                        href: a.href
                    });
                }
            });
            return items;
        }
    """)
    
    print(f"\n📋 Найдено {len(nav_items)} разделов в меню")
    
    # Уникальные ссылки
    visited = set()
    visited.add(page.url)
    
    for item in nav_items[:20]:  # Лимит на 20 страниц
        href = item.get("href", "")
        if href in visited or not href.startswith("http"):
            continue
        
        visited.add(href)
        name = item.get("text", "unknown").replace(" ", "_").lower()[:30]
        
        try:
            print(f"\n🔍 Сканирую: {item.get('text', href)}")
            await page.goto(href, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(1)  # Небольшая пауза
            
            result = await save_page(page, f"section_{name}")
            result["components"] = await analyze_components(page)
            result["url"] = href
            pages_scanned.append(result)
            
        except Exception as e:
            print(f"⚠️ Ошибка при сканировании {href}: {e}")
    
    return pages_scanned


async def generate_report(pages_scanned: list):
    """Генерируем отчёт по архитектуре"""
    report = {
        "scanned_at": datetime.now().isoformat(),
        "total_pages": len(pages_scanned),
        "pages": pages_scanned,
        "summary": {
            "all_buttons": [],
            "all_forms": [],
            "all_inputs": [],
            "navigation_structure": []
        }
    }
    
    # Собираем общую статистику
    for p in pages_scanned:
        components = p.get("components", {})
        report["summary"]["all_buttons"].extend(components.get("buttons", []))
        report["summary"]["all_forms"].extend(components.get("forms", []))
        report["summary"]["all_inputs"].extend(components.get("inputs", []))
    
    # Сохраняем отчёт
    report_path = ANALYSIS_DIR / "architecture_report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n📊 Отчёт сохранён: {report_path}")
    
    # Генерируем markdown summary
    md_report = f"""# Fresha Architecture Report
    
Generated: {report['scanned_at']}
Total pages scanned: {report['total_pages']}

## Pages

"""
    for p in pages_scanned:
        md_report += f"### {p['name']}\n"
        md_report += f"- Screenshot: `{p['screenshot']}`\n"
        md_report += f"- HTML: `{p['html']}`\n"
        if "url" in p:
            md_report += f"- URL: {p['url']}\n"
        md_report += "\n"
    
    md_path = ANALYSIS_DIR / "ARCHITECTURE.md"
    md_path.write_text(md_report, encoding="utf-8")
    print(f"📝 Markdown отчёт: {md_path}")
    
    return report


async def main():
    print("🦊 Fresha Scanner — запуск Camoufox...")
    
    await setup_dirs()
    
    async with AsyncCamoufox(headless=False) as browser:
        page = await browser.new_page()
        
        # Открываем Fresha
        print("\n🌐 Открываю fresha.com...")
        await page.goto("https://www.fresha.com/for-business", wait_until="networkidle")
        
        print("\n" + "="*50)
        print("👆 ЗАЛОГИНЬСЯ В СВОЙ АККАУНТ")
        print("Когда будешь в личном кабинете — нажми Enter здесь")
        print("="*50)
        
        input("\n⏎ Нажми Enter когда готов к сканированию...")
        
        print("\n🚀 Начинаю сканирование...")
        pages_scanned = await scan_dashboard(page)
        
        print("\n📊 Генерирую отчёт...")
        report = await generate_report(pages_scanned)
        
        print("\n" + "="*50)
        print(f"✅ ГОТОВО! Просканировано страниц: {len(pages_scanned)}")
        print(f"📁 Результаты в: {OUTPUT_DIR}")
        print("="*50)
        
        input("\n⏎ Нажми Enter чтобы закрыть браузер...")


if __name__ == "__main__":
    asyncio.run(main())
