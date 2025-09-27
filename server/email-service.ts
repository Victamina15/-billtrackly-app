import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface UserActivationEmailData {
  to: string;
  username: string;
  activationToken: string;
  activationUrl: string;
}

export class EmailService {
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  static async sendUserActivationEmail(data: UserActivationEmailData): Promise<boolean> {
    try {
      const { to, username, activationToken, activationUrl } = data;

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
        to,
        subject: 'Activate Your BillTracky Account',
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error('Failed to send activation email:', error);
        return false;
      }

      console.log('Activation email sent successfully:', result?.id);
      return true;
    } catch (error) {
      console.error('Error sending activation email:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(to: string, username: string, resetUrl: string): Promise<boolean> {
    try {
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
        to,
        subject: 'Reset Your BillTracky Password',
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error('Failed to send password reset email:', error);
        return false;
      }

      console.log('Password reset email sent successfully:', result?.id);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }
}