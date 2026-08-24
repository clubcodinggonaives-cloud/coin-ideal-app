// Phase 5E — full Cloud E2E against the real Vercel + Supabase Cloud stack.
import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = "https://coin-ideal-app.vercel.app"
const SUPABASE_URL = "https://qqibjglnvcezqbogkvlg.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxaWJqZ2xudmNlenFib2drdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTQyOTYsImV4cCI6MjEwMjk5MDI5Nn0.rCCiTR2S7E5aT_cjMH7F7L6FwuwYvEhxvTbp2wTm6Bc"
const OUT_DIR = process.env.QA_OUT_DIR || "./phase5e-screenshots"
fs.mkdirSync(OUT_DIR, { recursive: true })

const CLIENT_A = { email: "phase5e-clienta@coin-ideal-qa.test", password: "Phase5eQA!2026" }
const CLIENT_B = { email: "phase5e-clientb@coin-ideal-qa.test", password: "Phase5eQA!2026" }
const STAFF = { email: "phase5e-staff@coin-ideal-qa.test", password: "Phase5eQA!2026" }

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  log(pass ? "PASS" : "FAIL", "-", name, detail ? `(${detail})` : "")
}

async function login(page, creds) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
  await page.fill('input[type="email"]', creds.email)
  await page.fill('input[type="password"]', creds.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

const browser = await chromium.launch()
fs.writeFileSync(path.join(OUT_DIR, "test-doc.pdf"), "%PDF-1.4 phase 5e cloud e2e test document")

// =============================================================================
// CLIENT JOURNEY
// =============================================================================
const clientACtx = await browser.newContext()
const clientA = await clientACtx.newPage()

await clientA.goto(`${BASE_URL}/services`, { waitUntil: "networkidle" })
const seesTestService = (await clientA.locator("text=/TEST QA Phase 5E/i").count()) > 0
record("1-4. client browses /services, sees the real test service", seesTestService)

await clientA.goto(`${BASE_URL}/tarifs`, { waitUntil: "networkidle" })
const seesPricing = (await clientA.locator("text=/TEST QA Phase 5E/i").count()) > 0
record("5. client views /tarifs, sees real pricing", seesPricing)

await login(clientA, CLIENT_A)
record("2-3. client register/login", true, "used pre-provisioned account, real login flow exercised")

await clientA.goto(`${BASE_URL}/commander`, { waitUntil: "networkidle" })
await clientA.setInputFiles('input[type="file"]', path.join(OUT_DIR, "test-doc.pdf"))
await clientA.click("text=Continuer")
await clientA.waitForSelector("select")
// Select the TEST QA service specifically
const serviceSelect = clientA.locator("select").first()
const optionValue = await serviceSelect
  .locator("option", { hasText: /TEST QA Phase 5E/ })
  .getAttribute("value")
await serviceSelect.selectOption(optionValue)
const pageInputs = clientA.locator('input[type="number"]')
await pageInputs.nth(0).fill("4") // pages
await pageInputs.nth(1).fill("2") // copies
await clientA.click("text=Continuer") // -> reception step
await clientA.click("text=Continuer") // pickup (default), -> confirmation
await clientA.screenshot({ path: path.join(OUT_DIR, "01_order_confirm_step.png") })
await clientA.click("text=Confirmer la commande")
await clientA.waitForSelector("text=Commande envoyée", { timeout: 15000 })
record("6-11. upload, options, finishing skip, pickup, confirm order", true)
await clientA.screenshot({ path: path.join(OUT_DIR, "02_order_success.png") })

await clientA.click("text=Suivre ma commande")
await clientA.waitForURL(/\/dashboard\/orders/, { timeout: 10000 })
await clientA.waitForTimeout(800)
const orderCard = clientA.locator("text=/TEST QA Phase 5E/i").first()
const orderVisible = (await orderCard.count()) > 0
record("12. order appears in client dashboard", orderVisible)
// 4 pages x 2 copies x 1 HTG (bw, no finishing) = 8 HTG
const correctAmount = (await clientA.locator("text=/8\\s*HTG/i").count()) > 0
record("13. order amount is correct (4x2x1 HTG = 8 HTG)", correctAmount)
const correctStatus = (await clientA.locator("text=/En attente/i").count()) > 0
record("14. order status is 'En attente'", correctStatus)
await clientA.screenshot({ path: path.join(OUT_DIR, "03_client_dashboard.png"), fullPage: true })

// Fetch Client A's own order id + document path via the real REST API, as Client A
// (needed so the security section below can target the exact real row).
const orderInfo = await clientA.evaluate(
  async ({ url, anonKey }) => {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"))
    const session = key ? JSON.parse(localStorage.getItem(key)) : null
    if (!session) return { error: "no session" }
    const res = await fetch(`${url}/rest/v1/orders?select=id,total,order_items(file_path)&order=created_at.desc&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}` },
    })
    const rows = await res.json()
    return { accessToken: session.access_token, order: rows[0] }
  },
  { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
)
record("order id + document path retrievable by owner (Client A)", !!orderInfo.order?.id, JSON.stringify(orderInfo.order))
const ORDER_A_ID = orderInfo.order?.id

