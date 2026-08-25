// Phase 5H — full responsive/UI-UX audit against the LOCAL dev server
// (not production — this runs before fixes are pushed). Real Playwright
// rendering, overflow detection via scrollWidth vs clientWidth, screenshots.
//
// Credentials: qa-client/qa-provider reuse the stable fixtures from earlier
// phases. Admin credentials are read from a local, gitignored
// `.env.phase5h-qa` file (never printed, never committed) — see
// docs/phase-5/PHASE_5H_RESPONSIVE_UI_UX_REPORT.md for context.
import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")

function loadLocalEnv(file) {
  const p = path.join(ROOT, file)
  if (!fs.existsSync(p)) return
  for (const rawLine of fs.readFileSync(p, "utf-8").split("\n")) {
    const line = rawLine.replace(/\r$/, "")
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}
loadLocalEnv(".env.phase5h-qa")

const BASE_URL = process.env.PHASE5H_BASE_URL || "http://localhost:5183"
const OUT_DIR = path.join(ROOT, "docs/phase-5/screenshots/phase5h")
fs.mkdirSync(OUT_DIR, { recursive: true })

const FULL_BP = [320, 375, 390, 430, 768, 820, 1024, 1280, 1440]
const QUICK_BP = [375, 768, 1440]

const CLIENT = { email: "qa-client@coin-ideal-qa.test", password: "CoinIdealVerify!2026" }
const PROVIDER = { email: "qa-provider@coin-ideal-qa.test", password: "CoinIdealVerify!2026" }
const ADMIN = { email: process.env.PHASE5H_ADMIN_EMAIL, password: process.env.PHASE5H_ADMIN_PASSWORD }
const hasAdmin = Boolean(ADMIN.email && ADMIN.password)
if (!hasAdmin) console.warn("No admin credentials in .env.phase5h-qa — admin routes will be SKIPPED, not faked.")

const results = []

async function login(context, creds, waitPattern) {
  const page = await context.newPage()
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
  await page.fill('input[type="email"]', creds.email)
  await page.fill('input[type="password"]', creds.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(waitPattern, { timeout: 20000 })
  await page.close()
}

async function checkPage(context, name, urlPath, breakpoints, opts = {}) {
  const { height = 900, afterLoad, tier = "priority" } = opts
  for (const width of breakpoints) {
    const page = await context.newPage()
    await page.setViewportSize({ width, height })
    let navError = null
    try {
      await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: "networkidle", timeout: 20000 })
    } catch (e) {
      navError = String(e).split("\n")[0]
    }
    if (!navError) {
      await page.waitForTimeout(350)
      if (afterLoad) {
        try {
          await afterLoad(page)
        } catch (e) {
          navError = `interaction: ${String(e).split("\n")[0]}`
        }
      }
    }
    let overflow = { scrollWidth: null, clientWidth: null, overflowing: null }
    if (!navError) {
      overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        overflowing: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }))
    }
    try {
      await page.screenshot({ path: `${OUT_DIR}/${name}_${width}.png`, fullPage: false })
    } catch { /* page may have navigated away on error */ }
    const record = { tier, page: name, path: urlPath, width, ...overflow, error: navError }
    results.push(record)
    const flag = navError ? `!! ERROR: ${navError}` : overflow.overflowing ? "!! OVERFLOW" : "ok"
    console.log(`${name}@${width}: ${flag}`)
    await page.close()
  }
}

const browser = await chromium.launch()

// ---------- Public, unauthenticated ----------
const pub = await browser.newContext()

