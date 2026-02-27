import { prisma } from '@/lib/prisma';

async function cleanupMilaCoupon() {
  try {
    const code = 'VECINO_MILA_10';
    
    // Find and delete coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (coupon) {
      await prisma.coupon.delete({
        where: { id: coupon.id },
      });
      console.log(`✅ Coupon ${code} deleted from database`);
    } else {
      console.log(`ℹ️ Coupon ${code} not found in database`);
    }

    // Clear from workflows
    const result = await prisma.$executeRaw`
      UPDATE "partnership_workflows" 
      SET "couponCode" = NULL 
      WHERE "couponCode" = ${code}
    `;
    console.log(`✅ Cleared coupon from ${result} workflow(s)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupMilaCoupon();
