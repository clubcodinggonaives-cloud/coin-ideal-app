// Phase 4 responsive QA — real Playwright screenshots + automated
// horizontal-overflow detection at the 9 required breakpoints, against the
// local dev server (http://localhost:5173) wired to the local validated
// Supabase stack (.env.local), never the remote project.
//
// Usage: node scripts/phase4-responsive-qa.mjs
import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = "http://localhost:5173"
const OUT_DIR = process.env.QA_OUT_DIR || "./phase4-screenshots"
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

const PUBLIC_PAGES = [
  { name: "services", path: "/services" },
  { name: "tarifs", path: "/tarifs" },
  { name: "commander", path: "/commander" },
]

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard|\/provider|\/admin/, { timeout: 15000 })
}

async function checkOverflowAndShoot(page, viewport, pageName) {
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth
    const winWidth = window.innerWidth
    const bodyWidth = document.body.scrollWidth
    return {
      docScrollWidth: docWidth,
      windowInnerWidth: winWidth,
      bodyScrollWidth: bodyWidth,
      hasOverflow: docWidth > winWidth + 1 || bodyWidth > winWidth + 1, // +1px tolerance for subpixel rounding
    }
  })
  const filePath = path.join(OUT_DIR, `${pageName}_${viewport.name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return { ...overflow, screenshot: filePath }
}

async function run() {
  const browser = await chromium.launch()
  const results = []

  // --- Public pages, no auth ---
  const publicContext = await browser.newContext()
  const publicPage = await publicContext.newPage()
  for (const viewport of VIEWPORTS) {
    await publicPage.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const p of PUBLIC_PAGES) {
      await publicPage.goto(`${BASE_URL}${p.path}`, { waitUntil: "networkidle", timeout: 20000 })
      await publicPage.waitForTimeout(300) // let async data settle
      const result = await checkOverflowAndShoot(publicPage, viewport, p.name)
      results.push({ page: p.path, viewport: viewport.name, ...result })
      console.log(`[${p.path}] ${viewport.name}: overflow=${result.hasOverflow} (doc=${result.docScrollWidth}px, win=${result.windowInnerWidth}px)`)
    }
  }
  await publicContext.close()

  // --- Authenticated pages ---
  const clientContext = await browser.newContext()
  const clientPage = await clientContext.newPage()
  await login(clientPage, "client-a@coin-ideal.test", "TestPass123!")
  for (const viewport of VIEWPORTS) {
    await clientPage.setViewportSize({ width: viewport.width, height: viewport.height })
    await clientPage.goto(`${BASE_URL}/dashboard/orders`, { waitUntil: "networkidle", timeout: 20000 })
    await clientPage.waitForTimeout(300)
    const result = await checkOverflowAndShoot(clientPage, viewport, "dashboard-orders")
    results.push({ page: "/dashboard/orders", viewport: viewport.name, ...result })
    console.log(`[/dashboard/orders] ${viewport.name}: overflow=${result.hasOverflow}`)
  }
  await clientContext.close()

  const providerContext = await browser.newContext()
  const providerPage = await providerContext.newPage()
  await login(providerPage, "dev-coin-ideal@example.test", "coin-ideal-dev-2026")
  for (const viewport of VIEWPORTS) {
    await providerPage.setViewportSize({ width: viewport.width, height: viewport.height })
    await providerPage.goto(`${BASE_URL}/provider/orders`, { waitUntil: "networkidle", timeout: 20000 })
    await providerPage.waitForTimeout(300)
    const result = await checkOverflowAndShoot(providerPage, viewport, "provider-orders")
    results.push({ page: "/provider/orders", viewport: viewport.name, ...result })
    console.log(`[/provider/orders] ${viewport.name}: overflow=${result.hasOverflow}`)
  }
  await providerContext.close()

  await browser.close()

  fs.writeFileSync(path.join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2))

  const failures = results.filter((r) => r.hasOverflow)
  console.log(`\n=== ${results.length} checks, ${failures.length} overflow failures ===`)
  if (failures.length > 0) {
    console.log(JSON.stringify(failures, null, 2))
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
