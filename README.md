# Stripe Card Validation App

Production-focused Stripe SetupIntent application for ultra-fast card onboarding:
- Public page accepts only `email` + Stripe Elements card input
- Creates or reuses Stripe Customer by email
- Confirms SetupIntent on client via `stripe.confirmCardSetup(clientSecret)`
- Persists safe operational metadata only
- Creates subscription only after successful verification
- Internal dashboard for staff visibility

## Tech Stack

- Next.js (App Router, TypeScript)
- Stripe official SDK (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`)
- Prisma + SQLite
- Zod validation
- Vitest + Testing Library

## Folder Structure

- `src/app/page.tsx` public validation flow
- `src/app/dashboard/page.tsx` internal dashboard
- `src/app/api/customer-or-setup-intent/route.ts`
- `src/app/api/finalize-validation/route.ts`
- `src/app/api/validation-result-webhook/route.ts`
- `src/app/api/validations/route.ts`
- `src/app/api/validations/[id]/route.ts`
- `src/lib/validation-service.ts` core Stripe + persistence orchestration
- `prisma/schema.prisma` database schema

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set Stripe test keys and webhook secret

```bash
cp .env.example .env
```

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open:
- Public page: `http://localhost:3000`
- Internal dashboard: `http://localhost:3000/dashboard`

Dashboard uses HTTP Basic Auth via:
- `DASHBOARD_BASIC_AUTH_USER`
- `DASHBOARD_BASIC_AUTH_PASS`

## API Endpoints

- `POST /api/customer-or-setup-intent`
  - Input: `{ email }`
  - Output: `{ customerId, setupIntentId, clientSecret }`
- `POST /api/finalize-validation`
  - Input: `{ setupIntentId, email }`
  - Retrieves latest SetupIntent from Stripe, persists verification, and creates subscription when verification succeeds
- `POST /api/validation-result-webhook`
  - Stripe webhook receiver for `setup_intent.succeeded` and `setup_intent.setup_failed`
- `GET /api/validations`
  - Latest validation records (protected)
- `GET /api/validations/:id`
  - Single validation record (protected)

## Test Instructions

```bash
npm run lint
npm run test
npm run build
```

## Stripe test-mode verification (detailed)

See [`docs/STRIPE_TEST_MODE.md`](./docs/STRIPE_TEST_MODE.md) for step-by-step checks, 3DS return URL behavior, and Arabic notes.

## Stripe Test-Mode Validation (quick)

Use Stripe test cards in the hosted page:
- Success: `4242 4242 4242 4242`
- Authentication required: `4000 0025 0000 3155`
- Card declined: `4000 0000 0000 9995`

For webhook testing:
```bash
stripe listen --forward-to localhost:3000/api/validation-result-webhook
```

## Security Controls Included

- No raw PAN/CVC handling on backend
- SetupIntent-only flow for card setup
- 3DS policy set to automatic (`payment_method_options.card.request_three_d_secure = "automatic"`)
- Input validation (Zod)
- Same-origin checks for public POST APIs
- Rate limiting on public endpoints
- Per-email and per-IP abuse guard (failed-attempt blocking)
- Basic auth on dashboard and validation read APIs
- Sensitive key redaction in logs
- Secure response headers via middleware

## Deploy Notes

1. Use managed **PostgreSQL** in production (required for Vercel).
2. Set all required environment variables in Vercel:
   - `DATABASE_URL`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`
   - `DASHBOARD_BASIC_AUTH_USER`
   - `DASHBOARD_BASIC_AUTH_PASS`
   - `RATE_LIMIT_WINDOW_MS`
   - `RATE_LIMIT_MAX_REQUESTS`
   - `MAX_FAILED_ATTEMPTS`
   - `BLOCK_DURATION_MINUTES`
3. Push schema once on production DB (from trusted terminal):
   - `npm run prisma:push`
4. Configure Stripe webhook endpoint:
   - `https://your-domain/api/validation-result-webhook`
5. Ensure HTTPS is enforced at platform edge.
6. Restrict dashboard access to internal staff/VPN where possible.

## Publish On Vercel

1. Connect repository in Vercel Dashboard (or use CLI).
2. Root directory: `card-validation-app`
3. Build command: `npm run build`
4. Install command: `npm install`
5. Add all environment variables listed above.
6. Deploy.
7. After deploy, set Stripe webhook URL to your Vercel domain endpoint and copy webhook secret to `STRIPE_WEBHOOK_SECRET`.

## Subscription Activation

After card verification (`SetupIntent: succeeded`), backend creates a subscription using:
- `STRIPE_PRICE_ID`
- saved `stripePaymentMethodId`
- `payment_behavior: "error_if_incomplete"`

Access remains blocked until verification and subscription activation both succeed.
