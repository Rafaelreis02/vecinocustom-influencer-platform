# Shopify Integration - Setup Guide

## Overview

This integration connects the VecinoCustom Influencer Platform with Shopify to manage discount coupons and automatically calculate commissions from sales.

## Features

1. **OAuth Authentication** - Secure connection with Shopify store
2. **Coupon Management** - Create/delete discount coupons directly in Shopify
3. **Commission Tracking** - Automatically sync sales data and calculate influencer commissions
4. **Dashboard Integration** - Manage everything from the influencer detail page

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Shopify OAuth Credentials
SHOPIFY_STORE_URL="your-store.myshopify.com"
SHOPIFY_CLIENT_ID="your-client-id-here"
SHOPIFY_CLIENT_SECRET="<your-client-secret>"
NEXT_PUBLIC_BASE_URL="https://your-domain.com"

# Cron Job Protection
CRON_SECRET="<generate-random-secret>"
```

**Important:** The old `SHOPIFY_CLIENT_SECRET` was exposed. Generate a new one from your Shopify Partner Dashboard.

### 2. Database Migration

Run the Prisma migration to add required tables:

```bash
npm run db:migrate
```

This creates:
- `shopify_auth` table for storing OAuth tokens
- New fields on `coupons` table: `commissionRate`, `shopifyPriceRuleId`, `shopifyDiscountCodeId`

### 3. Connect Shopify

1. Navigate to **Dashboard → Settings**
2. Click **"Conectar Shopify"**
3. Authorize the required permissions:
   - `read_orders` - Read order data
   - `write_price_rules`, `read_price_rules` - Manage discount rules
   - `write_discounts`, `read_discounts` - Manage discount codes

### 4. Configure Vercel Cron (Production)

The commission sync runs automatically every 6 hours via Vercel Cron.

In your Vercel project settings:
1. Add the `CRON_SECRET` environment variable
2. The cron job is already configured in `vercel.json`

## Usage

### Creating a Coupon

1. Go to an influencer's detail page
2. In the **"Cupão Associado"** section:
   - Enter the coupon code (e.g., `VECINO_JOAO_10`)
   - Set discount percentage (e.g., 10%)
   - Set commission percentage (e.g., 15%)
3. Click **"Atribuir Cupom"**

The coupon is created in both:
- Shopify (as a price rule + discount code)
- Local database (for tracking)

### Deleting a Coupon

1. On the influencer page, click **"Apagar Cupão"**
2. Confirms deletion from both Shopify and database

### Commission Tracking

The system automatically:
1. Runs every 6 hours (Vercel Cron)
2. Fetches orders using each coupon from Shopify
3. Calculates commission: `(order_total - tax - shipping) × commission_rate`
4. Updates `totalSales` and `totalOrders` on coupon
5. Creates/updates `Payment` records for pending commissions

View commission data in the **"Histórico de Comissões"** section.

## API Endpoints

### OAuth Flow
- `GET /api/shopify/auth` - Initiate OAuth
- `GET /api/shopify/callback` - Handle OAuth callback

### Coupon Management
- `POST /api/influencers/[id]/coupon` - Create coupon
- `DELETE /api/influencers/[id]/coupon` - Delete coupon

### Status & Testing
- `GET /api/shopify/status` - Check connection status
- `GET /api/shopify/test` - Test API connection
- `POST /api/shopify/disconnect` - Disconnect Shopify

### Cron Job
- `GET /api/cron/sync-commissions` - Manual trigger (protected by `CRON_SECRET`)

## Business Rules

1. **One coupon per influencer** - Maximum of 1 active coupon per influencer
2. **Percentage discounts only** - All coupons use percentage-based discounts
3. **Commission calculation**: `(base_value - tax - shipping) × commission_rate%`
4. **To change coupon terms** - Delete the old coupon and create a new one

## Security

- OAuth flow with HMAC verification
- CSRF protection with state nonce
- Cron endpoints protected by secret token
- Access tokens stored securely in database

## Troubleshooting

### "Shopify not connected"
- Check if OAuth was completed successfully
- Verify `SHOPIFY_STORE_URL` matches the authorized shop
- Test connection in Settings page

### "Failed to create coupon"
- Ensure Shopify connection is active
- Check that coupon code is unique
- Verify API permissions (write_price_rules, write_discounts)

### Commission sync not working
- Verify `CRON_SECRET` is set correctly
- Check Vercel Cron logs
- Manually trigger: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/sync-commissions`

## Architecture

```
┌─────────────┐
│   Shopify   │
│    Store    │
└──────┬──────┘
       │ OAuth
       │ REST API
       ▼
┌─────────────┐
│  Platform   │
│   Backend   │
├─────────────┤
│ shopify-    │
│   oauth.ts  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │
├─────────────┤
│ ShopifyAuth │
│   Coupon    │
│   Payment   │
└─────────────┘
```

## Next Steps

- [ ] Add webhook support for real-time order updates
- [ ] Implement bulk coupon operations
- [ ] Add analytics dashboard for coupon performance
- [ ] Support for fixed amount discounts
