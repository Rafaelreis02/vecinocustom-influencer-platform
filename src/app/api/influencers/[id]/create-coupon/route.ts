import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCoupon } from '@/lib/shopify';
import nodemailer from 'nodemailer';

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

    // Check if coupon already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'Este código de cupom já existe' },
        { status: 400 }
      );
    }

    // Create coupon in Shopify (10% discount)
    const shopifyResult = await createCoupon({
      title: `Cupom ${code} - ${influencer.name}`,
      code: code.toUpperCase(),
      discountPercentage: 10,
    });

    if (!shopifyResult.success) {
      throw new Error('Failed to create coupon in Shopify');
    }

    // Save coupon to database
    const coupon = await prisma.coupon.create({
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

    // Send email to influencer (if credentials configured)
    try {
      if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
        await sendCouponEmail(influencer, code.toUpperCase());
      } else {
        console.log('Email credentials not configured, skipping email send');
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      coupon,
      message: `✅ Cupom ${code.toUpperCase()} criado com sucesso!`,
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Send coupon notification email to influencer
 */
async function sendCouponEmail(influencer: any, couponCode: string) {
  // Only send if email is available
  if (!influencer.email) {
    console.log(`No email for influencer ${influencer.name}, skipping email`);
    return;
  }

  // Create transporter (using Gmail or your email service)
  // For now, we'll use a placeholder - you need to configure your email service
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  const storeUrl = `https://${process.env.SHOPIFY_STORE_URL}`;
  const handle = influencer.tiktokHandle || influencer.instagramHandle || influencer.name;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .coupon-box { background: white; border: 3px solid #667eea; border-radius: 10px; padding: 25px; text-align: center; margin: 20px 0; }
        .coupon-code { font-size: 32px; font-weight: bold; font-family: monospace; color: #667eea; margin: 15px 0; }
        .discount-badge { display: inline-block; background: #28a745; color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Teu Cupom VecinoCustom está pronto!</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${handle}</strong>,</p>
          
          <p>O teu cupom de 10% desconto foi criado com sucesso! 🎉</p>
          
          <div class="coupon-box">
            <p style="margin-top: 0;">Código do Cupom:</p>
            <div class="coupon-code">${couponCode}</div>
            <div class="discount-badge">10% Desconto</div>
            <p style="margin-bottom: 0; color: #666;">Partilha com os teus seguidores!</p>
          </div>

          <h3>Como usar?</h3>
          <ul>
            <li>Partilha o código <strong>${couponCode}</strong> com os teus seguidores</li>
            <li>Eles usam o código no checkout da nossa loja</li>
            <li>Recebem 10% de desconto na compra 🎁</li>
          </ul>

          <h3>💰 Ganhas comissão!</h3>
          <p>Por cada venda realizada com este cupom, ganhas <strong>10% do valor da compra</strong> (excluindo portes de envio).</p>

          <p style="text-align: center; margin-top: 30px;">
            <a href="${storeUrl}" class="cta-button">Ver Loja →</a>
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="font-size: 14px; color: #666;">
            Se tiveres dúvidas, responde a este email. Estamos aqui para ajudar! 😊
          </p>
        </div>
        <div class="footer">
          <p>VecinoCustom Platform | ${new Date().getFullYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: influencer.email,
    subject: `✅ Teu Cupom VecinoCustom: ${couponCode}`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
}
