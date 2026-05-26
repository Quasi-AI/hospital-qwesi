import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { testEmailConnection, sendEmail } from '@/lib/notifications/email-provider';
import { testSMSConnection } from '@/lib/notifications/sms-provider';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can test connections
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { type, testEmail, testPhone } = body;

    if (type === 'email') {
      // Test connection
      const connectionResult = await testEmailConnection();
      
      if (!connectionResult.success) {
        return NextResponse.json({
          success: false,
          error: connectionResult.error,
        });
      }

      // If test email provided, send a test message
      if (testEmail) {
        const sendResult = await sendEmail({
          to: testEmail,
          subject: 'Test Email from HMS Notification System',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Test Email</h2>
              <p>This is a test email from your Hospital Management System.</p>
              <p>If you received this email, your email configuration is working correctly!</p>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                Sent at: ${new Date().toLocaleString()}
              </p>
            </div>
          `,
        });

        return NextResponse.json({
          success: sendResult.success,
          message: sendResult.success 
            ? 'Test email sent successfully' 
            : 'Failed to send test email',
          error: sendResult.error,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Email connection test successful',
      });
    }

    if (type === 'sms') {
      const result = await testSMSConnection(testPhone);
      
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? (testPhone ? 'Test SMS sent successfully' : 'SMS connection test successful')
          : 'SMS connection test failed',
        error: result.error,
      });
    }

    return NextResponse.json(
      { error: 'Invalid test type. Use "email" or "sms"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}
