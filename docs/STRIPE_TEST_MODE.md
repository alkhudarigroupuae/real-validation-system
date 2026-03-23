# Stripe test mode — verification guide

Use **Stripe Dashboard → Developers → Test mode** and **test API keys** only.

## Prerequisites

1. Copy `.env.example` → `.env` with `sk_test_…`, `pk_test_…`, `whsec_…` (from `stripe listen` or Dashboard webhook).
2. Run migrations: `npx prisma migrate dev`
3. Start app: `npm run dev`
4. (Optional) Webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/validation-result-webhook
   ```

## Dashboard access

- Open `http://localhost:3000/dashboard`
- HTTP Basic Auth: values from `DASHBOARD_BASIC_AUTH_USER` / `DASHBOARD_BASIC_AUTH_PASS`

## Card scenarios (Stripe official test cards)

| Scenario | Card number | Expected UX / DB `status` |
|----------|-------------|-----------------------------|
| Success | `4242 4242 4242 4242` | `succeeded` — card saved on Customer |
| 3DS / auth | `4000 0025 0000 3155` | May show challenge; after return → finalize; often `succeeded` or `requires_action` while pending |
| Declined | `4000 0000 0000 9995` | Decline / `card_error` or `requires_payment_method` |

Use any future **expiry**, any **CVC**, any **billing** fields Elements asks for (if any).

## What to verify each time

1. **Public page** (`/`) — only email + card; no PAN/CVC in Network tab to your API (only `setupIntentId` / `email` where applicable).
2. **Stripe Dashboard** — Customer has **default or attached** PaymentMethod after success (check Customer → Payment methods).
3. **Internal dashboard** — row shows correct `stripe_customer_id`, `setup_intent` id, `payment_method` id (if succeeded), `requires_action`, safe `brand`/`last4`/`exp`.
4. **Duplicate flow** — same email twice creates/reuses one Customer; new SetupIntent per “Continue” (idempotency key is per minute + IP).

## Redirect return (3DS)

After authentication, Stripe redirects to `/` with `?setup_intent=…&redirect_status=…`. The app calls `POST /api/finalize-validation` with **only** `setupIntentId`; email is read from **SetupIntent.metadata.email** (set when creating the intent).

## Do not fabricate outcomes

Always confirm status from:

- Stripe.js `confirmSetup` result and/or
- `SetupIntent` retrieved server-side and/or
- Webhook events (`setup_intent.succeeded` / `setup_intent.setup_failed`)

---

# وضع اختبار Stripe — دليل تحقق (عربي)

- استخدم **مفاتيح الاختبار** فقط (`sk_test` / `pk_test`).
- بعد كل سيناريو: راجع **لوحة Stripe** + **لوحة التطبيق الداخلية** للتأكد من تطابق الحالة.
- تدفق **إعادة التوجيه بعد 3DS**: التطبيق يعتمد على `setup_intent` في الرابط + البريد المحفوظ في **metadata** للـSetupIntent (لا يعتمد على حالة React بعد الرجوع).
