// routes/vehicleOwnerRoutes.js
const express = require('express');
const validateToken = require('../middleware/validateToken');
const VehicleOwnerProfiles = require('../models/VehicleOwnerProfiles'); // Adjust the path as necessary
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken'); // Import JWT for token validation
const multer = require('multer'); // Import multer for file uploads
const path = require('path');
const router = express.Router();
const {
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile,
    getAllProfiles,
    adminDeleteProfile
} = require("../controllers/profileControllers");

// User routes
router.post("/profile", validateToken, createProfile); // Create a new profile
router.get("/profile", validateToken, getProfile); // Get the logged-in user's profile
router.put("/profile", validateToken, updateProfile); // Update the logged-in user's profile
router.delete("/profile", validateToken, deleteProfile); // Delete the logged-in user's profile

// Admin routes
router.get("/profiles", validateToken, getAllProfiles); // Admin can view all profiles
router.delete("/profiles/:userId", validateToken, adminDeleteProfile); // Admin can delete any user's profile

// Route to fetch vehicle owner profile by user ID
router.get('/getVehicleOwnerProfile/:userId', validateToken, async (req, res) => {
    const userId = req.params.userId; // Get user ID from route parameters

    try {
        // Fetch the vehicle owner profile from the database
        const profile = await VehicleOwnerProfiles.findOne({
            where: { user_id: userId } // Assuming user_id is the foreign key in the VehicleOwnerProfiles table
        });

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


router.post('/submit-profile', validateToken, upload.single('profile_picture'), [
    // Validation rules
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('county').notEmpty().withMessage('County is required'),
    body('sub_county').notEmpty().withMessage('Sub-county is required'),
    body('license_plate').notEmpty().withMessage('License plate is required'),
    body('make_model').notEmpty().withMessage('Make and model are required'),
    body('vehicle_type').notEmpty().withMessage('Vehicle type is required'),
    body('number_of_vehicles').isInt().withMessage('Number of vehicles must be an integer'),
    body('year_manufacture').isInt().withMessage('Year of manufacture must be an integer'),
    body('insurance_status').notEmpty().withMessage('Insurance status is required'),
], async (req, res) => {
    // Log incoming request data
    console.log('Incoming request body:', req.body);
    console.log('Uploaded file:', req.file);

    // Validate the request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    try {
        // Create a new vehicle owner profile
        const profileData = {
            ...req.body,
            user_id: req.userId, // Use the user ID from the validated token
            profile_picture: req.file ? req.file.path : null // Save the file path if a file was uploaded
        };

        console.log('Profile Data:', profileData); // Log profile data for debugging

        const profile = await VehicleOwnerProfiles.create(profileData);
        res.status(201).json({ message: 'Profile created successfully', profile });
    } catch (error) {
        console.error('Error creating profile:', error);
        res.status(500).json({ message: 'An error occurred while creating the profile' });
    }
});


module.exports = router;