const express = require("express")
const router = express.Router()
const { User } = require("../models")
const validateToken = require("../middleware/validateToken")
const { Op } = require("sequelize")

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId)

    if (!user || user.user_type !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." })
    }

    next()
  } catch (error) {
    console.error("Admin check error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get all users with pagination, search, and filtering
router.get("/", validateToken, isAdmin, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit
    const search = req.query.search || ""
    const userType = req.query.userType || ""

    // Build where clause
    const whereClause = {}

    if (search) {
      whereClause[Op.or] = [{ email: { [Op.like]: `%${search}%` } }, { phone: { [Op.like]: `%${search}%` } }]
    }

    if (userType) {
      whereClause.user_type = userType
    }

    // Get total count for pagination
    const count = await User.count({ where: whereClause })

    // Get users with pagination
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ["password", "resetToken", "resetTokenExpiration", "activationToken", "currentToken"] },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    })

    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get a single user by ID
router.get("/:id", validateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password", "resetToken", "resetTokenExpiration", "activationToken", "currentToken"] },
    })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete a user
router.delete("/:id", validateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id

    // Find the user
    const user = await User.findByPk(userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Prevent deleting yourself
    if (user.id === req.userId) {
      return res.status(400).json({ message: "You cannot delete your own account" })
    }

    // Delete user
    await user.destroy()

    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get current user information
router.get('/current', validateToken, async (req, res) => {
    try {
      const userId = req.userId;
      
      // Fetch user data from database
      const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'phone', 'user_type', 'isActive'] // Exclude sensitive fields
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get user by ID
  router.get('/:id', validateToken, async (req, res) => {
    try {
      // Check if the requested user ID matches the authenticated user's ID
      // This prevents users from accessing other users' data
      if (req.userId != req.params.id) {
        return res.status(403).json({ message: 'Unauthorized access to another user\'s data' });
      }
      
      const user = await User.findByPk(req.params.id, {
        attributes: ['id', 'email', 'phone', 'user_type', 'isActive'] // Exclude sensitive fields
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  
module.exports = router

