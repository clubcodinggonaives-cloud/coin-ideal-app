// One-off verification: provider_id fix (service creation/list) + real
// image upload wiring (avatar + service images), against the local dev
// server pointed at the real Supabase Cloud project via a temp fixture
// account (00041). Not a permanent test suite — ad hoc verification script.
import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = "http://localhost:5173"
const OUT_DIR = "./verify-screenshots"
fs.mkdirSync(OUT_DIR, { recursive: true })

const CREDS = { email: "verify-provider-fix@coin-ideal-qa.test", password: "VerifyFix!2026" }

const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(pass ? "PASS" : "FAIL", "-", name, detail ? `(${String(detail).slice(0, 150)})` : "")
}

// tiny 1x1 red PNG, for upload tests
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
fs.writeFileSync(path.join(OUT_DIR, "test.png"), Buffer.from(PNG_BASE64, "base64"))

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
await page.fill('input[type="email"]', CREDS.email)
await page.fill('input[type="password"]', CREDS.password)
await page.click('button[type="submit"]')
await page.waitForURL(/dashboard/, { timeout: 15000 })
record("login as temp test provider", true)

// --- Avatar upload (dashboard/settings) ---
await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: "networkidle" })
await page.setInputFiles('input[type="file"]', path.join(OUT_DIR, "test.png"))
await page.waitForTimeout(3000)
const avatarSrc = await page.locator('img[alt="Verify"]').getAttribute("src").catch(() => null)
record("avatar upload persists and renders", !!avatarSrc && avatarSrc.includes("avatars"), avatarSrc)
await page.screenshot({ path: `${OUT_DIR}/01_settings_avatar.png` })

// --- Provider services list (should be empty, no PGRST/RLS error) ---
await page.goto(`${BASE_URL}/provider/services`, { waitUntil: "networkidle" })
await page.waitForTimeout(1000)
const listBody = await page.locator("body").innerText()
const listErrored = /erreur|error/i.test(listBody) && !listBody.includes("Aucun service")
record("provider services list loads without error", !listErrored, listBody.slice(0, 200))

// --- Create a new service with 2 images ---
await page.goto(`${BASE_URL}/provider/services/new`, { waitUntil: "networkidle" })
await page.fill('input[placeholder*="Plomberie"]', "Service test verification")
await page.fill('textarea[placeholder*="Décrivez"]', "Service cree uniquement pour verifier le fix provider_id.")
await page.selectOption("select", { index: 1 })
await page.fill('input[placeholder="0"]', "10")
await page.fill('input[placeholder*="Ruelle Sajous"]', "Ruelle Sajous, Gonaives")
await page.setInputFiles('input[type="file"]', [path.join(OUT_DIR, "test.png")])
await page.waitForTimeout(500)
await page.click('button[type="submit"]')

try {
  await page.waitForURL(/\/provider\/services$/, { timeout: 15000 })
  record("service creation succeeds (provider_id fix)", true)
} catch {
  const body = await page.locator("body").innerText()
  record("service creation succeeds (provider_id fix)", false, body.slice(0, 300))
}

await page.waitForTimeout(1000)
await page.screenshot({ path: `${OUT_DIR}/02_services_list_after_create.png`, fullPage: true })
const afterCreateBody = await page.locator("body").innerText()
const serviceVisible = afterCreateBody.includes("Service test verification")
record("newly created service appears in 'Mes services' list", serviceVisible)

const hasImage = (await page.locator('img[alt="Service test verification"]').count()) > 0
record("service list shows the uploaded image thumbnail", hasImage)

await browser.close()
fs.writeFileSync(`${OUT_DIR}/results.json`, JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.pass)
console.log(`\n=== ${results.length} checks, ${failed.length} failed ===`)
