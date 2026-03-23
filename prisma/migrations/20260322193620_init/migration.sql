-- CreateTable
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSetupIntentId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT,
    "status" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "Validation_stripeSetupIntentId_key" ON "Validation"("stripeSetupIntentId");

-- CreateIndex
CREATE INDEX "Validation_email_createdAt_idx" ON "Validation"("email", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Validation_status_createdAt_idx" ON "Validation"("status", "createdAt" DESC);
