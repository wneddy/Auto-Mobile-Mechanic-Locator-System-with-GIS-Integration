// controllers/mechanicProfileController.js
const MechanicProfiles = require('../models/MechanicProfiles');
const User = require("../models/User");

// Create a new mechanic profile
const createProfile = async (req, res) => {
    try {
        const profileData = {
            user_id: req.userId, // Assuming userId is set in the request by the auth middleware
            ...req.body,
        };

        const newProfile = await MechanicProfiles.create(profileData);
        res.status(201).json({ message: 'Mechanic profile created successfully!', profile: newProfile });
    } catch (error) {
        console.error('Error creating mechanic profile:', error);
        res.status(500).json({ message: 'Error creating mechanic profile.', error });
    }
};

// Get a mechanic profile by user ID
const getProfile = async (req, res) => {
    try {
        const profile = await MechanicProfiles.findOne({ where: { user_id: req.userId } });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }
        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching mechanic profile:', error);
        res.status(500).json({ message: 'Error fetching mechanic profile.', error });
    }
};

// Update a mechanic profile
const updateProfile = async (req, res) => {
    try {
        const profile = await MechanicProfiles.findOne({ where: { user_id: req.userId } });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        await profile.update(req.body);
        res.status(200).json({ message: 'Profile updated successfully!', profile });
    } catch (error) {
        console.error('Error updating mechanic profile:', error);
        res.status(500).json({ message: 'Error updating mechanic profile.', error });
    }
};

// Delete a mechanic profile
const deleteProfile = async (req, res) => {
    try {
        const profile = await MechanicProfiles.findOne({ where: { user_id: req.userId } });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        await profile.destroy();
        res.status(200).json({ message: 'Profile deleted successfully!' });
    } catch (error) {
        console.error('Error deleting mechanic profile:', error);
        res.status(500).json({ message: 'Error deleting mechanic profile.', error });
    }
};

module.exports = {
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile
};

