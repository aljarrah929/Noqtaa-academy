import { Resend } from "resend";

const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";

function getResendCredentials(): { apiKey: string; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable not set");
  }

  return {
    apiKey,
    fromEmail: process.env.EMAIL_FROM || DEFAULT_FROM_EMAIL,
  };
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  return "http://localhost:5000";
}

export function verifyEmailConnection(): boolean {
  try {
    const { apiKey } = getResendCredentials();
    if (apiKey) {
      console.log("[Resend] Connection verified - API key configured");
      return true;
    }
    return false;
  } catch (error: any) {
    console.log("[Resend] Not configured:", error.message);
    return false;
  }
}

const EMAIL_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    console.log(`[Resend] Starting email send to ${options.to}...`);
    
    const { apiKey, fromEmail } = getResendCredentials();
    console.log(`[Resend] Using from address: ${fromEmail}`);
    
    const resend = new Resend(apiKey);

    const { data, error } = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
      EMAIL_TIMEOUT_MS,
      "Sending email"
    );

    if (error) {
      console.error("[Resend] EMAIL FAILED:", JSON.stringify(error));
      return false;
    }

    console.log(`[Resend] Email sent successfully to ${options.to}, ID: ${data?.id}`);
    return true;
  } catch (error: any) {
    console.error("[Resend] EMAIL FAILED:", error.message);
    return false;
  }
}

export function sendEmailInBackground(options: SendEmailOptions): void {
  console.log(`[Resend] Attempting to send email to ${options.to}...`);
  
  setImmediate(() => {
    sendEmail(options)
      .then((success) => {
        if (!success) {
          console.error(`[Resend] Background email to ${options.to} failed`);
        }
      })
      .catch((error) => {
        console.error(`[Resend] Background email error to ${options.to}:`, error.message);
      });
  });
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
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #999; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #999; font-size: 12px; word-break: break-all;">${resetUrl}</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}
