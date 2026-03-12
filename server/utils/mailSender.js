const nodemailer = require("nodemailer");
require("dotenv").config();

const mailSender = async (email, title, body) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false, // true if you choose port 465 and want SSL
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    const options = {
      from: {
        name: process.env.BREVO_FROM_NAME || "StudyNotion",
        address: process.env.BREVO_FROM_EMAIL,
      },
      to: email,
      subject: title,
      html: body,
    };

    const info = await transporter.sendMail(options);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
};

module.exports = mailSender;