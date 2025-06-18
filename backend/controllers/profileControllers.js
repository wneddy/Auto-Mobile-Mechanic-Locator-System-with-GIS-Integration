const VehicleOwnerProfiles = require("../models/VehicleOwnerProfiles");
const User = require("../models/User");

// Create a new profile (only for vehicle owners)
exports.createProfile = async (req, res) => {
    try {
        const newProfile = await VehicleOwnerProfiles.create({ ...req.body, user_id: req.userId });
        res.status(201).json({ message: "Profile created successfully", profile: newProfile });
    } catch (error) {
        res.status(500).json({ message: "Error creating profile", error });
    }
};

// Get a specific profile by user ID (any user can view their own profile)
exports.getProfile = async (req, res) => {
    try {
        const profile = await VehicleOwnerProfiles.findOne({
            where: { user_id: req.userId }, // Fetch the profile for the logged-in user
            include: [{ model: User, attributes: ['email', 'phone'] }] // Include user info
        });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.status(200).json(profile);
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile", error });
    }
};

// Update a specific profile by user ID (only the user can update their own profile)
exports.updateProfile = async (req, res) => {
    try {
        const updatedProfile = await VehicleOwnerProfiles.update(req.body, {
            where: { user_id: req.userId }, // Update the profile for the logged-in user
            returning: true
        });
        if (!updatedProfile[0]) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.status(200).json({ message: "Profile updated successfully", profile: updatedProfile[1][0] });
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error });
    }
};

// Delete a specific profile by user ID (only the user can delete their own profile)
exports.deleteProfile = async (req, res) => {
    try {
        const deletedProfile = await VehicleOwnerProfiles.destroy({
            where: { user_id: req.userId } // Delete the profile for the logged-in user
        });
        if (!deletedProfile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting profile", error });
    }
};

// Admin can view all users' profiles
exports.getAllProfiles = async (req, res) => {
    try {
        const profiles = await VehicleOwnerProfiles.findAll();
        res.status(200).json(profiles);
    } catch (error) {
        res.status(500).json({ message: "Error fetching profiles", error });
    }
};

// Admin can delete any user's profile
exports.adminDeleteProfile = async (req, res) => {
    const { userId } = req.params; // Get user ID from route parameters
    try {
        const deletedProfile = await VehicleOwnerProfiles.destroy({
            where: { user_id: userId } // Delete the specified user's profile
        });
        if (!deletedProfile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting profile", error });
    }
};