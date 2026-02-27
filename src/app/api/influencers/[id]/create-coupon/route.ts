import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createShopifyCoupon, getShopifyAccessToken } from '@/lib/shopify-oauth';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

/**
 * POST /api/influencers/[id]/create-coupon
 * Create a coupon for an influencer and send email notification
 * Body: { code: "VECINO_JOAO_10" }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check Shopify OAuth connection
    const accessToken = await getShopifyAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Shopify não está conectado. Vá a Definições > Shopify Integration para autenticar.' },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { code, workflowId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    // Fetch influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id },
    });

    if (!influencer) {
      return NextResponse.json(
        { success: false, error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Check if coupon already exists in database
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'Este código de cupom já existe na base de dados' },
        { status: 400 }
      );
    }

    // IMPORTANT: Create in Shopify FIRST using OAuth, only then save to database
    let shopifyResult;
    try {
      shopifyResult = await createShopifyCoupon(
        code.toUpperCase(),
        10
      );
    } catch (shopifyError: any) {
      logger.error('Shopify coupon creation failed:', shopifyError);
      return NextResponse.json(
        { success: false, error: 'Falha ao criar cupom na Shopify: ' + shopifyError.message },
        { status: 502 }
      );
    }

    // Only save to database after successful Shopify creation
    let coupon;
    try {
      coupon = await prisma.coupon.create({
        data: {
          code: code.toUpperCase(),
          discountType: 'PERCENTAGE',
          discountValue: 10,
          influencerId: id,
          shopifyId: shopifyResult.priceRuleId, // Using priceRuleId from OAuth REST API
        },
        include: {
          influencer: true,
        },
      });

      // Also update workflow with coupon code if workflowId provided
      if (workflowId) {
        try {
          await prisma.partnershipWorkflow.update({
            where: { id: workflowId },
            data: { couponCode: code.toUpperCase() },
          });
        } catch (workflowError: any) {
          // Log but don't fail if workflow update fails
          logger.warn(`Failed to update workflow ${workflowId} with coupon: ${workflowError.message}`);
        }
      }
    } catch (dbError: any) {
      // If database fails, we have a orphaned Shopify coupon
      // Log this for manual cleanup
      logger.error('Database save failed after Shopify creation:', dbError);
      logger.error(`ORPHANED SHOPIFY COUPON: ${code.toUpperCase()} with priceRuleId ${shopifyResult.priceRuleId}`);
      
      return NextResponse.json(
        { success: false, error: 'Cupom criado na Shopify mas falha ao guardar na BD. Contacte admin.' },
        { status: 500 }
      );
    }

    // Send email to influencer (optional - requires email service configuration)
    logger.info(`Coupon ${code.toUpperCase()} created for influencer ${influencer.name}`);

    // Helper function to serialize BigInt values
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
          return obj.map(serializeBigInt);
        }
        const result: any = {};
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key]);
        }
        return result;
      }
      return obj;
    };

    // Serialize the entire coupon object
    const serializedCoupon = serializeBigInt(coupon);

    return NextResponse.json({
      success: true,
      coupon: serializedCoupon,
      message: ` Cupom ${code.toUpperCase()} criado com sucesso!`,
    });
  } catch (error) {
    logger.error('POST /api/influencers/[id]/create-coupon failed', error);
    return handleApiError(error);
  }
}
