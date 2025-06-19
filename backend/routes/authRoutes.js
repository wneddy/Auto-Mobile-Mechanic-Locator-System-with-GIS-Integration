const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const multer = require('multer'); 
const User = require('../models/User'); // Adjust the path if necessary
const VehicleOwnerProfiles = require('../models/VehicleOwnerProfiles'); 
const MechanicProfiles = require('../models/MechanicProfiles');
const AdminProfile = require("../models/AdminProfile")
const vehicleOwnerRoutes = require('./vehicleOwnerRoutes'); // Updated import
const authMiddleware = require('../middleware/authMiddleware'); // Adjust the path as necessary
const { sendActivationEmail, sendResetEmail } = require('../utils/emailService'); // Import the email function
const { Op } = require('sequelize'); // Add this line at the top with your other imports
const path = require('path');
const validateToken = require('../middleware/validateToken');

const router = express.Router();

// User Registration Route
router.post('/register', async (req, res) => {
    // Destructure the required fields from req.body
    const { email, phone, password, confirmPassword, user_type } = req.body;

    // Validate input fields
    if (!email || !phone || !password || !confirmPassword || !user_type) {
        return res.status(400).json({ message: "All fields are required." });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
    }

    try {
        // Check if user already exists
        const existingUser  = await User.findOne({ where: { email } });
        if (existingUser ) {
            return res.status(400).json({ message: "Email is already in use." });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate activation token
        const activationToken = crypto.randomBytes(32).toString('hex');

        // Create new user
        const newUser  = await User.create({
            email,
            phone,
            password: hashedPassword,
            user_type,
            activationToken,
            isActive: false // Set the account as inactive initially
        });

        // Send activation email
        const activationLink = `http://localhost:5501/api/auth/activate/${activationToken}`;
        await sendActivationEmail(email, activationLink); // Call the email function

        res.status(201).json({
            message: "User  registered successfully! Please check your email to activate your account."
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Account Activation Route
router.get('/activate/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // Find the user with the matching activation token
        const user = await User.findOne({ where: { activationToken: token } });

        if (!user) {
            return res.status(400).json({ message: "Invalid activation token." });
        }

        // Optional: Check if the token has expired
        // Assuming you have an expiration field in your User model
        // if (user.activationTokenExpiration && user.activationTokenExpiration < new Date()) {
        //     return res.status(400).json({ message: "Activation token has expired." });
        // }

        // Activate the user account
        user.isActive = true; // Set the account as active
        user.activationToken = null; // Clear the activation token
        // Optional: Clear the expiration field if you implemented it
        // user.activationTokenExpiration = null;
        await user.save(); // Save the changes

        // Redirect to the login page with a success message
        res.redirect('/login.html?message=Account activated successfully!');
    } catch (error) {
        console.error("Activation error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// User Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("🔹 Login attempt for email:", email);

        // Find the user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log("❌ User not found.");
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Check if the account is activated
        if (!user.isActive) {
            console.log("⚠ Account is not activated.");
            return res.status(403).json({ message: "Account is not activated. Please check your email or spam folder." });
        }

        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Password does not match.");
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Check if there is an existing token
        let token;
        if (user.currentToken) {
            // If a token exists, refresh it
            token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
            console.log('Refreshing existing token:', token);
        } else {
            // Generate a new JWT token
            token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
            console.log('Generated new token:', token);
        }

        // Store the token in the currentToken field of the user
        await User.update({ currentToken: token }, { where: { id: user.id } });

        let redirectUrl; // Variable to store the appropriate redirection path

        // Determine user type and check profile completion
        switch (user.user_type) {
            case 'vehicle-owner': {
                console.log("🔍 Checking vehicle-owner profile completion...");

                // Check if the personal profile exists
                const profile = await VehicleOwnerProfiles.findOne({ where: { user_id: user.id } });

                if (!profile) {
                    redirectUrl = "/public/vehicle-owner-profile-creator.html";
                    console.log("➡ Redirecting: Personal profile creation required.");
                    break;
                }

                // If all steps are completed, go to the dashboard
                redirectUrl = "/public/home.html";
                console.log("✅ Profile completed. Redirecting to dashboard.");
                break;
            }

            case 'vendor': {
                const existingProfile = await VendorProfile.findOne({ where: { user_id: user.id } });
                redirectUrl = existingProfile ? "/vendor-home.html" : "/vendor-profile-creation.html";
                break;
            }

            case 'mechanic': {
                const profile = await MechanicProfiles.findOne({ where: { user_id: user.id } });

                if (!profile) {
                    redirectUrl = "/public/mechanic-profile-creator.html";
                    console.log("➡ Redirecting: Personal profile creation required.");
                    break;
                }

                // If all steps are completed, go to the dashboard
                redirectUrl = "/public/mechanic-dashboard.html";
                console.log("✅ Profile completed. Redirecting to dashboard.");
                break;
            }

            case 'admin': {
                const profile = await AdminProfile.findOne({ where: { user_id: user.id } });

                if (!profile) {
                    redirectUrl = "/public/admin-profile-creator.html";
                    console.log("➡ Redirecting: Personal profile creation required.");
                    break;
                }

                // If all steps are completed, go to the dashboard
                redirectUrl = "/public/admin-dashboard.html";
                console.log("✅ Profile completed. Redirecting to dashboard.");
                break;
            }

            default:
                console.log("❓ Unknown user type.");
                return res.status(400).json({ message: "Unknown user type." });
        }

        console.log(`✅ Successful login. Redirecting to: ${redirectUrl}`);

        // Send JSON response with user_id, redirect link, and token
        return res.json({ 
            success: true,
            user_id: user.id,
            redirect: redirectUrl,
            token // Include the token in the response
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ message: "An error occurred while logging in. Please try again." });
    }
});

// Route to get the current token for a user
router.get("/users/:userId/token", validateToken, async (req, res) => {
    try {
      console.log(`Token request received for user ID: ${req.params.userId}`)
      console.log(`Authenticated user ID: ${req.userId}`)
  
      // Check if the requested userId matches the authenticated user's ID
      if (req.userId != req.params.userId) {
        console.log(`User ID mismatch: ${req.userId} vs ${req.params.userId}`)
        return res.status(403).json({ message: "Unauthorized access to another user's token" })
      }
  
      const user = await User.findByPk(req.userId)
  
      if (!user) {
        console.log(`User not found with ID: ${req.userId}`)
        return res.status(404).json({ message: "User not found" })
      }
  
      console.log(`Token found for user: ${user.currentToken ? "Yes" : "No"}`)
  
      // Return the current token
      res.json({ currentToken: user.currentToken })
    } catch (error) {
      console.error("Error fetching user token:", error)
      res.status(500).json({ message: "Server error" })
    }
  })

// Simple endpoint to validate token
router.get('/validate', validateToken, (req, res) => {
    // If we get here, the token is valid (validateToken middleware passed)
    res.status(200).json({ valid: true });
  });
  
  // Token refresh endpoint
  router.post('/refresh-token', async (req, res) => {
    try {
      const { userId, currentToken } = req.body;
      
      // Find the user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify the current token matches what's stored
      if (user.currentToken !== currentToken) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      // Generate a new token
      const newToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Update the user's current token
      user.currentToken = newToken;
      await user.save();
      
      res.json({ token: newToken });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
/*
// Get user's current token
router.get("/users/:userId/token", validateToken, async (req, res) => {
    try {
      console.log(`Token request received for user ID: ${req.params.userId}`)
      console.log(`Authenticated user ID: ${req.userId}`)
  
      // Check if the requested userId matches the authenticated user's ID
      if (req.userId != req.params.userId) {
        console.log(`User ID mismatch: ${req.userId} vs ${req.params.userId}`)
        return res.status(403).json({ message: "Unauthorized access to another user's token" })
      }
  
      const user = await User.findByPk(req.userId)
  
      if (!user) {
        console.log(`User not found with ID: ${req.userId}`)
        return res.status(404).json({ message: "User not found" })
      }
  
      console.log(`Token found for user: ${user.currentToken ? "Yes" : "No"}`)
  
      // Return the current token
      res.json({ currentToken: user.currentToken })
    } catch (error) {
      console.error("Error fetching user token:", error)
      res.status(500).json({ message: "Server error" })
    }
});
*/
// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Specify the directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to the filename
    }
});

const upload = multer({ storage: storage }); // Create the multer instance

// Route to fetch vehicle owner profile by user ID
router.get('/getVehicleOwnerProfile/:userId', validateToken, async (req, res) => {
    const userId = req.params.userId; // Get user ID from route parameters

    try {
        // Fetch the vehicle owner profile from the database
        const profile = await VehicleOwnerProfiles.findOne({
            where: { user_id: userId } // Assuming user_id is the foreign key in the VehicleOwnerProfiles table
        });

        // Check if the profile exists
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Return the profile data
        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching vehicle owner profile:', error);
        res.status(500).json({ message: 'An error occurred while fetching the profile' });
    }
});

// Get Mechanic Profile
router.get('/auth/getMechanicProfile/:id', validateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [mechanic] = await db.query('SELECT * FROM mechanics WHERE user_id = ?', [id]);
        if (!mechanic.length) return res.status(404).json({ message: 'Mechanic not found' });
        res.json(mechanic[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});

// Route to get user type
router.get('/type', validateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId); // Assuming req.userId is set by the validateToken middleware
        if (!user) {
            return res.status(404).json({ message: 'User  not found' });
        }
        res.status(200).json({ user_type: user.user_type });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user type', error });
    }
});

// DELETE route to delete a user profile
router.delete('/delete-profile/:userId', validateToken, async (req, res) => {
    const userId = req.userId; // Get user ID from the validated token

    try {
        const user = await User.findByPk(userId); // Find the user by ID
        console.log('User  found:', user);
        if (!user) {
            return res.status(404).json({ message: 'User  not found' });
        }

        await user.destroy(); // Delete the user
        res.status(200).json({ message: 'Profile deleted successfully.' });
    } catch (err) {
        console.error('Error deleting profile:', err);
        res.status(500).json({ message: 'Failed to delete profile.' });
    }
});

router.get('/profile/:userId', validateToken, async (req, res) => {
    const userId = req.params.userId; // Get user ID from the request parameters

    try {
        const profile = await VehicleOwnerProfiles.findOne({ where: { user_id: userId } });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.status(200).json(profile);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
});

// Route to fetch user by ID
router.get('/user/id/:id', async (req, res) => {
    const userId = req.params.id; // Get user ID from route parameters
    try {
        const user = await User.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User  not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'An error occurred while fetching the user' });
    }
});

// Use the vehicle owner profile routes
router.use('/vehicle-owner', vehicleOwnerRoutes);

// Reset Password Route
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    console.log("Received token:", token); // Log the received token
    console.log("Received new password:", newPassword); // Log the new password

    try {
        const user = await User.findOne({
            where: {
                resetToken: token,
                resetTokenExpiration: { [Op.gt]: Date.now() } // Check if token is still valid
            }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        // Hash the new password
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetToken = null; // Clear the reset token
        user.resetTokenExpiration = null; // Clear the expiration
        await user.save();

        // Respond with a success message and the login URL
        res.status(200).json({
            message: "Password has been reset successfully.",
            loginUrl: "http://localhost:5501/login.html" // Adjust the URL as necessary
        });
    } catch (error) {
        console.error("Error resetting password:", error); // Log the error details
        res.status(500).json({ message: "An error occurred while resetting the password.", error: error.message });
    }
});

// Logout Route
router.post('/logout', async (req, res) => {
    try {
        // Clear any session data if using sessions (not applicable since you're not using tokens)
        req.session.destroy();

        res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ success: false, message: 'Logout failed. Please try again.' });
    }
});

// Protected Route Example
router.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({ message: "This is a protected route.", userId: req.userId });
});

module.exports = router;
