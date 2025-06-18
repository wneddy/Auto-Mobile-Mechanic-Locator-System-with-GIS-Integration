const express = require("express")
const router = express.Router()
const {
  SparePart,
  User,
  AdminProfile,
  VehicleOwnerProfiles,
  MechanicProfiles,
  Notification,
  sequelize,
} = require("../models")
const validateToken = require("../middleware/validateToken")
const { Op } = require("sequelize")

// Get all spare parts with pagination, search, and filtering for customers
router.get("/marketplace/spare-parts", validateToken, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 9 // 9 parts per page for 3x3 grid
    const offset = (page - 1) * limit
    const search = req.query.search || ""
    const category = req.query.category || ""

    // Build where clause
    const whereClause = {}

    if (search) {
      whereClause[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { description: { [Op.like]: `%${search}%` } }]
    }

    if (category) {
      whereClause.category = category
    }

    // Only show parts with quantity > 0
    whereClause.quantity = {
      [Op.gt]: 0,
    }

    // Get total count for pagination
    const count = await SparePart.count({ where: whereClause })

    // Get parts with pagination
    const parts = await SparePart.findAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: AdminProfile,
          as: "admin",
          attributes: ["full_name"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["email"],
            },
          ],
        },
      ],
    })

    // Format parts for frontend
    const formattedParts = parts.map((part) => {
      return {
        id: part.id,
        name: part.name,
        description: part.description,
        price: part.price,
        quantity: part.quantity,
        category: part.category,
        imageUrl: part.imageUrl,
        adminName: part.admin ? part.admin.full_name : "Unknown",
        createdAt: part.createdAt,
      }
    })

    res.json({
      parts: formattedParts,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count,
    })
  } catch (error) {
    console.error("Error fetching spare parts for marketplace:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get a single spare part by ID for customers
router.get("/marketplace/spare-parts/:id", validateToken, async (req, res) => {
  try {
    const part = await SparePart.findByPk(req.params.id, {
      include: [
        {
          model: AdminProfile,
          as: "admin",
          attributes: ["full_name"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["email"],
            },
          ],
        },
      ],
    })

    if (!part) {
      return res.status(404).json({ message: "Spare part not found" })
    }

    // Format part for frontend
    const formattedPart = {
      id: part.id,
      name: part.name,
      description: part.description,
      price: part.price,
      quantity: part.quantity,
      category: part.category,
      imageUrl: part.imageUrl,
      adminName: part.admin ? part.admin.full_name : "Unknown",
      adminEmail: part.admin && part.admin.user ? part.admin.user.email : "Unknown",
      createdAt: part.createdAt,
    }

    res.json(formattedPart)
  } catch (error) {
    console.error("Error fetching spare part details:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all categories for filter dropdown
router.get("/marketplace/categories", validateToken, async (req, res) => {
  try {
    // Get distinct categories from spare parts
    const categories = await SparePart.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("category")), "category"]],
      where: {
        category: {
          [Op.not]: null,
          [Op.ne]: "",
        },
      },
    })

    // Extract category names
    const categoryNames = categories.map((cat) => cat.category)

    res.json(categoryNames)
  } catch (error) {
    console.error("Error fetching categories:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get notifications for vehicle owner
router.get("/notifications", validateToken, async (req, res) => {
  try {
    // Check if user is a vehicle owner
    const user = await User.findByPk(req.userId)

    if (!user || user.user_type !== "vehicle-owner") {
      return res.status(403).json({ message: "Access denied. Vehicle owner privileges required." })
    }

    // Get vehicle owner profile
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: req.userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Get notifications for this vehicle owner
    const notifications = await Notification.findAll({
      where: {
        recipient_id: vehicleOwnerProfile.id,
        recipient_type: "vehicle-owner",
      },
      order: [["createdAt", "DESC"]],
      limit: 10, // Limit to most recent 10 notifications
    })

    res.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get user type
router.get("/auth/type", validateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ user_type: user.user_type })
  } catch (error) {
    console.error("Error fetching user type:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete profile
router.delete("/auth/delete-profile/:userId", validateToken, async (req, res) => {
  try {
    // Check if the requested userId matches the authenticated user's ID
    if (req.userId != req.params.userId) {
      return res.status(403).json({ message: "Unauthorized access to another user's profile" })
    }

    const user = await User.findByPk(req.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Delete user profile based on user type
    if (user.user_type === "vehicle-owner") {
      const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
        where: { user_id: req.userId },
      })

      if (vehicleOwnerProfile) {
        await vehicleOwnerProfile.destroy()
      }
    } else if (user.user_type === "mechanic") {
      const mechanicProfile = await MechanicProfiles.findOne({
        where: { user_id: req.userId },
      })

      if (mechanicProfile) {
        await mechanicProfile.destroy()
      }
    } else if (user.user_type === "admin") {
      const adminProfile = await AdminProfile.findOne({
        where: { user_id: req.userId },
      })

      if (adminProfile) {
        await adminProfile.destroy()
      }
    }

    // Delete user
    await user.destroy()

    res.json({ message: "Profile deleted successfully" })
  } catch (error) {
    console.error("Error deleting profile:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Logout
router.post("/auth/logout", validateToken, async (req, res) => {
  try {
    // Update user's currentToken to null
    const user = await User.findByPk(req.userId)

    if (user) {
      await user.update({ currentToken: null })
    }

    res.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Error logging out:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get vehicle owner profile
router.get("/auth/getVehicleOwnerProfile/:userId", validateToken, async (req, res) => {
  try {
    // Check if the requested userId matches the authenticated user's ID
    if (req.userId != req.params.userId) {
      return res.status(403).json({ message: "Unauthorized access to another user's profile" })
    }

    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: req.params.userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["email", "phone"],
        },
      ],
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    res.json(vehicleOwnerProfile)
  } catch (error) {
    console.error("Error fetching vehicle owner profile:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router

