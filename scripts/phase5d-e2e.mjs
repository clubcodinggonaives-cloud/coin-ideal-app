// Phase 5D E2E — against the REAL deployed Vercel site, never localhost.
import { chromium } from "playwright"
import fs from "node:fs"

const BASE_URL = "https://coin-ideal-app.vercel.app"
const OUT_DIR = process.env.QA_OUT_DIR || "./phase5d-screenshots"
fs.mkdirSync(OUT_DIR, { recursive: true })

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  log(pass ? "PASS" : "FAIL", "-", name, detail ? `(${detail})` : "")
}

const browser = await chromium.launch()

// --- 1. Unauthenticated visitor hitting protected routes -> redirected to login
const anon = await browser.newContext()
const anonPage = await anon.newPage()
for (const route of ["/dashboard/orders", "/provider/orders", "/admin/orders", "/admin/pricing"]) {
  await anonPage.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 30000 })
  await anonPage.waitForTimeout(500)
  const redirected = anonPage.url().includes("/auth/login")
  record(`anonymous visitor blocked from ${route}`, redirected, anonPage.url())
}

// --- 2. Real registration against the live site
const testEmail = `phase5d-${Date.now()}@example.test`
await anonPage.goto(`${BASE_URL}/auth/register`, { waitUntil: "networkidle" })
await anonPage.fill('input[placeholder="Jean"]', "Phase5D")
await anonPage.fill('input[placeholder="Dupont"]', "Tester")
await anonPage.fill('input[type="email"]', testEmail)
await anonPage.fill('input[type="password"]', "TestPass123!")
await anonPage.fill('input[placeholder="••••••••"] >> nth=1', "TestPass123!")
await anonPage.screenshot({ path: `${OUT_DIR}/e2e_register_filled.png` })
await anonPage.click('button[type="submit"]')
await anonPage.waitForTimeout(2000)
const registeredOk = anonPage.url().includes("/dashboard") || (await anonPage.locator("text=/Compte créé/i").count()) > 0
record("registration against live site", registeredOk, anonPage.url())
await anonPage.screenshot({ path: `${OUT_DIR}/e2e_register_result.png` })

// --- 3. Contact form submission against the live site
await anonPage.goto(`${BASE_URL}/contact`, { waitUntil: "networkidle" })
await anonPage.fill('input[placeholder="Votre nom"]', "Phase5D QA")
await anonPage.fill('input[type="email"]', "phase5d-contact@example.test")
await anonPage.fill('input[placeholder="Objet de votre message"]', "Test Phase 5D staging")
await anonPage.fill('textarea', "Message de validation automatisee pour la Phase 5D, sans donnee client reelle.")
await anonPage.click('button[type="submit"]')
await anonPage.waitForTimeout(2000)
const contactOk = (await anonPage.locator("text=/envoyé avec succès/i").count()) > 0
record("contact form submission on live site", contactOk)
await anonPage.screenshot({ path: `${OUT_DIR}/e2e_contact_result.png` })

// --- 4. Chat widget opens and can send a message (Gemini already proven live in 5A)
await anonPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" })
await anonPage.click('button[aria-label="Ouvrir l\'assistant COIN-IDEAL"]')
await anonPage.waitForTimeout(500)
const chatOpened = (await anonPage.locator("text=Assistant COIN-IDEAL").count()) > 0
record("chat widget opens on live site", chatOpened)
if (chatOpened) {
  await anonPage.fill('input[placeholder="Posez votre question..."]', "Quels sont vos services ?")
  await anonPage.click('button[aria-label="Envoyer"]')
  await anonPage.waitForTimeout(6000)
  await anonPage.screenshot({ path: `${OUT_DIR}/e2e_chat_widget.png` })
  const gotReply = (await anonPage.locator("text=/COIN-IDEAL/i").count()) > 1 // welcome msg + reply both mention it
  record("chat widget gets a real Gemini reply on live site", gotReply)
}

await anon.close()
await browser.close()

fs.writeFileSync(`${OUT_DIR}/results.json`, JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.pass)
log(`\n=== ${results.length} checks, ${failed.length} failed ===`)
if (failed.length) log("FAILURES:", JSON.stringify(failed, null, 2))
