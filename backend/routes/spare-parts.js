const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { SparePart, User } = require("../models")
const validateToken = require("../middleware/validateToken")
const { Op } = require("sequelize")

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../public/uploads/spare-parts")
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, "part-" + uniqueSuffix + ext)
  },
})

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Only image files are allowed!"), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

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

// Get all spare parts with pagination, search, and filtering
router.get("/", validateToken, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
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

    // Check if SparePart model exists
    if (!SparePart) {
      console.error("SparePart model is not defined")
      return res.status(500).json({ message: "SparePart model is not defined" })
    }

    // Get total count for pagination
    let count = 0
    try {
      count = await SparePart.count({ where: whereClause })
    } catch (countError) {
      console.error("Error counting spare parts:", countError)
      // Continue with count = 0
    }

    // Get parts with pagination
    let parts = []
    try {
      parts = await SparePart.findAll({
        where: whereClause,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      })
    } catch (findError) {
      console.error("Error finding spare parts:", findError)
      // Continue with empty parts array
    }

    res.json({
      parts,
      totalPages: Math.ceil(count / limit) || 1,
      currentPage: page,
      totalItems: count,
    })
  } catch (error) {
    console.error("Error fetching spare parts:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get a single spare part by ID
router.get("/:id", validateToken, async (req, res) => {
  try {
    const part = await SparePart.findByPk(req.params.id)

    if (!part) {
      return res.status(404).json({ message: "Spare part not found" })
    }

    res.json(part)
  } catch (error) {
    console.error("Error fetching spare part:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create a new spare part
router.post("/", validateToken, isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, quantity, category } = req.body
    const userId = req.userId // Get the authenticated user's ID

    // Validate required fields
    if (!name || !price || !quantity) {
      return res.status(400).json({ message: "Name, price, and quantity are required" })
    }

    // Find the admin profile for the current user
    const { AdminProfile } = require("../models")
    const adminProfile = await AdminProfile.findOne({ where: { user_id: userId } })

    if (!adminProfile) {
      return res.status(404).json({ message: "Admin profile not found for the current user" })
    }

    // Create image URL if file was uploaded
    let imageUrl = null
    if (req.file) {
      imageUrl = `/uploads/spare-parts/${req.file.filename}`
    }

    // Create spare part with the admin profile ID
    const newPart = await SparePart.create({
      name,
      description,
      price,
      quantity,
      category,
      imageUrl,
      adminId: adminProfile.id, // Use the admin profile ID, not the user ID
    })

    res.status(201).json(newPart)
  } catch (error) {
    console.error("Error creating spare part:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
});

// Update a spare part
router.put("/:id", validateToken, isAdmin, upload.single("image"), async (req, res) => {
  try {
    const partId = req.params.id
    const { name, description, price, quantity, category } = req.body

    // Find the part
    const part = await SparePart.findByPk(partId)

    if (!part) {
      return res.status(404).json({ message: "Spare part not found" })
    }

    // Update image if a new one was uploaded
    let imageUrl = part.imageUrl
    if (req.file) {
      // Delete old image if exists
      if (part.imageUrl) {
        const oldImagePath = path.join(__dirname, "../../public", part.imageUrl)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }

      imageUrl = `/uploads/spare-parts/${req.file.filename}`
    }

    // Update part
    await part.update({
      name: name || part.name,
      description: description !== undefined ? description : part.description,
      price: price || part.price,
      quantity: quantity !== undefined ? quantity : part.quantity,
      category: category !== undefined ? category : part.category,
      imageUrl,
    })

    res.json(part)
  } catch (error) {
    console.error("Error updating spare part:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete a spare part
router.delete("/:id", validateToken, isAdmin, async (req, res) => {
  try {
    const partId = req.params.id

    // Find the part
    const part = await SparePart.findByPk(partId)

    if (!part) {
      return res.status(404).json({ message: "Spare part not found" })
    }

    // Delete image if exists
    if (part.imageUrl) {
      const imagePath = path.join(__dirname, "../../public", part.imageUrl)
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }

    // Delete part
    await part.destroy()

    res.json({ message: "Spare part deleted successfully" })
  } catch (error) {
    console.error("Error deleting spare part:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router

