#!/usr/bin/env python3
"""
Fresha.com Scanner — простая версия
Шаг 1: Просто открываем браузер
Шаг 2: Юзер логинится
Шаг 3: Сканируем страницы
"""

import asyncio
import json
import os
import re
import random
from datetime import datetime
from pathlib import Path

from camoufox.async_api import AsyncCamoufox

# Папка для результатов
OUTPUT_DIR = Path(__file__).parent / "output"
PAGES_DIR = OUTPUT_DIR / "pages"
API_DIR = OUTPUT_DIR / "api"
ANALYSIS_DIR = OUTPUT_DIR / "analysis"


def setup_dirs():
    """Создаём папки"""
    for d in [OUTPUT_DIR, PAGES_DIR, API_DIR, ANALYSIS_DIR]:
        d.mkdir(parents=True, exist_ok=True)


async def save_page(page, name: str):
    """Сохраняем страницу"""
    safe_name = re.sub(r'[^\w\-]', '_', name)[:50]
    page_dir = PAGES_DIR / safe_name
    page_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"  📸 Скриншот...")
    await page.screenshot(path=str(page_dir / "screenshot.png"), full_page=True)
    
    print(f"  📄 HTML...")
    html = await page.content()
    (page_dir / "page.html").write_text(html, encoding="utf-8")
    
    print(f"  📝 URL: {page.url}")
    meta = {"name": name, "url": page.url, "saved_at": datetime.now().isoformat()}
    (page_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    
    return {"name": name, "url": page.url, "folder": str(page_dir)}


async def get_nav_links(page):
    """Находим ссылки в навигации"""
    links = await page.evaluate("""
        () => {
            const items = [];
            const seen = new Set();
            document.querySelectorAll('nav a, [class*="sidebar"] a, [class*="menu"] a, [role="navigation"] a, aside a').forEach(a => {
                if (a.href && !seen.has(a.href) && a.href.startsWith('http')) {
                    seen.add(a.href);
                    items.push({
                        text: a.textContent?.trim().slice(0, 50) || 'unknown',
                        href: a.href
                    });
                }
            });
            return items;
        }
    """)
    return links


async def main():
    print("🦊 Fresha Scanner — запуск")
    print("=" * 50)
    
    setup_dirs()
    
    # Минимальные настройки — только headless=False
    print("\n🌐 Запускаю браузер...")
    
    async with AsyncCamoufox(headless=False) as browser:
        page = await browser.new_page()
        
        # Открываем Google
        print("📍 Открываю Google...")
        await page.goto("https://www.google.com/")
        
        print("\n" + "=" * 50)
        print("👆 ТВОЙ ХОД:")
        print("1. Перейди на Fresha и залогинься")
        print("2. Дойди до дашборда")
        print("3. Нажми Enter здесь")
        print("=" * 50)
        
        input("\n⏎ Enter когда готов...")
        
        # Сохраняем текущую страницу (дашборд)
        pages_saved = []
        print("\n🔍 Сканирую текущую страницу...")
        result = await save_page(page, "dashboard")
        pages_saved.append(result)
        
        # Ищем навигацию
        print("\n📋 Ищу ссылки в меню...")
        nav_links = await get_nav_links(page)
        print(f"   Найдено: {len(nav_links)} ссылок")
        
        # Фильтруем только Fresha
        fresha_links = [l for l in nav_links if "fresha.com" in l["href"]]
        print(f"   Fresha ссылок: {len(fresha_links)}")
        
        # Показываем что нашли
        for i, link in enumerate(fresha_links[:10]):
            print(f"   {i+1}. {link['text']}")
        
        # Спрашиваем продолжать ли
        print("\n" + "=" * 50)
        cont = input("Сканировать эти страницы? (y/n): ").strip().lower()
        
        if cont == 'y':
            visited = {page.url}
            
            for link in fresha_links[:20]:
                href = link["href"]
                if href in visited:
                    continue
                visited.add(href)
                
                name = link["text"] or "page"
                print(f"\n🔍 Сканирую: {name}")
                
                # Случайная пауза
                delay = random.uniform(2, 4)
                print(f"   ⏳ Пауза {delay:.1f} сек...")
                await asyncio.sleep(delay)
                
                try:
                    await page.goto(href, timeout=30000)
                    await asyncio.sleep(2)  # Даём загрузиться
                    result = await save_page(page, name)
                    pages_saved.append(result)
                except Exception as e:
                    print(f"   ⚠️ Ошибка: {e}")
        
        # Сохраняем отчёт
        report = {
            "scanned_at": datetime.now().isoformat(),
            "pages": pages_saved,
            "total": len(pages_saved)
        }
        report_path = ANALYSIS_DIR / "report.json"
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        
        print("\n" + "=" * 50)
        print(f"✅ ГОТОВО!")
        print(f"   Сохранено страниц: {len(pages_saved)}")
        print(f"   Результаты: {OUTPUT_DIR}")
        print("=" * 50)
        
        input("\n⏎ Enter чтобы закрыть браузер...")


if __name__ == "__main__":
    asyncio.run(main())
