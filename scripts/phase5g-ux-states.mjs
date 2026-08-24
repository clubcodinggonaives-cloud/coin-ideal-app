// Phase 5G — real UX state testing against the live Vercel deployment.
import { chromium } from "playwright"
import fs from "node:fs"

const BASE_URL = "https://coin-ideal-app.vercel.app"
const OUT_DIR = "./phase5g-out"
fs.mkdirSync(OUT_DIR, { recursive: true })

const results = []
function record(name, detail) {
  results.push({ name, detail })
  console.log("-", name, detail ? `:: ${detail}` : "")
}

const browser = await chromium.launch()

// 1. Loading state (throttle network to actually see the skeleton)
{
  const page = await browser.newPage()
  const client = await page.context().newCDPSession(page)
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
    latency: 400,
  })
  await page.goto(`${BASE_URL}/services`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT_DIR}/ux-01-loading.png` })
  const hasSkeleton = (await page.locator('[class*="animate-pulse"]').count()) > 0
  record("Loading state shows a skeleton (throttled network)", hasSkeleton ? "skeleton present" : "NO SKELETON FOUND")
  await client.send("Network.emulateNetworkConditions", { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 })
  await page.close()
}

// 2. Empty state (a category with no services, or a fresh dashboard list)
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/services?category=nonexistent-category-xyz`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT_DIR}/ux-02-empty-services.png` })
  const bodyText = await page.locator("body").innerText()
  record("Empty services search shows an empty state message", /aucun|vide|no.*found/i.test(bodyText) ? "empty-state text present" : "no obvious empty-state text")
  await page.close()
}

// 3. Success state (contact form submission)
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/contact`, { waitUntil: "networkidle" })
  await page.fill('input[name="name"], input#name, input[placeholder*="nom" i]', "Phase5G UX Test")
  await page.fill('input[type="email"]', "phase5g-ux@coin-ideal-qa.test")
  await page.fill('input[placeholder*="Objet" i]', "Phase 5G UX success state test")
  await page.fill("textarea", "Testing the success state after contact form submission.")
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT_DIR}/ux-03-success.png` })
  const bodyText = await page.locator("body").innerText()
  record("Contact form success state shows confirmation", /envoyé|merci|reçu|succès/i.test(bodyText) ? "success message present" : "NO SUCCESS MESSAGE FOUND")
  await page.close()
}

// 4. Error state (validation error on empty contact form submit)
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/contact`, { waitUntil: "networkidle" })
  await page.click('button[type="submit"]')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT_DIR}/ux-04-validation-error.png` })
  const errorCount = await page.locator("text=/requis|obligatoire|invalide/i").count()
  record("Empty form submit shows validation errors", errorCount > 0 ? `${errorCount} error message(s) shown` : "NO VALIDATION ERRORS SHOWN")
  await page.close()
}

// 5. Authentication failure (wrong password)
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" })
  await page.fill('input[type="email"]', "qa-client@coin-ideal-qa.test")
  await page.fill('input[type="password"]', "WrongPassword123!")
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT_DIR}/ux-05-auth-failure.png` })
  const bodyText = await page.locator("body").innerText()
  record("Wrong password shows a real error message", /incorrect|invalide|erreur|échoué/i.test(bodyText) ? "error message present" : "NO ERROR MESSAGE FOUND")
  await page.close()
}

// 6. Unauthorized access (anonymous hitting a protected route)
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/dashboard/orders`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT_DIR}/ux-06-unauthorized.png` })
  record("Anonymous visiting /dashboard/orders", `redirected to ${page.url()}`)
  await page.close()
}

// 7. Offline / network failure
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" })
  await page.context().setOffline(true)
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  try {
    await page.goto(`${BASE_URL}/services`, { waitUntil: "domcontentloaded", timeout: 8000 })
  } catch (e) {
    record("Navigating while offline", `navigation failed as expected: ${e.message.slice(0, 80)}`)
  }
  await page.screenshot({ path: `${OUT_DIR}/ux-07-offline.png` }).catch(() => {})
  await page.context().setOffline(false)
  record("Uncaught JS errors while offline", errors.length ? `${errors.length} uncaught error(s): ${errors[0]}` : "none observed")
  await page.close()
}

// 8. Upload failure (wrong file type on /commander)
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/commander`, { waitUntil: "networkidle" })
  fs.writeFileSync(`${OUT_DIR}/bad-upload.exe`, "not a real document, wrong extension")
  const fileInput = page.locator('input[type="file"]')
  if ((await fileInput.count()) > 0) {
    await fileInput.setInputFiles(`${OUT_DIR}/bad-upload.exe`).catch(() => {})
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT_DIR}/ux-08-upload-failure.png` })
    const bodyText = await page.locator("body").innerText()
    record("Wrong file type upload on /commander", /format|type|invalide|non supporté/i.test(bodyText) ? "rejection message shown" : "no visible rejection message (may be silently filtered by accept= attribute)")
  } else {
    record("Wrong file type upload on /commander", "no file input found on this step (service catalogue may be empty)")
  }
  await page.close()
}

// 9. Gemini failure (assistant currently down per live testing)
{
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" })
  const chatButton = page.locator("button").last()
  await chatButton.click().catch(() => {})
  await page.waitForTimeout(500)
  const input = page.locator('input[type="text"], textarea').last()
  if ((await input.count()) > 0) {
    await input.fill("Bonjour")
    await page.keyboard.press("Enter")
    await page.waitForTimeout(6000)
    await page.screenshot({ path: `${OUT_DIR}/ux-09-gemini-failure.png` })
    const bodyText = await page.locator("body").innerText()
    record("Gemini currently down - widget error handling", /indisponible|erreur|réessay/i.test(bodyText) ? "graceful error message shown to user" : "no visible error message in widget")
  } else {
    record("Gemini failure UX", "chat widget input not found")
  }
  await page.close()
}

await browser.close()
fs.writeFileSync(`${OUT_DIR}/ux-states-results.json`, JSON.stringify(results, null, 2))
console.log(`\n=== ${results.length} UX state checks done ===`)
