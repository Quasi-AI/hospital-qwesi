import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

interface EmailConfig {
  provider: 'sendgrid' | 'smtp';
  enabled: boolean;
  sendgrid?: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    fromName: string;
  };
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  await dbConnect();
  const settings = await Settings.findOne({});
  
  if (!settings?.notificationProviders?.email) {
    return null;
  }
  
  return settings.notificationProviders.email as EmailConfig;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const config = await getEmailConfig();
    
    if (!config || !config.enabled) {
      return {
        success: false,
        error: 'Email notifications are not configured or disabled',
      };
    }
    
    if (config.provider === 'sendgrid' && config.sendgrid) {
      return await sendViaSendGrid(options, config.sendgrid);
    } else if (config.provider === 'smtp' && config.smtp) {
      return await sendViaSMTP(options, config.smtp);
    }
    
    return {
      success: false,
      error: 'No valid email provider configuration found',
    };
  } catch (error: any) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

async function sendViaSendGrid(
  options: EmailOptions,
  config: NonNullable<EmailConfig['sendgrid']>
): Promise<EmailResult> {
  try {
    sgMail.setApiKey(config.apiKey);
    
    const msg = {
      to: options.to,
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html,
    };
    
    const response = await sgMail.send(msg);
    
    return {
      success: true,
      messageId: response[0]?.headers?.['x-message-id'],
    };
  } catch (error: any) {
    console.error('SendGrid error:', error);
    return {
      success: false,
      error: error.response?.body?.errors?.[0]?.message || error.message || 'SendGrid error',
    };
  }
}

async function sendViaSMTP(
  options: EmailOptions,
  config: NonNullable<EmailConfig['smtp']>
): Promise<EmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
    
    const result = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html,
    });
    
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('SMTP error:', error);
    return {
      success: false,
      error: error.message || 'SMTP error',
    };
  }
}

export async function testEmailConnection(): Promise<EmailResult> {
  try {
    const config = await getEmailConfig();
    
    if (!config) {
      return {
        success: false,
        error: 'Email is not configured',
      };
    }
    
    if (config.provider === 'smtp' && config.smtp) {
      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.username,
          pass: config.smtp.password,
        },
      });
      
      await transporter.verify();
      return { success: true };
    }
    
    if (config.provider === 'sendgrid' && config.sendgrid) {
      // SendGrid doesn't have a verify method, so we just check if API key is set
      if (!config.sendgrid.apiKey) {
        return {
          success: false,
          error: 'SendGrid API key is not configured',
        };
      }
      return { success: true };
    }
    
    return {
      success: false,
      error: 'No valid email configuration found',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection test failed',
    };
  }
}
