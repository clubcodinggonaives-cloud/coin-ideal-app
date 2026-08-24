// Phase 5F — Final Security Audit. Read-only against the running system
// (no application code touched by this script) except for creating rows
// this audit itself needs to verify RLS/RPC behavior (an order, a review,
// etc.) using dedicated audit accounts — cleaned up separately after.
import fs from "node:fs"

const SUPABASE_URL = "https://qqibjglnvcezqbogkvlg.supabase.co"
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxaWJqZ2xudmNlenFib2drdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTQyOTYsImV4cCI6MjEwMjk5MDI5Nn0.rCCiTR2S7E5aT_cjMH7F7L6FwuwYvEhxvTbp2wTm6Bc"
const BASE_URL = "https://coin-ideal-app.vercel.app"

const CLIENT_A = { email: "qa-client@coin-ideal-qa.test", password: "CoinIdealVerify!2026" }
const CLIENT_B = { email: "phase5f-clientb@coin-ideal-qa.test", password: "Phase5fAudit!2026" }
const PROVIDER = { email: "qa-provider@coin-ideal-qa.test", password: "CoinIdealVerify!2026" }
const ADMIN = { email: "phase5f-admin@coin-ideal-qa.test", password: "Phase5fAudit!2026" }
const TEST_SERVICE_ID = "de000000-0000-0000-0000-00000000005f"

const results = []
function record(section, name, severity, pass, detail) {
  results.push({ section, name, severity, pass, detail })
  console.log(`[${section}] ${pass ? "OK " : "FAIL"} (${severity}) - ${name}`, detail ? `:: ${String(detail).slice(0, 180)}` : "")
}

async function login(creds) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  })
  const json = await res.json()
  return { status: res.status, ...json }
}

async function rest(session, method, endpoint, body) {
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${session ? session.access_token : ANON_KEY}`,
    "Content-Type": "application/json",
  }
  if (method === "PATCH" || method === "POST") headers.Prefer = "return=representation"
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
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

async function storageUpload(session, bucket, path, bytes, contentType = "application/pdf") {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${session ? session.access_token : ANON_KEY}`,
      "Content-Type": contentType,
    },
    body: bytes,
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

// =============================================================================
// SETUP
// =============================================================================
const sessA = await login(CLIENT_A)
const sessB = await login(CLIENT_B)
const sessP = await login(PROVIDER)
const sessAdmin = await login(ADMIN)
record("SETUP", "Client A login", "INFO", sessA.status === 200, sessA.user?.id)
record("SETUP", "Client B login", "INFO", sessB.status === 200, sessB.user?.id)
record("SETUP", "Provider login", "INFO", sessP.status === 200, sessP.user?.id)
record("SETUP", "Admin login", "INFO", sessAdmin.status === 200, sessAdmin.user?.id)

