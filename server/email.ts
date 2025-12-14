import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const config = getEmailConfig();

  if (!config) {
    console.log("=== Email Preview (SMTP not configured) ===");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Text: ${options.text}`);
    console.log("============================================");
    return true;
  }

  try {
    const transporter = nodemailer.createTransport(config);
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || config.auth.user,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export function getPasswordResetEmailContent(resetUrl: string): { subject: string; text: string; html: string } {
  const subject = "Reset Your Password";
  
  const text = `
You requested to reset your password.

Click the link below to reset your password:
${resetUrl}

This link will expire in 30 minutes.

If you didn't request this, please ignore this email.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">Password Reset</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
    <p>You requested to reset your password.</p>
    <p>Click the button below to reset your password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
    </div>
    <p style="color: #666; font-size: 14px;">This link will expire in 30 minutes.</p>
    <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}
