import { Resend } from "resend";
import nodemailer from "nodemailer";

// Setup Nodemailer SMTP Transporter as fallback
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmailNotification = async ({ to, subject, text, html }) => {
  // If Resend API Key is available, use Resend
  if (process.env.RESEND_API_KEY) {
    try {
      console.log("📨 Sending email via Resend API...");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress = process.env.EMAIL_FROM || "onboarding@resend.dev";
      const fromHeader = `MediCare AI <${fromAddress}>`;

      const data = await resend.emails.send({
        from: fromHeader,
        to,
        subject,
        text,
        html,
      });
      
      console.log("📨 Email sent successfully via Resend:", data);
      return data;
    } catch (err) {
      console.error("❌ Email failed via Resend:", err.message);
    }
  }

  // Otherwise, fall back to SMTP
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log("📨 RESEND_API_KEY missing. Falling back to SMTP...");
      const info = await smtpTransporter.sendMail({
        from: `"MediCare AI" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });
      
      console.log("📨 Email sent successfully via SMTP:", info.messageId);
      return info;
    } catch (err) {
      console.error("❌ Email failed via SMTP:", err.message);
    }
  }

  console.error("❌ Email sending failed: Neither Resend nor SMTP credentials are configured.");
};