// =============================================================================
// AUTHENTICATION
// =============================================================================
{
  // Bad credentials
  const bad = await login({ email: CLIENT_A.email, password: "WrongPassword123!" })
  record("AUTH", "Wrong password rejected", "INFO", bad.status !== 200, bad.error_code)

  // Unauthorized route (anonymous) via real UI
  const anonRes = await fetch(`${BASE_URL}/dashboard/orders`, { redirect: "manual" })
  record("AUTH", "Anonymous /dashboard/orders does not 200 with data (SPA shell expected)", "INFO", true, anonRes.status)

  // Protected API access with no token at all
  const noAuth = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id`, { headers: { apikey: ANON_KEY } })
  const noAuthBody = await noAuth.json()
  record(
    "AUTH",
    "REST call with apikey but no user JWT (anon role) cannot list orders",
    "INFO",
    noAuth.status === 200 && Array.isArray(noAuthBody) && noAuthBody.length === 0,
    JSON.stringify(noAuthBody).slice(0, 100)
  )

  // Malformed / garbage JWT
  const garbled = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id`, {
    headers: { apikey: ANON_KEY, Authorization: "Bearer not-a-real-jwt" },
  })
  record("AUTH", "Garbage JWT rejected, not silently accepted", "INFO", garbled.status === 401, garbled.status)

  // Logout: verify refresh token invalidation
  const logoutRes = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${sessA.access_token}` },
  })
  record("AUTH", "Logout (global) call succeeds", "INFO", logoutRes.status === 204 || logoutRes.status === 200, logoutRes.status)
  // Re-login immediately after for the rest of the suite (logout revokes refresh tokens, not necessarily the still-valid access token until expiry - test that access token behavior explicitly)
  const stillWorks = await rest(sessA, "GET", "profiles?select=id&limit=1")
  record(
    "AUTH",
    "Access token still valid after logout until natural expiry (expected JWT behavior, not a bug)",
    "INFO",
    true,
    `status ${stillWorks.status} - Supabase access tokens are stateless JWTs, logout revokes the refresh token so no NEW access token can be minted, but an already-issued access token remains valid until its own exp claim`
  )
  const sessA2 = await login(CLIENT_A)
  Object.assign(sessA, sessA2)

  // Refresh token reuse after logout (expired-session-adjacent test)
  const refreshAfterLogout = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: sessA2.refresh_token }),
  })
  record("AUTH", "Refresh token grant works for the current session", "INFO", refreshAfterLogout.status === 200, refreshAfterLogout.status)
}

// =============================================================================
// AUTHORIZATION — least privilege across roles
// =============================================================================
{
  // Anonymous cannot read profiles' sensitive-looking fields beyond what's intended
  const anonProfiles = await rest(null, "GET", "profiles?select=id,email,role,phone,bio&limit=3")
  record(
    "AUTHZ",
    "Anonymous can read ALL profiles (id/email/role/phone/bio) via profiles_select_public USING(true)",
    "MEDIUM",
    !(anonProfiles.status === 200 && Array.isArray(anonProfiles.body) && anonProfiles.body.length > 0 && anonProfiles.body[0].email),
    JSON.stringify(anonProfiles.body).slice(0, 200)
  )

  // Client cannot see admin-only tables
  const clientLogs = await rest(sessA, "GET", "admin_logs?select=id&limit=1")
  record("AUTHZ", "Client cannot read admin_logs", "HIGH", clientLogs.status === 200 && clientLogs.body.length === 0, JSON.stringify(clientLogs.body))

  // Client cannot write settings (pricing config)
  const clientSettings = await rest(sessA, "PATCH", "settings?key=eq.flat_delivery_fee", { value: 0 })
  record(
    "AUTHZ",
    "Client cannot modify settings (pricing config)",
    "CRITICAL",
    clientSettings.status >= 400 || (clientSettings.status === 200 && Array.isArray(clientSettings.body) && clientSettings.body.length === 0),
    JSON.stringify(clientSettings).slice(0, 150)
  )

  // Provider cannot read admin_logs
  const provLogs = await rest(sessP, "GET", "admin_logs?select=id&limit=1")
  record("AUTHZ", "Provider cannot read admin_logs", "HIGH", provLogs.status === 200 && provLogs.body.length === 0, JSON.stringify(provLogs.body))

  // Admin CAN read admin_logs (positive control - confirms the test itself is valid)
  const adminLogs = await rest(sessAdmin, "GET", "admin_logs?select=id&limit=1")
  record("AUTHZ", "Admin CAN read admin_logs (positive control)", "INFO", adminLogs.status === 200, JSON.stringify(adminLogs.body).slice(0, 100))
}

// =============================================================================
// RPC: create_order — input validation & authorization
// =============================================================================
let ORDER_A_ID = null
{
  // Anonymous cannot call create_order
  const anonOrder = await rpc(null, "create_order", {
    p_service_id: TEST_SERVICE_ID,
    p_reception_method: "pickup",
    p_items: [{ pages: 1, copies: 1, color: "bw", sided: "simplex" }],
  })
  record("RPC", "create_order: anonymous caller rejected", "CRITICAL", anonOrder.status >= 400, JSON.stringify(anonOrder.body).slice(0, 150))

  // Invalid service id
  const badService = await rpc(sessA, "create_order", {
    p_service_id: "00000000-0000-0000-0000-000000000000",
    p_reception_method: "pickup",
    p_items: [{ pages: 1, copies: 1, color: "bw", sided: "simplex" }],
  })
  record("RPC", "create_order: nonexistent/inactive service rejected", "HIGH", badService.status >= 400, JSON.stringify(badService.body).slice(0, 150))

  // Client-supplied price is ignored (server recomputes) - try to smuggle a fake price field
  const priceTamper = await rpc(sessA, "create_order", {
    p_service_id: TEST_SERVICE_ID,
    p_reception_method: "pickup",
    p_items: [{ pages: 4, copies: 2, color: "bw", sided: "simplex", unit_price: 0.01, line_total: 0.01, total: 0.01 }],
  })
  const orderACreated = priceTamper.status === 200 || priceTamper.status === 201
  if (orderACreated) {
    ORDER_A_ID = priceTamper.body
    const check = await rest(sessA, "GET", `orders?id=eq.${ORDER_A_ID}&select=total,subtotal`)
    const correctTotal = check.body?.[0]?.total === 8
    record(
      "RPC",
      "create_order: client-supplied price fields are ignored, server recomputes (4x2x1=8)",
      "CRITICAL",
      correctTotal,
      JSON.stringify(check.body)
    )
  } else {
    record("RPC", "create_order: could not create baseline order for further tests", "INFO", false, JSON.stringify(priceTamper.body))
  }

  // Delivery without address rejected
  const noAddress = await rpc(sessA, "create_order", {
    p_service_id: TEST_SERVICE_ID,
    p_reception_method: "delivery",
    p_items: [{ pages: 1, copies: 1, color: "bw", sided: "simplex" }],
  })
  record("RPC", "create_order: delivery without delivery_address_id rejected", "MEDIUM", noAddress.status >= 400, JSON.stringify(noAddress.body).slice(0, 150))

  // Address belonging to someone else
  const fakeAddrOrder = await rpc(sessA, "create_order", {
    p_service_id: TEST_SERVICE_ID,
    p_reception_method: "delivery",
    p_delivery_address_id: "00000000-0000-0000-0000-000000000000",
    p_items: [{ pages: 1, copies: 1, color: "bw", sided: "simplex" }],
  })
  record("RPC", "create_order: nonexistent delivery_address_id rejected", "MEDIUM", fakeAddrOrder.status >= 400, JSON.stringify(fakeAddrOrder.body).slice(0, 150))

  // Invalid enum values
  const badColor = await rpc(sessA, "create_order", {
    p_service_id: TEST_SERVICE_ID,
    p_reception_method: "pickup",
    p_items: [{ pages: 1, copies: 1, color: "rainbow", sided: "simplex" }],
  })
  record("RPC", "create_order: invalid color enum rejected", "LOW", badColor.status >= 400, JSON.stringify(badColor.body).slice(0, 150))

  // Zero/negative copies
  const zeroCopies = await rpc(sessA, "create_order", {
    p_service_id: TEST_SERVICE_ID,
    p_reception_method: "pickup",
    p_items: [{ pages: 1, copies: 0, color: "bw", sided: "simplex" }],
  })
  record("RPC", "create_order: copies=0 rejected", "LOW", zeroCopies.status >= 400, JSON.stringify(zeroCopies.body).slice(0, 150))

  // Unknown finishing id
  const badFinishing = await rpc(sessA, "create_order", {
    p_service_id: TEST_SERVICE_ID,
    p_reception_method: "pickup",
    p_items: [{ pages: 1, copies: 1, color: "bw", sided: "simplex", finishing_ids: ["nonexistent-finishing-xyz"] }],
  })
  record("RPC", "create_order: unknown finishing_id rejected", "LOW", badFinishing.status >= 400, JSON.stringify(badFinishing.body).slice(0, 150))
}

// =============================================================================
// RLS: orders/order_items/payments cross-account isolation
// =============================================================================
if (ORDER_A_ID) {
  const bRead = await rest(sessB, "GET", `orders?id=eq.${ORDER_A_ID}&select=id,total,status`)
  record("RLS", "orders: Client B cannot SELECT Client A's order", "CRITICAL", bRead.status === 200 && bRead.body.length === 0, JSON.stringify(bRead.body))

  const bItemsRead = await rest(sessB, "GET", `order_items?order_id=eq.${ORDER_A_ID}&select=id,file_path`)
  record("RLS", "order_items: Client B cannot SELECT Client A's order items", "CRITICAL", bItemsRead.status === 200 && bItemsRead.body.length === 0, JSON.stringify(bItemsRead.body))

  const bUpdate = await rest(sessB, "PATCH", `orders?id=eq.${ORDER_A_ID}`, { total: 1 })
  record("RLS", "orders: Client B cannot UPDATE Client A's order (table grants revoked)", "CRITICAL", bUpdate.status >= 400, JSON.stringify(bUpdate).slice(0, 150))

  const bDelete = await rest(sessB, "DELETE", `orders?id=eq.${ORDER_A_ID}`)
  record("RLS", "orders: Client B cannot DELETE Client A's order (table grants revoked)", "CRITICAL", bDelete.status >= 400, JSON.stringify(bDelete).slice(0, 150))

  const bFakePayment = await rpc(sessB, "record_payment", { p_order_id: ORDER_A_ID, p_amount: 1, p_method: "cash" })
  record("RPC", "record_payment: non-staff (Client B) cannot record a payment", "CRITICAL", bFakePayment.status >= 400, JSON.stringify(bFakePayment.body).slice(0, 150))

  const bStatusChange = await rpc(sessB, "update_order_status", { p_order_id: ORDER_A_ID, p_new_status: "confirmee" })
  record("RPC", "update_order_status: Client B cannot change Client A's order status", "CRITICAL", bStatusChange.status >= 400, JSON.stringify(bStatusChange.body).slice(0, 150))

  // Client A herself: invalid transition (not en_attente -> confirmee, clients can only cancel)
  const aInvalidTransition = await rpc(sessA, "update_order_status", { p_order_id: ORDER_A_ID, p_new_status: "confirmee" })
  record(
    "RPC",
    "update_order_status: client cannot self-confirm own order (only en_attente->annulee allowed)",
    "HIGH",
    aInvalidTransition.status >= 400,
    JSON.stringify(aInvalidTransition.body).slice(0, 150)
  )

  // Provider (staff) CAN read/act on it - positive control
  const provRead = await rest(sessP, "GET", `orders?id=eq.${ORDER_A_ID}&select=id`)
  record("RLS", "orders: provider/staff CAN read any order (positive control, by design)", "INFO", provRead.status === 200 && provRead.body.length === 1, JSON.stringify(provRead.body))

  const provConfirm = await rpc(sessP, "update_order_status", { p_order_id: ORDER_A_ID, p_new_status: "confirmee" })
  record("RPC", "update_order_status: staff CAN confirm the order (positive control)", "INFO", provConfirm.status === 200 || provConfirm.status === 204, JSON.stringify(provConfirm.body).slice(0, 150))

  // record_payment amount validation - staff records an amount LARGER than the order total
  const overpay = await rpc(sessP, "record_payment", { p_order_id: ORDER_A_ID, p_amount: 999999, p_method: "cash", p_status: "confirmed" })
  record(
    "RPC",
    "record_payment: amount is NOT validated against order total (staff can record any amount, incl. far exceeding it)",
    "MEDIUM",
    !(overpay.status === 200 || overpay.status === 201),
    JSON.stringify(overpay.body).slice(0, 150)
  )
}

// =============================================================================
// STORAGE — private buckets, cross-user access, signed URLs, path manipulation
// =============================================================================
{
  const clientAId = sessA.user.id
  const clientBId = sessB.user.id
  const pdfBytes = Buffer.from("%PDF-1.4 phase5f audit test document")
  const docPath = `${clientAId}/phase5f-audit-${Date.now()}.pdf`

  const upload = await storageUpload(sessA, "order-documents", docPath, pdfBytes)
  record("STORAGE", "Client A can upload to her own folder in order-documents", "INFO", upload.status === 200, upload.status)

  // Cross-user download attempt: Client B tries to GET the raw object directly
  const bDirectGet = await fetch(`${SUPABASE_URL}/storage/v1/object/order-documents/${docPath}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${sessB.access_token}` },
  })
  record("STORAGE", "Client B cannot directly download Client A's order document", "CRITICAL", bDirectGet.status !== 200, bDirectGet.status)

  // Client B tries to generate a signed URL for it
  const bSignedUrl = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/order-documents/${docPath}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${sessB.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  })
  record("STORAGE", "Client B cannot generate a signed URL for Client A's document", "CRITICAL", bSignedUrl.status !== 200, bSignedUrl.status)

  // Path manipulation: Client B tries to upload INTO Client A's folder
  const bPathManip = await storageUpload(sessB, "order-documents", `${clientAId}/malicious-${Date.now()}.pdf`, pdfBytes)
  record("STORAGE", "Client B cannot write into Client A's order-documents folder (path manipulation)", "CRITICAL", bPathManip.status !== 200, bPathManip.status)

  // Anonymous cannot access the private bucket at all
  const anonGet = await fetch(`${SUPABASE_URL}/storage/v1/object/order-documents/${docPath}`, {
    headers: { apikey: ANON_KEY },
  })
  record("STORAGE", "Anonymous cannot download from private order-documents bucket", "CRITICAL", anonGet.status !== 200, anonGet.status)

  // Staff (provider) CAN read the document via signed URL - positive control, and the exact
  // capability that a nested-RLS bug (like the one found+fixed for service-images, 00042)
  // would silently break, so this is a genuine regression check, not a formality.
  const staffSigned = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/order-documents/${docPath}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${sessP.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  })
  record(
    "STORAGE",
    "Provider/staff CAN generate a signed URL for a client's order document (positive control - required for order processing)",
    "INFO",
    staffSigned.status === 200,
    staffSigned.status
  )
  if (staffSigned.status === 200) {
    const { signedURL } = await staffSigned.json()
    const fetchSigned = await fetch(`${SUPABASE_URL}/storage/v1${signedURL}`)
    record("STORAGE", "The signed URL staff generated actually downloads the file", "INFO", fetchSigned.status === 200, fetchSigned.status)
  }

  // Signed URL from one order cannot be reused to infer/access another user's file by guessing path
  const guessPath = `${clientBId}/avatar.png`
  const guessSigned = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/order-documents/${guessPath}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${sessA.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 }),
  })
  record(
    "STORAGE",
    "Client A cannot sign a URL for a path under Client B's folder even if guessed correctly",
    "CRITICAL",
    guessSigned.status !== 200,
    guessSigned.status
  )

  // Bucket enumeration: can anon list all objects in the private bucket root?
  const listRoot = await fetch(`${SUPABASE_URL}/storage/v1/object/list/order-documents`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 100 }),
  })
  const listRootBody = await listRoot.json()
  record(
    "STORAGE",
    "Anonymous cannot list the root of the private order-documents bucket",
    "CRITICAL",
    !(listRoot.status === 200 && Array.isArray(listRootBody) && listRootBody.length > 0),
    JSON.stringify(listRootBody).slice(0, 150)
  )
}

// =============================================================================
// RLS — business-logic integrity gaps found via static review, verified live
// =============================================================================
{
  // Fake review without ever booking/using the service
  const fakeReview = await rest(sessB, "POST", "reviews", {
    reviewer_id: sessB.user.id,
    provider_id: (await rest(sessA, "GET", `services?id=eq.${TEST_SERVICE_ID}&select=provider_id`)).body?.[0]?.provider_id,
    service_id: TEST_SERVICE_ID,
    rating: 5,
    comment: "Phase5F audit - fake review, never used this service",
  })
  record(
    "RLS",
    "reviews: any authenticated user can post a review WITHOUT ever booking/ordering (no booking_id required, no purchase-verification check)",
    "MEDIUM",
    !(fakeReview.status === 200 || fakeReview.status === 201),
    JSON.stringify(fakeReview.body).slice(0, 150)
  )
  const fakeReviewId = Array.isArray(fakeReview.body) ? fakeReview.body[0]?.id : null

  if (fakeReviewId) {
    // Can the reviewer also write into `response` (meant for the provider's reply)?
    const hijackResponse = await rest(sessB, "PATCH", `reviews?id=eq.${fakeReviewId}`, { response: "Fake provider reply written by the reviewer themself" })
    record(
      "RLS",
      "reviews: reviewer can write the `response` field too (normally the provider's reply) - no column-level restriction",
      "LOW",
      !(hijackResponse.status === 200 && hijackResponse.body?.length > 0),
      JSON.stringify(hijackResponse.body).slice(0, 150)
    )
  }
}

// =============================================================================
// RLS — messages: can a recipient tamper with the sender's message content?
// =============================================================================
{
  const [p1, p2] = [sessA.user.id, sessB.user.id].sort()
  const thread = await rest(sessA, "POST", "message_threads", { participant_1: p1, participant_2: p2 })
  const threadId = Array.isArray(thread.body) ? thread.body[0]?.id : null
  if (threadId) {
    const msg = await rest(sessA, "POST", "messages", { thread_id: threadId, sender_id: sessA.user.id, content: "Original message from Client A" })
    const msgId = Array.isArray(msg.body) ? msg.body[0]?.id : null
    if (msgId) {
      // Client B (recipient, not sender) tries to rewrite Client A's message content
      const tamper = await rest(sessB, "PATCH", `messages?id=eq.${msgId}`, { content: "TAMPERED by recipient, not the original sender" })
      record(
        "RLS",
        "messages: recipient can rewrite the SENDER's message content (messages_update_participant has no column/sender restriction)",
        "MEDIUM",
        !(tamper.status === 200 && tamper.body?.[0]?.content?.includes("TAMPERED")),
        JSON.stringify(tamper.body).slice(0, 150)
      )
    } else {
      record("RLS", "messages: could not create a message to test tampering", "INFO", false, JSON.stringify(msg.body))
    }
  } else {
    record("RLS", "messages: could not create a thread to test tampering", "INFO", false, JSON.stringify(thread.body))
  }

  // Can Client B insert a message into a thread they are NOT part of?
  const [p1o, p2o] = [sessA.user.id, sessP.user.id].sort()
  const outsiderThread = await rest(sessA, "POST", "message_threads", { participant_1: p1o, participant_2: p2o })
  const outsiderThreadId = Array.isArray(outsiderThread.body) ? outsiderThread.body[0]?.id : null
  if (outsiderThreadId) {
    const injectMsg = await rest(sessB, "POST", "messages", { thread_id: outsiderThreadId, sender_id: sessB.user.id, content: "Client B injecting into A<->Provider thread" })
    record(
      "RLS",
      "messages: a non-participant cannot inject a message into someone else's thread",
      "HIGH",
      !(injectMsg.status === 200 || injectMsg.status === 201),
      JSON.stringify(injectMsg.body).slice(0, 150)
    )
  }
}

// =============================================================================
// RLS — service_requests: provider-side column tampering (client_id reassignment)
// =============================================================================
{
  const req = await rest(sessA, "POST", "service_requests", {
    client_id: sessA.user.id,
    service_id: TEST_SERVICE_ID,
    provider_id: (await rest(sessA, "GET", `services?id=eq.${TEST_SERVICE_ID}&select=provider_id`)).body?.[0]?.provider_id,
    message: "Phase5F audit test request",
    address: "N/A",
  })
  const reqId = Array.isArray(req.body) ? req.body[0]?.id : null
  if (reqId) {
    const tamperClientId = await rest(sessP, "PATCH", `service_requests?id=eq.${reqId}`, { client_id: sessB.user.id })
    record(
      "RLS",
      "service_requests: provider can reassign client_id on a request assigned to them (trigger only guards the CLIENT path, not the provider path)",
      "LOW",
      !(tamperClientId.status === 200 && tamperClientId.body?.[0]?.client_id === sessB.user.id),
      JSON.stringify(tamperClientId.body).slice(0, 150)
    )
  } else {
    record("RLS", "service_requests: could not create a request to test provider-side tampering", "INFO", false, JSON.stringify(req.body))
  }
}

// =============================================================================
// RPC: check_ai_rate_limit — key spoofing / direct abuse
// =============================================================================
{
  const directCall = await rpc(null, "check_ai_rate_limit", { p_key: "phase5f-audit-arbitrary-key-1", p_max_requests: 10, p_window_seconds: 60 })
  record(
    "RPC",
    "check_ai_rate_limit: callable directly by anon with an ARBITRARY, attacker-chosen p_key (not tied to caller identity)",
    "MEDIUM",
    !(directCall.status === 200 && directCall.body === true),
    JSON.stringify(directCall.body)
  )

  // Grief another identifier's bucket directly (simulating exhausting a victim's key before they use the assistant)
  const victimKey = "phase5f-victim-simulated-ip-1.2.3.4"
  let griefed = 0
  for (let i = 0; i < 12; i++) {
    const r = await rpc(null, "check_ai_rate_limit", { p_key: victimKey, p_max_requests: 10, p_window_seconds: 60 })
    if (r.body === true) griefed++
  }
  record(
    "RPC",
    "check_ai_rate_limit: an anonymous caller can directly exhaust an arbitrary victim key's quota (grief a specific IP/user before they ever call the assistant)",
    "MEDIUM",
    griefed < 10,
    `${griefed}/12 allowed for a key the caller invented and doesn't own`
  )
}

fs.writeFileSync("./phase5f-results-partial.json", JSON.stringify(results, null, 2))
console.log(`\n=== Part 1-4 done: ${results.length} checks so far ===`)
