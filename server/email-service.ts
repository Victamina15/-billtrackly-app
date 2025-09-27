import { Resend } from 'resend';
import { config } from './config';

const resend = new Resend(config.RESEND_API_KEY);

export interface UserActivationEmailData {
  to: string;
  username: string;
  activationToken: string;
  activationUrl: string;
}

export class EmailService {
  private static readonly FROM_EMAIL = config.FROM_EMAIL;
  private static readonly DEV_MODE = config.NODE_ENV !== 'production';
  private static readonly DEV_EMAIL = 'robinsonsilverio1844@gmail.com'; // Owner's email for testing

  static isConfigured(): boolean {
    const hasApiKey = !!config.RESEND_API_KEY;
    const hasFromEmail = !!this.FROM_EMAIL;

    if (!hasApiKey) {
      console.error('❌ Email service not configured: RESEND_API_KEY is missing');
    }
    if (!hasFromEmail) {
      console.error('❌ Email service not configured: FROM_EMAIL is missing');
    }

    return hasApiKey && hasFromEmail;
  }

  static async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      console.log('🧪 Testing email service connection...');
      const testResult = await this.sendUserActivationEmail({
        to: this.DEV_EMAIL,
        username: 'Test User',
        activationToken: 'test-token',
        activationUrl: 'https://example.com/activate?token=test-token',
      });

      if (testResult) {
        console.log('✅ Email service test successful');
      } else {
        console.log('❌ Email service test failed');
      }

      return testResult;
    } catch (error) {
      console.error('💥 Email service test error:', error);
      return false;
    }
  }

  static async sendUserActivationEmail(data: UserActivationEmailData): Promise<boolean> {
    try {
      const { to, username, activationToken, activationUrl } = data;

      // In development mode, send to owner's email but include original recipient info
      const actualTo = this.DEV_MODE ? this.DEV_EMAIL : to;
      const actualSubject = this.DEV_MODE
        ? `[DEV MODE - for ${to}] Activate Your BillTracky Account`
        : 'Activate Your BillTracky Account';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Activate Your Account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button {
              display: inline-block;
              background: #4f46e5;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to BillTracky!</h1>
            </div>
            <div class="content">
              ${this.DEV_MODE ? `<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
                <strong>🚧 Development Mode:</strong> This email was originally intended for <strong>${to}</strong>
              </div>` : ''}
              <h2>Hello ${username},</h2>
              <p>Thank you for signing up for BillTracky. To complete your registration and activate your account, please click the button below:</p>

              <div style="text-align: center;">
                <a href="${activationUrl}" class="button">Activate Your Account</a>
              </div>

              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4f46e5;">${activationUrl}</p>

              <p>This activation link will expire in 24 hours for security reasons.</p>

              <p>If you didn't create an account with us, please ignore this email.</p>

              <p>Best regards,<br>The BillTracky Team</p>
            </div>
            <div class="footer">
              <p>This email was sent from BillTracky. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Welcome to BillTracky!

        Hello ${username},

        Thank you for signing up for BillTracky. To complete your registration and activate your account, please visit this link:

        ${activationUrl}

        This activation link will expire in 24 hours for security reasons.

        If you didn't create an account with us, please ignore this email.

        Best regards,
        The BillTracky Team
      `;

      const { data: result, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: actualTo,
        subject: actualSubject,
        html: htmlContent,
        text: textContent,
      });

      if (this.DEV_MODE && actualTo !== to) {
        console.log(`[DEV MODE] Email redirected from ${to} to ${actualTo}`);
      }

      if (error) {
        console.error('❌ Failed to send activation email:', {
          error,
          to: actualTo,
          originalTo: to,
          subject: actualSubject,
          devMode: this.DEV_MODE
        });

        // Enhanced error logging for common issues
        if (error.statusCode === 403) {
          console.error('🚫 Resend API Error: Domain verification required or recipient not allowed');
        } else if (error.statusCode === 401) {
          console.error('🔑 Resend API Error: Invalid API key');
        } else if (error.statusCode === 422) {
          console.error('📧 Resend API Error: Invalid email format or data');
        }

        return false;
      }

      console.log('✅ Activation email sent successfully:', {
        messageId: result?.id,
        to: actualTo,
        originalTo: to,
        redirected: actualTo !== to,
        devMode: this.DEV_MODE
      });
      return true;
    } catch (error) {
      console.error('💥 Unexpected error sending activation email:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        to: data.to,
        devMode: this.DEV_MODE
      });
      return false;
    }
  }

  static async sendPasswordResetEmail(to: string, username: string, resetUrl: string): Promise<boolean> {
    try {
      // In development mode, send to owner's email but include original recipient info
      const actualTo = this.DEV_MODE ? this.DEV_EMAIL : to;
      const actualSubject = this.DEV_MODE
        ? `[DEV MODE - for ${to}] Reset Your BillTracky Password`
        : 'Reset Your BillTracky Password';
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button {
              display: inline-block;
              background: #dc2626;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              ${this.DEV_MODE ? `<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
                <strong>🚧 Development Mode:</strong> This email was originally intended for <strong>${to}</strong>
              </div>` : ''}
              <h2>Hello ${username},</h2>
              <p>We received a request to reset your password for your BillTracky account. Click the button below to reset your password:</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>

              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>

              <p>This reset link will expire in 1 hour for security reasons.</p>

              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>

              <p>Best regards,<br>The BillTracky Team</p>
            </div>
            <div class="footer">
              <p>This email was sent from BillTracky. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Reset Your Password

        Hello ${username},

        We received a request to reset your password for your BillTracky account. Visit this link to reset your password:

        ${resetUrl}

        This reset link will expire in 1 hour for security reasons.

        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

        Best regards,
        The BillTracky Team
      `;

      const { data: result, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: actualTo,
        subject: actualSubject,
        html: htmlContent,
        text: textContent,
      });

      if (this.DEV_MODE && actualTo !== to) {
        console.log(`[DEV MODE] Password reset email redirected from ${to} to ${actualTo}`);
      }

      if (error) {
        console.error('❌ Failed to send password reset email:', {
          error,
          to: actualTo,
          originalTo: to,
          subject: actualSubject,
          devMode: this.DEV_MODE
        });

        // Enhanced error logging for common issues
        if (error.statusCode === 403) {
          console.error('🚫 Resend API Error: Domain verification required or recipient not allowed');
        } else if (error.statusCode === 401) {
          console.error('🔑 Resend API Error: Invalid API key');
        } else if (error.statusCode === 422) {
          console.error('📧 Resend API Error: Invalid email format or data');
        }

        return false;
      }

      console.log('✅ Password reset email sent successfully:', {
        messageId: result?.id,
        to: actualTo,
        originalTo: to,
        redirected: actualTo !== to,
        devMode: this.DEV_MODE
      });
      return true;
    } catch (error) {
      console.error('💥 Unexpected error sending password reset email:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        to,
        devMode: this.DEV_MODE
      });
      return false;
    }
  }
}