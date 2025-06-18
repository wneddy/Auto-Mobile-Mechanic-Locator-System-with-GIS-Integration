// middleware/validateToken.js
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const {
  AdminProfile,
  Booking,
  ServiceRequest,
  MechEarnings,
  MechanicProfiles,
  VehicleOwnerProfiles,
} = require("../models")

// Middleware to validate token
const validateToken = (req, res, next) => {
  try {
    console.log("validateToken middleware called")
    console.log("Headers:", JSON.stringify(req.headers))

    // Get the authorization header
    const authHeader = req.headers["authorization"]
    console.log("Authorization header:", authHeader)

    if (!authHeader) {
      console.log("No authorization header provided")
      return res.status(403).json({ message: "No authorization header provided" })
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith("Bearer ")) {
      console.log("Authorization header is not a Bearer token")
      return res.status(403).json({ message: "Invalid token format" })
    }

    // Extract the token
    const token = authHeader.split(" ")[1]
    console.log("Token extracted:", token ? token.substring(0, 20) + "..." : "undefined")

    if (!token) {
      console.log("No token provided")
      return res.status(403).json({ message: "No token provided" })
    }

    // Check if JWT_SECRET is defined
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables")
      return res.status(500).json({ message: "Server configuration error" })
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("Error verifying token:", err)

        // Provide more specific error messages based on the error type
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Token expired" })
        } else if (err.name === "JsonWebTokenError") {
          return res.status(401).json({ message: "Invalid token" })
        } else {
          return res.status(401).json({ message: "Unauthorized" })
        }
      }

      console.log("Token verified successfully for user ID:", decoded.id)
      req.userId = decoded.id // Attach user ID to request object

      // Continue to the next middleware or route handler
      next()
    })
  } catch (error) {
    console.error("Unexpected error in validateToken middleware:", error)
    return res.status(500).json({ message: "Server error" })
  }
}

module.exports = validateToken

