import { NextRequest, NextResponse } from 'next/server';
import { getGmailAuth, sendEmail } from '@/lib/gmail';
import { logger } from '@/lib/logger';

// GET /api/test-email - Test email sending
export async function GET(req: NextRequest) {
  try {
    const testEmail = req.nextUrl.searchParams.get('to') || 'test@example.com';
    
    logger.info('[TEST] Starting email test', { to: testEmail });
    
    // Test 1: Simple email
    const auth = await getGmailAuth();
    
    logger.info('[TEST] Got Gmail auth');
    
    const result = await sendEmail(auth, {
      to: testEmail,
      subject: 'Test Email - VecinoCustom',
      body: `Hey there,

This is a test email from VecinoCustom.

If you can read this, the email system is working correctly!

Best regards,
VecinoCustom Team`,
    });
    
    logger.info('[TEST] Email sent successfully', { result });
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.id,
    });
  } catch (error: any) {
    logger.error('[TEST] Failed to send test email', {
      error: error.message,
      stack: error.stack,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
