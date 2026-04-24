const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
     
});

const sendPasswordResetEmail = async (email, resetToken, userName) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
        from: `"Stamped App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hello ${userName},</p>
                <p>You requested to reset your password. Click the button below to reset it:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                    Reset Password
                </a>
                <p>Or copy and paste this link into your browser:</p>
                <p>${resetUrl}</p>
                <p>This link will expire in 30 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">Stamped App - Secure Authentication</p>
            </div>
        `,
        text: `
            Password Reset Request
            Hello ${userName},
            
            You requested to reset your password. Click the link below to reset it:
            ${resetUrl}
            
            This link will expire in 1 hour.
            
            If you didn't request this, please ignore this email.
            
            Stamped App - Secure Authentication
        `
    };
    
    await transporter.sendMail(mailOptions);
};

const sendPasswordResetSuccessEmail = async (email, userName) => {
    const mailOptions = {
        from: `"Stamped App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Successful',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Successful</h2>
                <p>Hello ${userName},</p>
                <p>Your password has been successfully reset.</p>
                <p>If you did not perform this action, please contact support immediately.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">Stamped App - Secure Authentication</p>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail, sendPasswordResetSuccessEmail };