// Phase 4 E2E — real Playwright browser automation driving the actual app
// against the local Supabase stack. Not a simulation: every step below is a
// real click/fill/navigation, and every assertion reads real rendered DOM.
//
// Usage: node scripts/phase4-e2e.mjs
import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = "http://localhost:5173"
const OUT_DIR = process.env.QA_OUT_DIR || "./phase4-screenshots"
fs.mkdirSync(OUT_DIR, { recursive: true })

const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args)
const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  log(pass ? "PASS" : "FAIL", "-", name, detail ? `(${detail})` : "")
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard|\/provider|\/admin/, { timeout: 15000 })
}

async function run() {
  const browser = await chromium.launch()

  // A temp file to upload as the order document.
  const testFilePath = path.join(OUT_DIR, "test-document.pdf")
  fs.writeFileSync(testFilePath, "%PDF-1.4 fake test content for E2E upload")

  // =========================================================================
  // 1. Client A: services -> tarifs -> commander -> upload -> options ->
  //    pickup -> confirmation -> order created
  // =========================================================================
  const clientACtx = await browser.newContext()
  const clientA = await clientACtx.newPage()

  await clientA.goto(`${BASE_URL}/services`, { waitUntil: "networkidle" })
  const hasServices = (await clientA.locator("text=/Impression|Copie/i").count()) > 0
  record("client sees /services catalogue", hasServices)

  await clientA.goto(`${BASE_URL}/tarifs`, { waitUntil: "networkidle" })
  const hasPricing = (await clientA.locator("text=/HTG/i").count()) > 0
  record("client sees /tarifs with live prices", hasPricing)

  await login(clientA, "client-a@coin-ideal.test", "TestPass123!")
  record("client A login", true)

  await clientA.goto(`${BASE_URL}/commander`, { waitUntil: "networkidle" })
  await clientA.setInputFiles('input[type="file"]', testFilePath)
  await clientA.click("text=Continuer")

  // Step 2: options — pick the first service in the select, set pages/copies
  await clientA.waitForSelector("select")
  await clientA.selectOption("select", { index: 1 })
  const pageInputs = clientA.locator('input[type="number"]')
  await pageInputs.nth(0).fill("3")
  await pageInputs.nth(1).fill("2")
  await clientA.click("text=Continuer")

  // Step 3: reception — leave pickup (default), continue
  await clientA.click("text=Continuer")

  // Step 4: confirm
  await clientA.screenshot({ path: path.join(OUT_DIR, "e2e_01_order_confirmation_step.png") })
  await clientA.click("text=Confirmer la commande")
  await clientA.waitForSelector("text=Commande envoyée", { timeout: 15000 })
  record("order submitted successfully (create_order RPC)", true)
  await clientA.screenshot({ path: path.join(OUT_DIR, "e2e_02_order_success.png") })

  // 2. Client dashboard shows the new order
  await clientA.click("text=Suivre ma commande")
  await clientA.waitForURL(/\/dashboard\/orders/, { timeout: 10000 })
  await clientA.waitForTimeout(500)
  const orderCardText = await clientA.locator("text=/En attente/i").first().isVisible().catch(() => false)
  record("client dashboard shows new order as 'En attente'", orderCardText)
  await clientA.screenshot({ path: path.join(OUT_DIR, "e2e_03_dashboard_orders.png"), fullPage: true })

  // =========================================================================
  // 2. Security: Client B must NOT see Client A's order
  // =========================================================================
  const clientBCtx = await browser.newContext()
  const clientB = await clientBCtx.newPage()
  await login(clientB, "client-b@coin-ideal.test", "TestPass123!")
  await clientB.goto(`${BASE_URL}/dashboard/orders`, { waitUntil: "networkidle" })
  await clientB.waitForTimeout(500)
  const clientBSeesOrder = (await clientB.locator("text=/En attente|Confirmée/i").count()) > 0
  record("Client B does NOT see Client A's order", !clientBSeesOrder)

  // Client B tries to reach /admin/orders directly -> must be redirected away
  await clientB.goto(`${BASE_URL}/admin/orders`, { waitUntil: "networkidle" })
  await clientB.waitForTimeout(500)
  const redirectedFromAdmin = !clientB.url().includes("/admin/orders")
  record("client blocked from /admin/orders (route guard)", redirectedFromAdmin, clientB.url())

  // =========================================================================
  // 3. Provider: sees the order, advances status, records a payment
  // =========================================================================
  const providerCtx = await browser.newContext()
  const provider = await providerCtx.newPage()
  await login(provider, "dev-coin-ideal@example.test", "coin-ideal-dev-2026")
  await provider.goto(`${BASE_URL}/provider/orders`, { waitUntil: "networkidle" })
  await provider.waitForTimeout(500)
  const providerSeesOrder = (await provider.locator("text=/En attente/i").count()) > 0
  record("provider sees the pending order", providerSeesOrder)
  await provider.screenshot({ path: path.join(OUT_DIR, "e2e_04_provider_orders.png"), fullPage: true })

  // Advance status: En attente -> Confirmée
  const advanceBtn = provider.locator('button:has-text("Passer à")').first()
  await advanceBtn.click()
  await provider.waitForTimeout(800)
  const nowConfirmed = (await provider.locator("text=/Confirmée/i").count()) > 0
  record("provider advanced order to 'Confirmée' via update_order_status()", nowConfirmed)

  // Record a payment
  await provider.locator('button:has-text("Enregistrer un paiement")').first().click()
  const modal = provider.locator(".fixed.inset-0")
  await modal.waitFor({ state: "visible" })
  await modal.locator('button:has-text("Enregistrer")').click()
  await modal.waitFor({ state: "hidden", timeout: 10000 })
  record("provider recorded a payment via record_payment()", true)
  await provider.screenshot({ path: path.join(OUT_DIR, "e2e_05_provider_after_actions.png"), fullPage: true })

  // =========================================================================
  // 4. Client A sees the update + a notification
  // =========================================================================
  await clientA.reload({ waitUntil: "networkidle" })
  await clientA.waitForTimeout(500)
  const clientSeesConfirmed = (await clientA.locator("text=/Confirmée/i").count()) > 0
  record("client A sees status update to 'Confirmée' after refresh", clientSeesConfirmed)

  await clientA.goto(`${BASE_URL}/dashboard/notifications`, { waitUntil: "networkidle" })
  await clientA.waitForTimeout(500)
  const hasNotification = (await clientA.locator("text=/Commande reçue|Commande confirmée|Paiement enregistré/i").count()) > 0
  record("client A received order/payment notifications", hasNotification)
  await clientA.screenshot({ path: path.join(OUT_DIR, "e2e_06_notifications.png"), fullPage: true })

  // =========================================================================
  // 5. Security: client cannot tamper with price/status/role directly
  //    (already proven at the DB layer in Phase 3 — re-verified here via
  //    the actual browser's Supabase client, using the real anon key/session)
  // =========================================================================
  const tamperResult = await clientA.evaluate(async () => {
    // Reach into the app's own supabase client instance via a fresh import
    // is not possible from outside the bundle, so this exercises the same
    // REST endpoint the app's client would use, with the same session
    // (cookies/localStorage) already present in this authenticated page.
    const supabaseUrl = "http://127.0.0.1:54321"
    const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    const sessionRaw = Object.keys(localStorage).find((k) => k.includes("auth-token"))
    const session = sessionRaw ? JSON.parse(localStorage.getItem(sessionRaw)) : null
    const accessToken = session?.access_token
    if (!accessToken) return { error: "no session" }

    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${session.user.id}`, {
      method: "PATCH",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ role: "admin" }),
    })
    return { status: res.status, body: await res.text() }
  })
  const roleEscalationBlocked = tamperResult.status === undefined ? false : tamperResult.status >= 400
  record("client cannot self-escalate role via REST API", roleEscalationBlocked, JSON.stringify(tamperResult).slice(0, 150))

  await clientACtx.close()
  await clientBCtx.close()
  await providerCtx.close()
  await browser.close()

  fs.writeFileSync(path.join(OUT_DIR, "e2e-results.json"), JSON.stringify(results, null, 2))
  const failed = results.filter((r) => !r.pass)
  log(`\n=== E2E: ${results.length} checks, ${failed.length} failed ===`)
  if (failed.length > 0) {
    log("FAILURES:", JSON.stringify(failed, null, 2))
    process.exitCode = 1
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
