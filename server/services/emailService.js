import nodemailer from "nodemailer";

// Setup NodeMailer SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmailNotification = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
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
};