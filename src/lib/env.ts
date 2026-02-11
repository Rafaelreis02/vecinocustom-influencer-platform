import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Auth
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  
  // APIs
  ANTHROPIC_API_KEY: z.string().optional(),
  APIFY_TOKEN: z.string().optional(),
  
  // Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  
  // Shopify
  SHOPIFY_STORE_URL: z.string().optional(),
  SHOPIFY_CLIENT_ID: z.string().optional(),
  SHOPIFY_CLIENT_SECRET: z.string().optional(),
  
  // App
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  CRON_SECRET: z.string().optional(),
  
  // OpenClaw
  OPENCLAW_GATEWAY_URL: z.string().url().optional(),
  
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and export
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
