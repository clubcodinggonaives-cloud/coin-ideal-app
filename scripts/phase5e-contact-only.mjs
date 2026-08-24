import { chromium } from "playwright"
import fs from "node:fs"

const BASE_URL = "https://coin-ideal-app.vercel.app"
const SUPABASE_URL = "https://qqibjglnvcezqbogkvlg.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxaWJqZ2xudmNlenFib2drdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTQyOTYsImV4cCI6MjEwMjk5MDI5Nn0.rCCiTR2S7E5aT_cjMH7F7L6FwuwYvEhxvTbp2wTm6Bc"
const OUT_DIR = process.env.QA_OUT_DIR || "./phase5e-screenshots"

const browser = await chromium.launch()
const page = await browser.newPage()
const marker = `Phase5E QA ${Date.now()}`
await page.goto(`${BASE_URL}/contact`, { waitUntil: "networkidle" })
await page.fill('input[name="name"], input#name, input[placeholder*="nom" i]', "Phase5E QA Tester")
await page.fill('input[type="email"]', "phase5e-contact-qa@coin-ideal-qa.test")
const phoneInput = page.locator('input[type="tel"], input[name="phone"]')
if ((await phoneInput.count()) > 0) await phoneInput.fill("36000000")
await page.fill('input[placeholder*="Objet" i]', "Test QA Phase 5E")
await page.fill("textarea", marker)
await page.click('button[type="submit"]')
await page.waitForTimeout(2500)
const bodyText = await page.locator("body").innerText()
const submitted = /envoyé|merci|reçu|succès/i.test(bodyText)
console.log("Submitted UI success:", submitted)
await page.screenshot({ path: `${OUT_DIR}/07_contact_submit.png` })
await browser.close()

// Verify anon cannot read it back (RLS)
const anonRead = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages?select=id&message=eq.${encodeURIComponent(marker)}`, {
  headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
})
const anonReadBody = await anonRead.json()
console.log("Anon read blocked (should be []):", JSON.stringify(anonReadBody))
console.log("Marker used:", marker)
fs.writeFileSync(`${OUT_DIR}/contact-only-result.json`, JSON.stringify({ submitted, marker, anonReadBody }, null, 2))
