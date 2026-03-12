const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

console.log("BREVO_API_KEY present?", !!process.env.BREVO_API_KEY);
console.log("BREVO_API_KEY length:", process.env.BREVO_API_KEY?.length);

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const mailSender = async (email, title, body) => {
  const sendSmtpEmail = {
    sender: {
      email: process.env.BREVO_FROM_EMAIL,
      name: process.env.BREVO_FROM_NAME || "StudyNotion",
    },
    to: [{ email }],
    subject: title,
    htmlContent: body,
  };

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Brevo email sent:", data?.messageId || data);
    return data;
  } catch (error) {
    console.error("Brevo API email error:", error.response?.text || error);
    throw error;
  }
};

module.exports = mailSender;