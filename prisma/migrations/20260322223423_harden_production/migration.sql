-- CreateTable
CREATE TABLE "VerificationGuard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" DATETIME,
    "lastFailureAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Validation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSetupIntentId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionStatus" TEXT,
    "status" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "brand" TEXT,
    "last4" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Validation" ("brand", "createdAt", "email", "errorCode", "errorMessage", "expMonth", "expYear", "id", "last4", "requiresAction", "status", "stripeCustomerId", "stripePaymentMethodId", "stripeSetupIntentId", "updatedAt") SELECT "brand", "createdAt", "email", "errorCode", "errorMessage", "expMonth", "expYear", "id", "last4", "requiresAction", "status", "stripeCustomerId", "stripePaymentMethodId", "stripeSetupIntentId", "updatedAt" FROM "Validation";
DROP TABLE "Validation";
ALTER TABLE "new_Validation" RENAME TO "Validation";
CREATE UNIQUE INDEX "Validation_stripeSetupIntentId_key" ON "Validation"("stripeSetupIntentId");
CREATE UNIQUE INDEX "Validation_stripeSubscriptionId_key" ON "Validation"("stripeSubscriptionId");
CREATE INDEX "Validation_email_createdAt_idx" ON "Validation"("email", "createdAt" DESC);
CREATE INDEX "Validation_status_createdAt_idx" ON "Validation"("status", "createdAt" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "VerificationGuard_scope_key_key" ON "VerificationGuard"("scope", "key");
