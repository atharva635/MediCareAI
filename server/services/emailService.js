import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmailNotification = async ({ to, subject, text }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "MediCare AI <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return;
    }

    console.log("📨 Email sent successfully:", data.id);
  } catch (err) {
    console.error("❌ Email failed:", err.message);
  }
};