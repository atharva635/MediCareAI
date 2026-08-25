import nodemailer from "nodemailer";

/**
 * Sends an email notification. Fallback to CLI simulation if SMTP variables are not set.
 */
export const sendEmailNotification = async ({ to, subject, text }) => {
  // Pretty console logging for presentations and local debugging
  const logWidth = 60;
  const divider = "─".repeat(logWidth - 2);
  
  console.log("\n" + `┌${divider}┐`);
  console.log(`│ ${"📧 MEDICARE AI EMAIL NOTIFICATION".padEnd(logWidth - 4)} │`);
  console.log(`├${divider}┤`);
  console.log(`│ TO:      ${to.padEnd(logWidth - 13)} │`);
  console.log(`│ SUBJECT: ${subject.padEnd(logWidth - 13)} │`);
  console.log(`├${divider}┤`);
  console.log(`│ CONTENT:                                                   │`);
  
  // Format body lines
  const lines = text.split("\n");
  for (const line of lines) {
    // If the line is longer than padding, chunk it or just display it
    let remaining = line;
    while (remaining.length > logWidth - 6) {
      const chunk = remaining.substring(0, logWidth - 6);
      console.log(`│   ${chunk.padEnd(logWidth - 6)}   │`);
      remaining = remaining.substring(logWidth - 6);
    }
    console.log(`│   ${remaining.padEnd(logWidth - 6)}   │`);
  }
  console.log(`└${divider}┘\n`);

  // SMTP Settings check
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: port === "465",
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: `"MediCare AI" <${user}>`,
        to,
        subject,
        text
      });
      console.log("📨 Email sent successfully via SMTP.");
    } catch (err) {
      console.error("❌ Failed to send email via SMTP:", err.message);
    }
  } else {
    console.log("ℹ️ SMTP credentials not found in env, email simulated successfully in logs.");
  }
};
