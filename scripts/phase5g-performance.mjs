// Phase 5G — real performance measurement against the live Vercel deployment.
import { chromium } from "playwright"
import fs from "node:fs"

const BASE_URL = "https://coin-ideal-app.vercel.app"
const OUT_DIR = "./phase5g-out"
fs.mkdirSync(OUT_DIR, { recursive: true })

const PAGES = ["/", "/services", "/tarifs", "/commander", "/contact", "/comment-ca-marche", "/vente-eau"]

const browser = await chromium.launch()
const results = []

for (const path of PAGES) {
  const page = await browser.newPage()
  const requests = []
  page.on("requestfinished", async (req) => {
    try {
      const res = await req.response()
      requests.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        status: res ? res.status() : null,
        size: res ? (await res.body().catch(() => null))?.length ?? null : null,
      })
    } catch {
      // ignore
    }
  })

  const start = Date.now()
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" })
  const wallClock = Date.now() - start

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0]
    const paints = performance.getEntriesByType("paint")
    return {
      ttfb: nav ? nav.responseStart - nav.requestStart : null,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      loadEvent: nav ? nav.loadEventEnd - nav.startTime : null,
      transferSize: nav ? nav.transferSize : null,
      fcp: paints.find((p) => p.name === "first-contentful-paint")?.startTime ?? null,
    }
  })

  const jsRequests = requests.filter((r) => r.resourceType === "script")
  const imgRequests = requests.filter((r) => r.resourceType === "image")
  const xhrRequests = requests.filter((r) => r.resourceType === "fetch" || r.resourceType === "xhr")
  const totalJsBytes = jsRequests.reduce((s, r) => s + (r.size || 0), 0)
  const totalImgBytes = imgRequests.reduce((s, r) => s + (r.size || 0), 0)

  // Duplicate request detection (same URL fetched more than once in one page load)
  const urlCounts = {}
  for (const r of requests) urlCounts[r.url] = (urlCounts[r.url] || 0) + 1
  const duplicates = Object.entries(urlCounts).filter(([, c]) => c > 1)

  const supabaseCalls = requests.filter((r) => r.url.includes("supabase.co"))

  const summary = {
    path,
    wallClockMs: wallClock,
    ttfbMs: Math.round(timing.ttfb || 0),
    fcpMs: Math.round(timing.fcp || 0),
    domContentLoadedMs: Math.round(timing.domContentLoaded || 0),
    loadEventMs: Math.round(timing.loadEvent || 0),
    totalRequests: requests.length,
    jsRequestCount: jsRequests.length,
    jsTotalKB: Math.round(totalJsBytes / 1024),
    imgRequestCount: imgRequests.length,
    imgTotalKB: Math.round(totalImgBytes / 1024),
    supabaseCallCount: supabaseCalls.length,
    supabaseCalls: supabaseCalls.map((r) => ({ url: r.url.replace(/^https:\/\/[^/]+/, ""), status: r.status })),
    duplicateRequests: duplicates.map(([url, count]) => ({ url: url.replace(BASE_URL, "").replace(/^https:\/\/[^/]+/, ""), count })),
  }
  results.push(summary)
  console.log(`\n=== ${path} ===`)
  console.log(JSON.stringify(summary, null, 2))

  await page.close()
}

fs.writeFileSync(`${OUT_DIR}/performance-results.json`, JSON.stringify(results, null, 2))
await browser.close()
console.log("\n\nDone. Results saved to phase5g-out/performance-results.json")
