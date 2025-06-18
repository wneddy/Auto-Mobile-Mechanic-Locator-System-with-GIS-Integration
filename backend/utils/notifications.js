// src/utils/notifications.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const twilio = require('twilio'); // Import Twilio for SMS
const MechanicProfiles = require('../models/MechanicProfiles'); // Adjust the path to your Mechanic model
const User = require('../models/User'); // Adjust the path to your User model

// Create a transporter for email using environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email service
    auth: {
        user: 'noreply.mechaniclocator@gmail.com', // Your email
        pass: 'msto dltq zhyv wrpx'  // Use the password from .env
    }
});

// Twilio configuration using environment variables
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN); // Use environment variables

// Define the route to notify a mechanic
router.post('/:mechanicId', async (req, res) => {
    const mechanicId = req.params.mechanicId;
    const { message } = req.body;

    // Validate the input
    if (!message) {
        return res.status(400).send('Message is required');
    }

    try {
        // Fetch mechanic details from the database
        const mechanic = await MechanicProfiles.findByPk(mechanicId, {
            include: {
                model: User, // Include the User model to get email and phone
                attributes: ['email', 'phone'] // Only fetch email and phone
            }
        });

        if (!mechanic) {
            return res.status(404).send('Mechanic not found');
        }

        // Send email notification
        const mailOptions = {
            from: 'noreply.mechaniclocator@gmail.com',
            to: mechanic.User.email, // Access the email from the associated User
            subject: 'New Service Request',
            text: `You have a new service request: ${message}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        // Send SMS notification
        const smsMessage = `New service request: ${message}`;
        await twilioClient.messages.create({
            body: smsMessage,
            from: process.env.TWILIO_PHONE_NUMBER, // Use the Twilio phone number from .env
            to: mechanic.User.phone // Access the phone from the associated User
        });

        // Respond with success
        res.status(200).send('Notification sent to the mechanic!');
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send('Failed to send notification. Please try again later.');
    }
});

module.exports = router; // Export the router