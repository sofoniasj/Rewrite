import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // 1. Create a transporter
    // For Gmail, use the App Password, not your login password.
    /*const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });*/
    /* const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "forkshoots@gmail.com",
    pass: process.env.GOOGLE_APP_PASSWORD,

  },
});
*/

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "forkshoots@gmail.com",
    pass: "ndhztdndldwuwwis",
  },
});

// Wrap in an async IIFE so we can use await.
(async () => {
  const info = await transporter.sendMail({
    from: '"Maddison Foo Koch" <maddison53@ethereal.email>',
    to: "bar@example.com, baz@example.com",
    subject: "Hello ✔",
    text: "Hello world?", // plain‑text body
    html: "<b>Hello world?</b>", // HTML body
  });

  console.log("Message sent:", info.messageId);
})();

    // 2. Define the email options
    const mailOptions = {
        from: `"Draft App" <${process.env.EMAIL_USER}>`, // Sender address
        to: options.email,
        subject: options.subject,
        text: options.message, // Plain text body
        html: options.html,    // HTML body
    };

    // 3. Send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent');
    }
};

export default sendEmail;