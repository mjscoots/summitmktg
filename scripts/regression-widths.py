#!/usr/bin/env python3
"""Standing layout regression: every route at every supported width.

Run:  python3 scripts/regression-widths.py [--widths 390,768,1280] [--out /tmp/browser/regression]

Checks each route for horizontal overflow (document scrollWidth wider than the
viewport), names the widest offending elements, captures a screenshot, and
prints a table. Authenticates with the sandbox-injected Lovable preview session
when present so app routes render signed in.

Widths cover: iPhone (390), iPad mini/portrait (768, 820, 834), iPad landscape
(1024, 1180) and desktop (1280). Keep this list in sync with any new
breakpoints the app introduces.
"""
import argparse
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

WIDTHS = [390, 768, 820, 834, 1024, 1180, 1280]

PUBLIC_ROUTES = [
    ("landing", "/"),
    ("recruiting", "/recruiting"),
    ("industries-pest", "/industries/pest"),
    ("industries-fiber", "/industries/fiber"),
    ("industries-life", "/industries/life"),
    ("apply-rookie", "/apply/rookie"),
    ("apply-vet", "/apply/veteran"),
    ("parents", "/parents"),
    ("ticket", "/ticket"),
    ("login", "/login"),
]

APP_ROUTES = [
    ("home", "/app"),
    ("industries", "/app/industries"),
    ("money", "/app/money"),
    ("team", "/app/team"),
    ("roster-sweep", "/app/roster/sweep"),
    ("recruits", "/app/recruits"),
    ("ask", "/app/ask"),
    ("profile", "/app/profile"),
    ("admin-money", "/app/admin?tab=money"),
    ("chat", "/app/chat"),
    ("leads", "/app/leads"),
    ("events", "/app/events"),
    ("training", "/app/training"),
    ("command", "/command"),
]

OVERFLOW_JS = """
() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  const offenders = [];
  if (de.scrollWidth > vw + 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' && cs.visibility === 'hidden') continue;
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 110),
          right: Math.round(r.right),
          left: Math.round(r.left),
          w: Math.round(r.width),
        });
      }
    }
  }
  offenders.sort((a, b) => b.right - a.right);
  return { scrollWidth: de.scrollWidth, vw, offenders: offenders.slice(0, 6) };
}
"""


async def restore_session(context, page):
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = "http://localhost:8080"
        await context.add_cookies(cookies)
    await page.goto("http://localhost:8080", wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)
    key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if key and session:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(session)})"
        )
        return True
    return False


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--widths", default=",".join(str(w) for w in WIDTHS))
    ap.add_argument("--out", default="/tmp/browser/regression")
    ap.add_argument("--base", default="http://localhost:8080")
    ap.add_argument("--only", default="", help="substring filter on route name")
    args = ap.parse_args()

    widths = [int(w) for w in args.widths.split(",") if w.strip()]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    failures = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for width in widths:
            context = await browser.new_context(viewport={"width": width, "height": 1400})
            page = await context.new_page()
            signed_in = await restore_session(context, page)
            routes = PUBLIC_ROUTES + (APP_ROUTES if signed_in else [])
            for name, path in routes:
                if args.only and args.only not in name:
                    continue
                try:
                    await page.goto(args.base + path, wait_until="domcontentloaded")
                    await page.wait_for_timeout(3500)
                    res = await page.evaluate(OVERFLOW_JS)
                except Exception as exc:  # noqa: BLE001
                    print(f"{width:>5} {name:<18} ERROR {exc}")
                    continue
                bad = res["scrollWidth"] > res["vw"] + 1
                await page.screenshot(path=str(out / f"{width}-{name}.png"))
                flag = "OVERFLOW" if bad else "ok"
                print(f"{width:>5} {name:<18} {flag:<9} scrollWidth={res['scrollWidth']}")
                if bad:
                    failures.append((width, name, res["offenders"]))
                    for o in res["offenders"]:
                        print(f"        {o['tag']}.{o['cls']} right={o['right']} w={o['w']}")
            await context.close()
        await browser.close()

    print(f"\n{len(failures)} overflowing route/width combinations")
    print(f"screenshots: {out}")


asyncio.run(main())
