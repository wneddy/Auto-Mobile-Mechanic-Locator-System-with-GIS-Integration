// routes/mechanicProfileRoutes.js
const express = require('express');
const validateToken = require('../middleware/validateToken');
const {
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile,
} = require('../controllers/mechanicProfileController');
const { validateToken } = require('../middleware/validateToken');

const router = express.Router();

// Routes for mechanic profiles
router.post('/', validateToken, createProfile); // Create a new profile
router.get('/', validateToken, getProfile); // Get the logged-in user's profile
router.put('/', validateToken, updateProfile); // Update the logged-in user's profile
router.delete('/', validateToken, deleteProfile); // Delete the logged-in user's profile

module.exports = router;