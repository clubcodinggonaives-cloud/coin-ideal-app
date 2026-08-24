// Phase 5F.1 remediation — regression pass over the Phase 5F CRITICAL/role
// controls, to confirm the profiles column-grant fix didn't break anything
// else. Read/write only against the dedicated 00049 fixtures.
const SUPABASE_URL = "https://qqibjglnvcezqbogkvlg.supabase.co"
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxaWJqZ2xudmNlenFib2drdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTQyOTYsImV4cCI6MjEwMjk5MDI5Nn0.rCCiTR2S7E5aT_cjMH7F7L6FwuwYvEhxvTbp2wTm6Bc"

const CLIENT_A = { email: "qa-client@coin-ideal-qa.test", password: "CoinIdealVerify!2026" }
const CLIENT_B = { email: "phase5f1-clientb@coin-ideal-qa.test", password: "Phase5f1Regr!2026" }
const PROVIDER = { email: "qa-provider@coin-ideal-qa.test", password: "CoinIdealVerify!2026" }
const ADMIN = { email: "phase5f1-admin@coin-ideal-qa.test", password: "Phase5f1Regr!2026" }
const TEST_SERVICE_ID = "de000000-0000-0000-0000-0000000005f1"

const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(pass ? "PASS" : "FAIL", "-", name, detail ? `:: ${String(detail).slice(0, 150)}` : "")
}

async function login(creds) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  })
  return { status: res.status, ...(await res.json()) }
}
async function rest(session, method, endpoint, body) {
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${session ? session.access_token : ANON_KEY}`, "Content-Type": "application/json" }
  if (method === "PATCH" || method === "POST") headers.Prefer = "return=representation"
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, body: json }
}
async function rpc(session, fn, args) {
  return rest(session, "POST", `rpc/${fn}`, args)
}

const sessA = await login(CLIENT_A)
const sessB = await login(CLIENT_B)
const sessP = await login(PROVIDER)
const sessAdmin = await login(ADMIN)
record("setup: all 4 sessions logged in", [sessA, sessB, sessP, sessAdmin].every((s) => s.status === 200))

// Anonymous access
const anonOrders = await rest(null, "GET", "orders?select=id")
// Side effect of the H1 fix, documented in the remediation report: orders_select_staff
// (00028) does a raw `EXISTS (... profiles.role IN (...))` subquery, not through
// is_admin() - for the `anon` role that subquery itself now hits a column-permission
// error (profiles.role is no longer grantable to anon) instead of evaluating to
// false/no-rows. Either way zero order data reaches anon; the security OUTCOME is
// unchanged, only the HTTP shape (403 instead of 200+[]) - so this asserts "no data",
// not a specific status code.
const anonOrdersBlocked = anonOrders.status === 200 ? anonOrders.body.length === 0 : anonOrders.status >= 400
record("REGRESSION anonymous still gets zero order data (status shape changed 200->403, no data exposure change)", anonOrdersBlocked, JSON.stringify(anonOrders).slice(0, 150))
const anonSettings = await rest(null, "PATCH", "settings?key=eq.flat_delivery_fee", { value: 0 })
record("REGRESSION anonymous cannot write settings", anonSettings.status >= 400 || anonSettings.body.length === 0, JSON.stringify(anonSettings).slice(0, 100))

// Role escalation
const selfPromote = await rest(sessA, "PATCH", `profiles?id=eq.${sessA.user.id}`, { role: "admin" })
record("REGRESSION client cannot self-promote to admin", selfPromote.status >= 400, JSON.stringify(selfPromote).slice(0, 150))

// Price tampering / create_order
const order = await rpc(sessA, "create_order", {
  p_service_id: TEST_SERVICE_ID,
  p_reception_method: "pickup",
  p_items: [{ pages: 3, copies: 2, color: "bw", sided: "simplex", unit_price: 0.01 }],
})
const orderId = order.status === 200 ? order.body : null
if (orderId) {
  const check = await rest(sessA, "GET", `orders?id=eq.${orderId}&select=total`)
  record("REGRESSION create_order still recomputes price server-side (3x2x1=6)", check.body?.[0]?.total === 6, JSON.stringify(check.body))
} else {
  record("REGRESSION create_order still recomputes price server-side (3x2x1=6)", false, JSON.stringify(order.body))
}

// Order/document ownership
if (orderId) {
  const bRead = await rest(sessB, "GET", `orders?id=eq.${orderId}&select=id`)
  record("REGRESSION Client B still cannot read Client A's order", bRead.status === 200 && bRead.body.length === 0, JSON.stringify(bRead.body))

  const pdfBytes = Buffer.from("%PDF-1.4 phase5f1 regression doc")
  const docPath = `${sessA.user.id}/phase5f1-regr-${Date.now()}.pdf`
  await fetch(`${SUPABASE_URL}/storage/v1/object/order-documents/${docPath}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${sessA.access_token}`, "Content-Type": "application/pdf" },
    body: pdfBytes,
  })
  const bSigned = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/order-documents/${docPath}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${sessB.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  })
  record("REGRESSION Client B still cannot sign a URL for Client A's document", bSigned.status !== 200, bSigned.status)

  const staffSigned = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/order-documents/${docPath}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${sessP.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  })
  record("REGRESSION Provider/staff still CAN sign a URL for the client's document (positive control)", staffSigned.status === 200, staffSigned.status)
}

// Provider access positive control
const provOrders = await rest(sessP, "GET", "orders?select=id&limit=1")
record("REGRESSION provider/staff still CAN read orders (positive control)", provOrders.status === 200, JSON.stringify(provOrders.body).slice(0, 100))

// Admin access positive control
const adminLogs = await rest(sessAdmin, "GET", "admin_logs?select=id&limit=1")
record("REGRESSION admin still CAN read admin_logs (positive control)", adminLogs.status === 200, JSON.stringify(adminLogs.body))
const clientLogs = await rest(sessA, "GET", "admin_logs?select=id&limit=1")
record("REGRESSION client still cannot read admin_logs", clientLogs.status === 200 && clientLogs.body.length === 0, JSON.stringify(clientLogs.body))

console.log(`\n=== ${results.length} regression checks, ${results.filter((r) => !r.pass).length} failed ===`)
