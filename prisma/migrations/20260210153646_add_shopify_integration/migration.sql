-- CreateTable
CREATE TABLE "shopify_auth" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_auth_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "shopifyPriceRuleId" TEXT,
ADD COLUMN     "shopifyDiscountCodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "shopify_auth_shop_key" ON "shopify_auth"("shop");
