// Rewrite/server/utils/sendEmail.js
import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // 1. Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER, // your email from .env
            pass: process.env.EMAIL_PASSWORD, // your email app password from .env
        },
    });

    // 2. Define the email options
    const mailOptions = {
        from: `Draft App <${process.env.EMAIL_USER}>`, // sender address
        to: options.email, // list of receivers
        subject: options.subject, // Subject line
        text: options.message, // plain text body
        html: options.html // html body
    };

    // 3. Send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
        // In a real app, you might want to handle this error more gracefully
        // e.g., by logging to a service or notifying an admin.
        throw new Error('Email could not be sent');
    }
};

export default sendEmail;
