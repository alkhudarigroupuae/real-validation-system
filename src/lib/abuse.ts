import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

type Scope = "email" | "ip";

const upsertFailure = async (scope: Scope, key: string, now: Date) => {
  const env = getServerEnv();
  const record = await prisma.verificationGuard.upsert({
    where: { scope_key: { scope, key } },
    update: {
      failedAttempts: { increment: 1 },
      lastFailureAt: now,
    },
    create: {
      scope,
      key,
      failedAttempts: 1,
      lastFailureAt: now,
    },
  });

  if (record.failedAttempts >= env.MAX_FAILED_ATTEMPTS) {
    await prisma.verificationGuard.update({
      where: { scope_key: { scope, key } },
      data: {
        blockedUntil: new Date(now.getTime() + env.BLOCK_DURATION_MINUTES * 60_000),
      },
    });
  }
};

const resetGuard = async (scope: Scope, key: string) => {
  await prisma.verificationGuard.upsert({
    where: { scope_key: { scope, key } },
    update: {
      failedAttempts: 0,
      blockedUntil: null,
      lastFailureAt: null,
    },
    create: {
      scope,
      key,
      failedAttempts: 0,
    },
  });
};

const readGuard = async (scope: Scope, key: string) =>
  prisma.verificationGuard.findUnique({
    where: { scope_key: { scope, key } },
  });

export const assertNotBlocked = async (email: string, ip: string) => {
  const now = new Date();
  const [emailGuard, ipGuard] = await Promise.all([
    readGuard("email", email),
    readGuard("ip", ip),
  ]);

  const blockedUntil = [emailGuard?.blockedUntil, ipGuard?.blockedUntil]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
    return {
      blocked: true,
      retryAfterMs: blockedUntil.getTime() - now.getTime(),
    };
  }

  return { blocked: false, retryAfterMs: 0 };
};

export const registerVerificationOutcome = async (
  email: string,
  ip: string,
  succeeded: boolean,
) => {
  const now = new Date();
  if (succeeded) {
    await Promise.all([resetGuard("email", email), resetGuard("ip", ip)]);
    return;
  }

  await Promise.all([upsertFailure("email", email, now), upsertFailure("ip", ip, now)]);
};
