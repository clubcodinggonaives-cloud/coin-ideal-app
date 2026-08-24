// Phase 5G — real WCAG scan (axe-core) + keyboard navigation test against
// the live Vercel deployment.
import { chromium } from "playwright"
import fs from "node:fs"

const BASE_URL = "https://coin-ideal-app.vercel.app"
const AXE_SOURCE = fs.readFileSync("./node_modules/axe-core/axe.min.js", "utf8")
const OUT_DIR = "./phase5g-out"
fs.mkdirSync(OUT_DIR, { recursive: true })

const PAGES = ["/", "/services", "/tarifs", "/commander", "/contact", "/auth/login", "/auth/register"]

const browser = await chromium.launch()
const allResults = []

for (const path of PAGES) {
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" })
  await page.addScriptTag({ content: AXE_SOURCE })
  const axeResults = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } })
  })
  const violations = axeResults.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    nodeCount: v.nodes.length,
    sample: v.nodes[0]?.html?.slice(0, 150),
  }))
  allResults.push({ path, violationCount: violations.length, violations })
  console.log(`\n=== ${path} — ${violations.length} violations ===`)
  for (const v of violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodeCount} node(s)) e.g. ${v.sample}`)
  await page.close()
}

fs.writeFileSync(`${OUT_DIR}/a11y-results.json`, JSON.stringify(allResults, null, 2))

// Keyboard navigation test on the login page
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
  const tabStops = []
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab")
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return null
      const style = getComputedStyle(el)
      return {
        tag: el.tagName,
        type: el.getAttribute("type"),
        text: el.textContent?.trim().slice(0, 30) || el.getAttribute("aria-label") || el.getAttribute("placeholder"),
        hasVisibleFocus: style.outlineStyle !== "none" || style.boxShadow !== "none",
      }
    })
    tabStops.push(info)
  }
  console.log("\n=== Keyboard tab order on /auth/login (first 10 stops) ===")
  console.log(JSON.stringify(tabStops, null, 2))
  fs.writeFileSync(`${OUT_DIR}/a11y-keyboard-nav.json`, JSON.stringify(tabStops, null, 2))
  await page.close()
}

await browser.close()

const totalViolations = allResults.reduce((s, r) => s + r.violationCount, 0)
console.log(`\n\n=== TOTAL: ${totalViolations} WCAG 2 A/AA violations across ${PAGES.length} pages ===`)
