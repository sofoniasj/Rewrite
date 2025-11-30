require("dotenv").config();
const nodemailer = require("nodemailer");

// Create transporter with Gmail + App Password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password from Google
  },
});

// Function to send verification email
async function sendVerificationEmail(to, token) {
  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify Your Email",
    html: `
      <h2>Verify Your Email</h2>
      <p>Click the link below to verify:</p>
      <a href="${verifyUrl}" target="_blank">
        ${verifyUrl}
      </a>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", result.messageId);
    return result;
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
}

module.exports = {
  sendVerificationEmail,
};
