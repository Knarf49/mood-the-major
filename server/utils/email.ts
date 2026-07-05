import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export function generateResetCode(): string {
  // 6-digit numeric code, easy for a user to type
  return crypto.randomInt(100000, 999999).toString();
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function sendResetCodeEmail(to: string, code: string) {
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM || "no-reply@yourapp.com",
    to,
    subject: "Your password reset code",
    text: `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`,
  });

  if (error) {
    console.error("[email] Resend failed to send reset code:", error);
    throw new Error("Failed to send reset email");
  }
}

export async function sendVerificationEmail(to: string, code: string) {
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM || "no-reply@yourapp.com",
    to,
    subject: "Verify your email",
    text: `Your verification code is ${code}. It expires in 15 minutes.`,
  });

  if (error) {
    console.error("[email] Resend failed to send verification code:", error);
    throw new Error("Failed to send verification email");
  }
}
