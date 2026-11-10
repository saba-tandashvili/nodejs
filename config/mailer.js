import nodemailer from "nodemailer";

const mailer = {
  async sendPasswordResetOtp(email, otp) {
    const host = process.env.SMTP_HOST?.trim();
    const from = process.env.SMTP_FROM?.trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const secureValue = process.env.SMTP_SECURE;
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;

    if (
      !host ||
      !from ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      (secureValue !== undefined && secureValue !== "true" && secureValue !== "false") ||
      Boolean(user) !== Boolean(password)
    ) {
      throw new Error("SMTP configuration is missing or invalid");
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: secureValue === "true",
      ...(user ? { auth: { user, pass: password } } : {}),
    });

    await transport.sendMail({
      from,
      to: email,
      subject: "Password reset code",
      text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
    });
  },
};

export default mailer;
