import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb?schema=public";
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_PRICE_ID = "price_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";
process.env.DASHBOARD_BASIC_AUTH_USER = "admin";
process.env.DASHBOARD_BASIC_AUTH_PASS = "pass";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_mock";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX_REQUESTS = "20";
process.env.MAX_FAILED_ATTEMPTS = "4";
process.env.BLOCK_DURATION_MINUTES = "30";