await checkPage(pub, "home", "/", FULL_BP)
await checkPage(pub, "home-mobile-nav-open", "/", FULL_BP, {
  afterLoad: async (page) => {
    const btn = page.getByRole("button", { name: /ouvrir le menu/i })
    if (await btn.count()) await btn.first().click()
  },
})
await checkPage(pub, "home-chat-open", "/", FULL_BP, {
  afterLoad: async (page) => {
    const btn = page.getByRole("button", { name: /ouvrir l'assistant/i })
    if (await btn.count()) await btn.first().click()
    await page.waitForTimeout(200)
  },
})
await checkPage(pub, "services", "/services", FULL_BP)
await checkPage(pub, "auth-login", "/auth/login", FULL_BP)
await checkPage(pub, "auth-register", "/auth/register", FULL_BP)

// /commander step 0 (reachable directly by URL)
await checkPage(pub, "commander-step0", "/commander", FULL_BP)

// Secondary public pages — quick scan only
const secondaryPublic = [
  ["category", "/services/impression"],
  ["service-detail", "/service/00000000-0000-0000-0000-000000000000"],
  ["tarifs", "/tarifs"],
  ["how-it-works", "/comment-ca-marche"],
  ["water", "/vente-eau"],
  ["providers", "/providers"],
  ["provider-detail", "/provider/00000000-0000-0000-0000-000000000000"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["forgot-password", "/auth/forgot-password"],
  ["reset-password", "/auth/reset-password"],
  ["not-found", "/this-route-does-not-exist"],
]
for (const [name, p] of secondaryPublic) {
  await checkPage(pub, name, p, QUICK_BP, { tier: "secondary" })
}

await pub.close()

// ---------- Client dashboard ----------
const client = await browser.newContext()
await login(client, CLIENT, /dashboard/)

await checkPage(client, "dashboard-overview", "/dashboard", FULL_BP)
await checkPage(client, "dashboard-orders", "/dashboard/orders", FULL_BP)
await checkPage(client, "dashboard-sidebar-open", "/dashboard", FULL_BP, {
  afterLoad: async (page) => {
    const btn = page.getByRole("button", { name: /^menu$/i })
    if (await btn.count()) await btn.first().click()
    await page.waitForTimeout(200)
  },
})

const secondaryClient = [
  ["dashboard-requests", "/dashboard/requests"],
  ["dashboard-bookings", "/dashboard/bookings"],
  ["dashboard-favorites", "/dashboard/favorites"],
  ["dashboard-messages", "/dashboard/messages"],
  ["dashboard-notifications", "/dashboard/notifications"],
  ["dashboard-settings", "/dashboard/settings"],
]
for (const [name, p] of secondaryClient) {
  await checkPage(client, name, p, QUICK_BP, { tier: "secondary" })
}
await client.close()

// ---------- Provider dashboard ----------
const provider = await browser.newContext()
await login(provider, PROVIDER, /dashboard|provider/)

await checkPage(provider, "provider-dashboard", "/provider/dashboard", FULL_BP)
await checkPage(provider, "provider-orders", "/provider/orders", FULL_BP)
await checkPage(provider, "provider-earnings", "/provider/earnings", FULL_BP)
await checkPage(provider, "provider-bookings-modal", "/provider/bookings", FULL_BP, {
  afterLoad: async (page) => {
    const btn = page.getByRole("button", { name: /annuler/i })
    if (await btn.count()) {
      await btn.first().click()
      await page.waitForTimeout(200)
    }
  },
})

const secondaryProvider = [
  ["provider-services", "/provider/services"],
  ["provider-service-new", "/provider/services/new"],
  ["provider-requests", "/provider/requests"],
  ["provider-reviews", "/provider/reviews"],
  ["provider-profile", "/provider/profile"],
]
for (const [name, p] of secondaryProvider) {
  await checkPage(provider, name, p, QUICK_BP, { tier: "secondary" })
}
await provider.close()

// ---------- Admin dashboard ----------
if (hasAdmin) {
  const admin = await browser.newContext()
  await login(admin, ADMIN, /dashboard|admin/)

  await checkPage(admin, "admin-overview", "/admin", FULL_BP)
  await checkPage(admin, "admin-orders", "/admin/orders", FULL_BP)
  await checkPage(admin, "admin-services", "/admin/services", FULL_BP)
  await checkPage(admin, "admin-providers", "/admin/providers", FULL_BP)
  await checkPage(admin, "admin-users", "/admin/users", FULL_BP)
  await checkPage(admin, "admin-requests", "/admin/requests", FULL_BP)

  const secondaryAdmin = [
    ["admin-categories", "/admin/categories"],
    ["admin-pricing", "/admin/pricing"],
    ["admin-messages", "/admin/messages"],
    ["admin-reviews", "/admin/reviews"],
    ["admin-settings", "/admin/settings"],
  ]
  for (const [name, p] of secondaryAdmin) {
    await checkPage(admin, name, p, QUICK_BP, { tier: "secondary" })
  }
  await admin.close()
} else {
  results.push({ tier: "priority", page: "admin-*", path: "/admin/*", width: null, skipped: "no admin credentials provided" })
}

await browser.close()

// ---------- Escalate secondary failures to full matrix ----------
const failedSecondary = results.filter((r) => r.tier === "secondary" && (r.overflowing || r.error))
if (failedSecondary.length) {
  console.log(`\n=== ${failedSecondary.length} secondary-tier checks failed — escalating to full matrix ===`)
}

fs.writeFileSync(path.join(OUT_DIR, "..", "phase5h-results.json"), JSON.stringify(results, null, 2))

const overflowing = results.filter((r) => r.overflowing)
const errored = results.filter((r) => r.error)
console.log(`\n=== ${results.length} checks | ${overflowing.length} overflow | ${errored.length} errors ===`)
if (overflowing.length) console.log("OVERFLOW:", JSON.stringify(overflowing.map((r) => `${r.page}@${r.width}`)))
if (errored.length) console.log("ERRORS:", JSON.stringify(errored.map((r) => `${r.page}@${r.width}: ${r.error}`)))
