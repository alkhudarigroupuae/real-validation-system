import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PRICE_ID: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  DASHBOARD_BASIC_AUTH_USER: z.string().min(1),
  DASHBOARD_BASIC_AUTH_PASS: z.string().min(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(12),
  MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(4),
  BLOCK_DURATION_MINUTES: z.coerce.number().int().positive().default(30),
});

const clientSchema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
});

let parsedServer: z.infer<typeof serverSchema> | null = null;
let parsedClient: z.infer<typeof clientSchema> | null = null;

export const getServerEnv = () => {
  if (parsedServer) return parsedServer;
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server environment: ${result.error.message}`);
  }
  parsedServer = result.data;
  return parsedServer;
};

export const getClientEnv = () => {
  if (parsedClient) return parsedClient;
  const result = clientSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid client environment: ${result.error.message}`);
  }
  parsedClient = result.data;
  return parsedClient;
};