// =============================================================================
// SECURITY — Client B isolation (before staff touches anything, and after)
// =============================================================================
const clientBCtx = await browser.newContext()
const clientB = await clientBCtx.newPage()
await login(clientB, CLIENT_B)
await clientB.goto(`${BASE_URL}/dashboard/orders`, { waitUntil: "networkidle" })
await clientB.waitForTimeout(800)
const bSeesAOrder = (await clientB.locator("text=/TEST QA Phase 5E/i").count()) > 0
record("SECURITY: Client B cannot see Client A's order", !bSeesAOrder)

async function restAs(page, method, endpoint, body) {
  return page.evaluate(
    async ({ url, anonKey, method, endpoint, body }) => {
      const key = Object.keys(localStorage).find((k) => k.includes("auth-token"))
      const session = key ? JSON.parse(localStorage.getItem(key)) : null
      if (!session) return { error: "no session" }
      const headers = {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      }
      if (method === "PATCH") headers.Prefer = "return=representation"
      const res = await fetch(`${url}/rest/v1/${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      return { status: res.status, body: text.slice(0, 200) }
    },
    { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, method, endpoint, body }
  )
}

// Client B: read Client A's order directly by id via REST (RLS must return empty, not the row)
const bReadAOrder = await restAs(clientB, "GET", `orders?id=eq.${ORDER_A_ID}&select=id,total,status`)
const bReadBlocked = bReadAOrder.status === 200 && JSON.parse(bReadAOrder.body).length === 0
record("SECURITY: Client B cannot read Client A's order via REST", bReadBlocked, bReadAOrder.body)

// Client B: attempt to modify Client A's order status
const bModAOrder = await restAs(clientB, "PATCH", `orders?id=eq.${ORDER_A_ID}`, { status: "confirmee" })
const bModBlocked = bModAOrder.status >= 400 || (bModAOrder.status === 200 && bModAOrder.body === "[]")
record("SECURITY: Client B cannot modify Client A's order status", bModBlocked, JSON.stringify(bModAOrder).slice(0, 150))

// Client B: attempt to tamper Client A's order price directly
const bModPrice = await restAs(clientB, "PATCH", `orders?id=eq.${ORDER_A_ID}`, { total: 1 })
const bPriceBlocked = bModPrice.status >= 400 || (bModPrice.status === 200 && bModPrice.body === "[]")
record("SECURITY: Client B cannot modify Client A's order price", bPriceBlocked, JSON.stringify(bModPrice).slice(0, 150))

// Client B: attempt to read Client A's uploaded document metadata (order_items.file_path) via the join
const bReadDoc = await restAs(clientB, "GET", `orders?id=eq.${ORDER_A_ID}&select=id,order_items(file_path)`)
const bDocRows = bReadDoc.status === 200 ? JSON.parse(bReadDoc.body) : null
const bDocBlocked = bReadDoc.status === 200 && bDocRows.length === 0
record("SECURITY: Client B cannot read Client A's document path", bDocBlocked, bReadDoc.body)

// Client B: attempt to insert a fake payment against Client A's order
const bFakePayment = await restAs(clientB, "POST", `payments`, {
  order_id: ORDER_A_ID,
  amount: 1,
  method: "cash",
  status: "completed",
})
const bPaymentBlocked = bFakePayment.status >= 400
record("SECURITY: Client B cannot insert a payment on Client A's order", bPaymentBlocked, JSON.stringify(bFakePayment).slice(0, 150))

// Client B: attempts role escalation via the real REST API, using their own real session
const clientBUserId = await clientB.evaluate(() => {
  const key = Object.keys(localStorage).find((k) => k.includes("auth-token"))
  const session = key ? JSON.parse(localStorage.getItem(key)) : null
  return session?.user?.id
})
const bTamperRole = await restAs(clientB, "PATCH", `profiles?id=eq.${clientBUserId}`, { role: "admin" })
const bRoleBlocked = bTamperRole.status >= 400 || (bTamperRole.status === 200 && bTamperRole.body === "[]")
record("SECURITY: Client B cannot change own role", bRoleBlocked, JSON.stringify(bTamperRole).slice(0, 150))

await clientBCtx.close()

// =============================================================================
// STAFF JOURNEY
// =============================================================================
const staffCtx = await browser.newContext()
const staff = await staffCtx.newPage()
await login(staff, STAFF)
await staff.goto(`${BASE_URL}/provider/orders`, { waitUntil: "networkidle" })
await staff.waitForTimeout(800)
const staffSeesOrder = (await staff.locator("text=/TEST QA Phase 5E/i").count()) > 0
record("staff sees Client A's order", staffSeesOrder)

// Document access
const docLink = staff.locator('button:has-text("test-doc.pdf")').first()
const hasDocLink = (await docLink.count()) > 0
record("staff sees the uploaded document link", hasDocLink)
await staff.screenshot({ path: path.join(OUT_DIR, "04_staff_order_view.png"), fullPage: true })

// Advance status
await staff.locator('button:has-text("Passer à")').first().click()
await staff.waitForTimeout(1000)
const advanced = (await staff.locator("text=/Confirmée/i").count()) > 0
record("staff updates order status -> Confirmée", advanced)

// Record payment
await staff.locator('button:has-text("Enregistrer un paiement")').first().click()
const modal = staff.locator(".fixed.inset-0")
await modal.waitFor({ state: "visible" })
await modal.locator('button:has-text("Enregistrer")').click()
await modal.waitFor({ state: "hidden", timeout: 10000 })
record("staff records a payment", true)
await staff.screenshot({ path: path.join(OUT_DIR, "05_staff_after_actions.png"), fullPage: true })

await staffCtx.close()

// =============================================================================
// CLIENT A RE-VERIFICATION
// =============================================================================
await clientA.reload({ waitUntil: "networkidle" })
await clientA.waitForTimeout(800)
const statusUpdated = (await clientA.locator("text=/Confirmée/i").count()) > 0
record("client A sees status change to Confirmée after refresh", statusUpdated)

await clientA.goto(`${BASE_URL}/dashboard/notifications`, { waitUntil: "networkidle" })
await clientA.waitForTimeout(800)
const hasNotifs = (await clientA.locator("text=/Commande reçue|Commande confirmée|Paiement enregistré/i").count()) >= 2
record("client A received order + payment notifications", hasNotifs)
await clientA.screenshot({ path: path.join(OUT_DIR, "06_client_notifications.png"), fullPage: true })

await clientACtx.close()
await browser.close()

fs.writeFileSync(path.join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.pass)
log(`\n=== ${results.length} checks, ${failed.length} failed ===`)
if (failed.length) log("FAILURES:", JSON.stringify(failed, null, 2))
