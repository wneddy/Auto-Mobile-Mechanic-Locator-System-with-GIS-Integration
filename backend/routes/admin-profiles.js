const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const db = require("../models")
const { AdminProfile, User } = db
const validateToken = require("../middleware/validateToken")
const { Op } = require("sequelize")

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../public/uploads/admin-profiles")
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, "admin-" + uniqueSuffix + ext)
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

// Create admin profile
router.post("/", validateToken, upload.single("profile_picture"), async (req, res) => {
  try {
    console.log("Admin profile creation request received")
    console.log("User ID from token:", req.userId)
    console.log("Request body:", req.body)
    console.log("File uploaded:", req.file)

    const { user_id, full_name, position, department, employee_id, contact_phone, office_location, bio, permissions } =
      req.body

    // Validate required fields
    if (!user_id || !full_name || !position || !department || !employee_id || !contact_phone || !office_location) {
      console.log("Missing required fields:", {
        user_id,
        full_name,
        position,
        department,
        employee_id,
        contact_phone,
        office_location,
      })
      return res.status(400).json({ message: "Missing required fields" })
    }

    // Verify that the user_id matches the authenticated user's ID
    if (Number.parseInt(user_id) !== req.userId) {
      console.log(`User ID mismatch: ${user_id} (from form) vs ${req.userId} (from token)`)
      return res.status(403).json({ message: "Unauthorized: You can only create a profile for yourself" })
    }

    // Check if profile already exists for this user
    const existingProfile = await AdminProfile.findOne({ where: { user_id } })
    if (existingProfile) {
      console.log("Profile already exists for user:", user_id)
      return res.status(400).json({ message: "Profile already exists for this user" })
    }

    // Check if employee ID is already in use
    const duplicateEmployeeId = await AdminProfile.findOne({ where: { employee_id } })
    if (duplicateEmployeeId) {
      console.log("Employee ID already in use:", employee_id)
      return res.status(400).json({ message: "Employee ID is already in use" })
    }

    // Create image URL if file was uploaded
    let profilePicture = null
    if (req.file) {
      profilePicture = `/uploads/admin-profiles/${req.file.filename}`
      console.log("Profile picture path:", profilePicture)
    }

    // Create admin profile
    const newProfile = await AdminProfile.create({
      user_id,
      full_name,
      position,
      department,
      employee_id,
      contact_phone,
      office_location,
      bio: bio || null,
      profile_picture: profilePicture,
      permissions:
        typeof permissions === "string" ? permissions : JSON.stringify(permissions || ["spare_parts_management"]),
      last_login: new Date(),
    })

    console.log("Admin profile created successfully:", newProfile.id)

    res.status(201).json(newProfile)
  } catch (error) {
    console.error("Error creating admin profile:", error)
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// Get admin profile by user ID
router.get("/user/:userId", validateToken, async (req, res) => {
  try {
    const userId = req.params.userId

    // Check if requested profile belongs to the authenticated user or if user is an admin
    if (req.userId != userId) {
      const user = await User.findByPk(req.userId)
      if (!user || user.user_type !== "admin") {
        return res.status(403).json({ message: "Unauthorized access to another user's profile" })
      }
    }

    const profile = await AdminProfile.findOne({ where: { user_id: userId } })

    if (!profile) {
      return res.status(404).json({ message: "Admin profile not found" })
    }

    res.json(profile)
  } catch (error) {
    console.error("Error fetching admin profile:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update admin profile
router.put("/:id", validateToken, upload.single("profile_picture"), async (req, res) => {
  try {
    const profileId = req.params.id
    const { full_name, position, department, employee_id, contact_phone, office_location, bio, permissions } = req.body

    // Find the profile
    const profile = await AdminProfile.findByPk(profileId)

    if (!profile) {
      return res.status(404).json({ message: "Admin profile not found" })
    }

    // Check if this profile belongs to the authenticated user
    if (profile.user_id != req.userId) {
      return res.status(403).json({ message: "Unauthorized to update this profile" })
    }

    // Check if employee ID is already in use by another profile
    if (employee_id && employee_id !== profile.employee_id) {
      const duplicateEmployeeId = await AdminProfile.findOne({
        where: {
          employee_id,
          id: { [Op.ne]: profileId }, // Not equal to current profile ID
        },
      })

      if (duplicateEmployeeId) {
        return res.status(400).json({ message: "Employee ID is already in use" })
      }
    }

    // Update profile picture if a new one was uploaded
    let profilePicture = profile.profile_picture
    if (req.file) {
      // Delete old image if exists
      if (profile.profile_picture) {
        const oldImagePath = path.join(__dirname, "../../public", profile.profile_picture)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }

      profilePicture = `/uploads/admin-profiles/${req.file.filename}`
    }

    // Update profile
    await profile.update({
      full_name: full_name || profile.full_name,
      position: position || profile.position,
      department: department || profile.department,
      employee_id: employee_id || profile.employee_id,
      contact_phone: contact_phone || profile.contact_phone,
      office_location: office_location || profile.office_location,
      bio: bio !== undefined ? bio : profile.bio,
      profile_picture: profilePicture,
      permissions:
        typeof permissions === "string" ? permissions : permissions ? JSON.stringify(permissions) : profile.permissions,
    })

    res.json(profile)
  } catch (error) {
    console.error("Error updating admin profile:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete admin profile
router.delete("/:id", validateToken, async (req, res) => {
  try {
    const profileId = req.params.id

    // Find the profile
    const profile = await AdminProfile.findByPk(profileId)

    if (!profile) {
      return res.status(404).json({ message: "Admin profile not found" })
    }

    // Check if this profile belongs to the authenticated user
    if (profile.user_id != req.userId) {
      return res.status(403).json({ message: "Unauthorized to delete this profile" })
    }

    // Delete profile picture if exists
    if (profile.profile_picture) {
      const imagePath = path.join(__dirname, "../../public", profile.profile_picture)
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }

    // Delete profile
    await profile.destroy()

    res.json({ message: "Admin profile deleted successfully" })
  } catch (error) {
    console.error("Error deleting admin profile:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router

