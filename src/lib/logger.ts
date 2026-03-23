const SENSITIVE_KEYS = [
  "number",
  "cvc",
  "card",
  "client_secret",
  "authorization",
  "stripe_secret_key",
];

const redact = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);

  const output: Record<string, unknown> = {};
  for (const [key, current] of Object.entries(value)) {
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      output[key] = "[REDACTED]";
    } else if (typeof current === "object") {
      output[key] = redact(current);
    } else {
      output[key] = current;
    }
  }
  return output;
};

export const logInfo = (message: string, context?: Record<string, unknown>) => {
  // Keep logs structured while preventing accidental sensitive leakage.
  console.info(message, context ? redact(context) : undefined);
};

export const logError = (message: string, context?: Record<string, unknown>) => {
  console.error(message, context ? redact(context) : undefined);
};
