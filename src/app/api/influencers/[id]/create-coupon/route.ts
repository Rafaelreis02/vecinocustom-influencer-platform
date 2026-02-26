import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCoupon } from '@/lib/shopify';
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
    // Check Shopify configuration
    if (!process.env.SHOPIFY_SHOP_DOMAIN || !process.env.SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Shopify not configured. Missing: ' + 
          [!process.env.SHOPIFY_SHOP_DOMAIN && 'SHOPIFY_SHOP_DOMAIN', !process.env.SHOPIFY_ACCESS_TOKEN && 'SHOPIFY_ACCESS_TOKEN'].filter(Boolean).join(', ') },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { code } = body;

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

    // IMPORTANT: Create in Shopify FIRST, only then save to database
    let shopifyResult;
    try {
      shopifyResult = await createCoupon({
        title: `Cupom ${code} - ${influencer.name}`,
        code: code.toUpperCase(),
        discountPercentage: 10,
      });
    } catch (shopifyError: any) {
      logger.error('Shopify coupon creation failed:', shopifyError);
      return NextResponse.json(
        { success: false, error: 'Falha ao criar cupom na Shopify: ' + shopifyError.message },
        { status: 502 }
      );
    }

    if (!shopifyResult.success) {
      return NextResponse.json(
        { success: false, error: 'Shopify não confirmou a criação do cupom' },
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
          shopifyId: shopifyResult.coupon.id,
        },
        include: {
          influencer: true,
        },
      });
    } catch (dbError: any) {
      // If database fails, we have a orphaned Shopify coupon
      // Log this for manual cleanup
      logger.error('Database save failed after Shopify creation:', dbError);
      logger.error(`ORPHANED SHOPIFY COUPON: ${code.toUpperCase()} with ID ${shopifyResult.coupon.id}`);
      
      return NextResponse.json(
        { success: false, error: 'Cupom criado na Shopify mas falha ao guardar na BD. Contacte admin.' },
        { status: 500 }
      );
    }

    // Send email to influencer (optional - requires email service configuration)
    logger.info(`Coupon ${code.toUpperCase()} created for influencer ${influencer.name}`);

    return NextResponse.json({
      success: true,
      coupon,
      message: ` Cupom ${code.toUpperCase()} criado com sucesso!`,
    });
  } catch (error) {
    logger.error('POST /api/influencers/[id]/create-coupon failed', error);
    return handleApiError(error);
  }
}
