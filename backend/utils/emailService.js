const nodemailer = require('nodemailer');

// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email service
    auth: {
        user: 'noreply.mechaniclocator@gmail.com', // Your email
        pass: 'msto dltq zhyv wrpx' // Your email password or app password
    }
});

// Function to send activation email
const sendActivationEmail = (email, activationLink) => {
    const mailOptions = {
        from: 'noreply.mechaniclocator@gmail.com',
        to: email,
        subject: 'Account Activation',
        text: `Please click the following link to activate your account: ${activationLink}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('Error sending activation email:', error);
        }
        console.log('Activation email sent:', info.response);
    });
};

// Function to send password reset email
const sendResetEmail = (email, resetLink) => {
    const mailOptions = {
        from: 'noreply.mechaniclocator@gmail.com',
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the link to reset your password: ${resetLink}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('Error sending reset email:', error);
        }
        console.log('Reset email sent:', info.response);
    });
};

module.exports = { sendActivationEmail, sendResetEmail }; // Export both functions