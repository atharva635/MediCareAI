import { Resend } from "resend";

// Setup Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmailNotification = async ({ to, subject, text, html }) => {
  try {
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
};