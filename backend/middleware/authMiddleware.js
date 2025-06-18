const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Import the User model

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log("Authorization Header:", authHeader); // Debugging

    if (!authHeader) {
        console.error("No Authorization header received.");
        return res.status(401).json({ message: "No token provided." });
    }

    const token = authHeader.split(' ')[1]; // Extract token
    console.log("Extracted Token:", token); // Debugging

    const secretKey = process.env.JWT_SECRET || 'your_jwt_secret';

    try {
        // Verify the JWT token
        const decoded = jwt.verify(token, secretKey);
        console.log("Decoded User ID:", decoded.id); // Debugging

        // Find the user in the database
        const user = await User.findOne({ where: { id: decoded.id } });

        if (!user) {
            console.error("User not found.");
            return res.status(401).json({ message: "Unauthorized: User does not exist." });
        }

        // Check if the token has expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp < currentTime) {
            console.error("JWT Verification Error: Token has expired.");
            return res.status(401).json({ message: "Unauthorized: Token has expired." });
        }

        // Check if the token matches the latest one stored in the database
        if (user.currentToken !== token) {
            console.error("Token mismatch: Old or invalid token used.");
            return res.status(401).json({ message: "Unauthorized: Invalid token." });
        }

        req.user = { id: decoded.id, user_type: decoded.user_type };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            console.error("JWT Verification Error: Token has expired.");
            return res.status(401).json({ message: "Unauthorized: Token has expired." });
        }
        console.error("JWT Verification Error:", err.message);
        return res.status(401).json({ message: "Unauthorized: Invalid token." });
    }
};

module.exports = authMiddleware;
