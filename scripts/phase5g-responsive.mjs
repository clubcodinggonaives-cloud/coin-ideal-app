// Phase 5G — real responsive screenshots + overflow detection against the
// live Vercel deployment, at every breakpoint the brief named.
import { chromium } from "playwright"
import fs from "node:fs"

const BASE_URL = "https://coin-ideal-app.vercel.app"
const OUT_DIR = "./phase5g-out/responsive"
fs.mkdirSync(OUT_DIR, { recursive: true })

const BREAKPOINTS = [320, 375, 390, 430, 768, 820, 1024, 1280, 1440]
const PUBLIC_PAGES = [
  { name: "home", path: "/" },
  { name: "services", path: "/services" },
  { name: "commander", path: "/commander" },
  { name: "contact", path: "/contact" },
]

const CLIENT = { email: "qa-client@coin-ideal-qa.test", password: "CoinIdealVerify!2026" }
const PROVIDER = { email: "qa-provider@coin-ideal-qa.test", password: "CoinIdealVerify!2026" }

const results = []
const browser = await chromium.launch()

async function checkPage(context, name, path, height = 900) {
  for (const width of BREAKPOINTS) {
    const page = await context.newPage()
    await page.setViewportSize({ width, height })
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(400)

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflowing: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }))

    await page.screenshot({ path: `${OUT_DIR}/${name}_${width}.png`, fullPage: false })
    results.push({ page: name, path, width, ...overflow })
    console.log(`${name}@${width}: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth} ${overflow.overflowing ? "!! OVERFLOW" : "ok"}`)
    await page.close()
  }
}

// Public pages, no auth needed
const publicCtx = await browser.newContext()
for (const { name, path } of PUBLIC_PAGES) {
  await checkPage(publicCtx, name, path)
}
await publicCtx.close()

// Client dashboard (sidebar pattern)
const clientCtx = await browser.newContext()
{
  const loginPage = await clientCtx.newPage()
  await loginPage.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
  await loginPage.fill('input[type="email"]', CLIENT.email)
  await loginPage.fill('input[type="password"]', CLIENT.password)
  await loginPage.click('button[type="submit"]')
  await loginPage.waitForURL(/dashboard/, { timeout: 15000 })
  await loginPage.close()
}
await checkPage(clientCtx, "dashboard-orders", "/dashboard/orders")
await clientCtx.close()

// Provider dashboard (sidebar + table pattern)
const providerCtx = await browser.newContext()
{
  const loginPage = await providerCtx.newPage()
  await loginPage.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
  await loginPage.fill('input[type="email"]', PROVIDER.email)
  await loginPage.fill('input[type="password"]', PROVIDER.password)
  await loginPage.click('button[type="submit"]')
  await loginPage.waitForURL(/dashboard|provider/, { timeout: 15000 })
  await loginPage.close()
}
await checkPage(providerCtx, "provider-orders", "/provider/orders")
await providerCtx.close()

await browser.close()

fs.writeFileSync(`${OUT_DIR}/../responsive-results.json`, JSON.stringify(results, null, 2))
const overflowing = results.filter((r) => r.overflowing)
console.log(`\n=== ${results.length} checks, ${overflowing.length} with horizontal overflow ===`)
if (overflowing.length) console.log(JSON.stringify(overflowing, null, 2))
