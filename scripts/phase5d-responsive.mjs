import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = "https://coin-ideal-app.vercel.app"
const OUT_DIR = process.env.QA_OUT_DIR || "./phase5d-screenshots"
fs.mkdirSync(OUT_DIR, { recursive: true })

const VIEWPORTS = [
  { name: "320x800", width: 320, height: 800 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "820x1180", width: 820, height: 1180 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1440x900", width: 1440, height: 900 },
]

const PAGES = ["/", "/services", "/commander", "/contact"]

const browser = await chromium.launch()
const page = await browser.newPage()
const results = []

for (const viewport of VIEWPORTS) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  for (const p of PAGES) {
    await page.goto(`${BASE_URL}${p}`, { waitUntil: "networkidle", timeout: 30000 })
    await page.waitForTimeout(300)
    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth
      const winWidth = window.innerWidth
      return { docWidth, winWidth, hasOverflow: docWidth > winWidth + 1 }
    })
    const name = p === "/" ? "home" : p.replace(/\//g, "")
    await page.screenshot({ path: path.join(OUT_DIR, `${name}_${viewport.name}.png`), fullPage: true })
    results.push({ page: p, viewport: viewport.name, ...overflow })
    console.log(`[${p}] ${viewport.name}: overflow=${overflow.hasOverflow} (doc=${overflow.docWidth} win=${overflow.winWidth})`)
  }
}

await browser.close()
fs.writeFileSync(path.join(OUT_DIR, "responsive-results.json"), JSON.stringify(results, null, 2))
const failures = results.filter((r) => r.hasOverflow)
console.log(`\n=== ${results.length} checks, ${failures.length} overflow failures ===`)
