// middleware/checkProfileCompletion.js
const VehicleOwnerPersonalProfile = require('../models/VehicleOwnerPersonalProfile');

const checkProfileCompletion = async (req, res, next) => {
    // Extract user ID from the session or request
    const userId = req.session?.user?.id || req.user?.id; // Adjust based on your authentication method

    // Check if user ID is provided
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized: User ID not provided." });
    }

    try {
        // Query the database to check if the profile exists
        const profile = await VehicleOwnerPersonalProfile.findOne({ where: { user_id: userId } });

        // If the profile does not exist, respond with a 403 status
        if (!profile) {
            return res.status(403).json({ message: "Profile not completed. Please complete your profile." });
        }

        // If the profile exists, proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error("Error checking profile completion:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = checkProfileCompletion;