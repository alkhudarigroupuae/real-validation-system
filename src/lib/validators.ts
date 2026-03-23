import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email")
  .max(255, "Email too long");

export const createIntentSchema = z.object({
  email: emailSchema,
});

export const finalizeValidationSchema = z
  .object({
    setupIntentId: z
      .string()
      .trim()
      .regex(/^seti_[a-zA-Z0-9]+$/, "Invalid SetupIntent ID"),
    // Optional: after 3DS redirect, client may only have setup_intent in URL;
    // server resolves email from SetupIntent.metadata when omitted.
    email: emailSchema.optional(),
  })
  .strict();
