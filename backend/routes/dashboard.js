const express = require("express")
const router = express.Router()
const { User, Booking, MechanicProfiles, VehicleOwnerProfiles, SparePart, ServiceRequest } = require("../models")
const validateToken = require("../middleware/validateToken")
const { Op, Sequelize } = require("sequelize")

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

// Get dashboard statistics
router.get("/stats", validateToken, isAdmin, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || "month"
    let dateFilter = {}

    // Set date filter based on time range
    const now = new Date()
    if (timeRange === "day") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      dateFilter = {
        createdAt: {
          [Op.gte]: today,
        },
      }
    } else if (timeRange === "week") {
      const lastWeek = new Date(now)
      lastWeek.setDate(now.getDate() - 7)
      dateFilter = {
        createdAt: {
          [Op.gte]: lastWeek,
        },
      }
    } else if (timeRange === "month") {
      const lastMonth = new Date(now)
      lastMonth.setMonth(now.getMonth() - 1)
      dateFilter = {
        createdAt: {
          [Op.gte]: lastMonth,
        },
      }
    } else if (timeRange === "year") {
      const lastYear = new Date(now)
      lastYear.setFullYear(now.getFullYear() - 1)
      dateFilter = {
        createdAt: {
          [Op.gte]: lastYear,
        },
      }
    }

    // Count total users
    const totalUsers = await User.count()

    // Count total mechanics
    const totalMechanics = await User.count({
      where: {
        user_type: "mechanic",
      },
    })

    // Count total bookings
    const totalBookings = await Booking.count({
      where: dateFilter,
    })

    // Count total spare parts
    const totalParts = await SparePart.count()

    res.json({
      totalUsers,
      totalMechanics,
      totalBookings,
      totalParts,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get bookings chart data
router.get("/bookings-chart", validateToken, isAdmin, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || "month"
    let dateFormat, startDate
    const now = new Date()

    // Set date format and start date based on time range
    if (timeRange === "day") {
      dateFormat = "%H:00" // Hour format
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (timeRange === "week") {
      dateFormat = "%Y-%m-%d" // Day format
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    } else if (timeRange === "month") {
      dateFormat = "%Y-%m-%d" // Day format
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 1)
    } else if (timeRange === "year") {
      dateFormat = "%Y-%m" // Month format
      startDate = new Date(now)
      startDate.setFullYear(now.getFullYear() - 1)
    }

    // Get bookings grouped by date
    const bookings = await Booking.findAll({
      attributes: [
        [Sequelize.fn("date_format", Sequelize.col("createdAt"), dateFormat), "date"],
        [Sequelize.fn("count", Sequelize.col("id")), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
        },
      },
      group: [Sequelize.fn("date_format", Sequelize.col("createdAt"), dateFormat)],
      order: [[Sequelize.col("createdAt"), "ASC"]],
    })

    // Format data for chart
    const labels = bookings.map((booking) => booking.getDataValue("date"))
    const data = bookings.map((booking) => booking.getDataValue("count"))

    res.json({
      labels,
      datasets: [
        {
          label: "Bookings",
          data,
          backgroundColor: "rgba(78, 115, 223, 0.05)",
          borderColor: "rgba(78, 115, 223, 1)",
          pointBackgroundColor: "rgba(78, 115, 223, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(78, 115, 223, 1)",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
      ],
    })
  } catch (error) {
    console.error("Error fetching bookings chart data:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get user distribution data
router.get("/user-distribution", validateToken, isAdmin, async (req, res) => {
  try {
    // Count users by type
    const vehicleOwners = await User.count({
      where: {
        user_type: "vehicle-owner",
      },
    })

    const mechanics = await User.count({
      where: {
        user_type: "mechanic",
      },
    })

    const admins = await User.count({
      where: {
        user_type: "admin",
      },
    })

    res.json({
      labels: ["Vehicle Owners", "Mechanics", "Admins"],
      datasets: [
        {
          data: [vehicleOwners, mechanics, admins],
          backgroundColor: ["#4e73df", "#1cc88a", "#36b9cc"],
          hoverBackgroundColor: ["#2e59d9", "#17a673", "#2c9faf"],
          hoverBorderColor: "rgba(234, 236, 244, 1)",
        },
      ],
    })
  } catch (error) {
    console.error("Error fetching user distribution data:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get recent bookings
router.get("/recent-bookings", validateToken, isAdmin, async (req, res) => {
  try {
    // Get recent bookings
    const bookings = await Booking.findAll({
      include: [
        {
          model: MechanicProfiles,
          as: "mechanic",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "email"],
            },
          ],
        },
        {
          model: ServiceRequest,
          as: "serviceRequest",
          include: [
            {
              model: VehicleOwnerProfiles,
              as: "vehicleOwner",
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "email"],
                },
              ],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5,
    })

    // Format bookings data
    const formattedBookings = bookings.map((booking) => {
      return {
        id: booking.id,
        customer: booking.serviceRequest?.vehicleOwner?.full_name || "Unknown",
        mechanic: booking.mechanic?.full_name || "Unknown",
        date: booking.createdAt,
        status: booking.status,
      }
    })

    res.json(formattedBookings)
  } catch (error) {
    console.error("Error fetching recent bookings:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get top mechanics
router.get("/top-mechanics", validateToken, isAdmin, async (req, res) => {
  try {
    // Get mechanics with most bookings
    const mechanics = await MechanicProfiles.findAll({
      attributes: [
        "id",
        "full_name",
        "specialization",
        "average_rating",
        [Sequelize.fn("count", Sequelize.col("bookings.id")), "bookingCount"],
      ],
      include: [
        {
          model: Booking,
          as: "bookings",
          attributes: [],
        },
      ],
      group: ["MechanicProfiles.id"],
      order: [[Sequelize.literal("bookingCount"), "DESC"]],
      limit: 5,
    })

    // Format mechanics data
    const formattedMechanics = mechanics.map((mechanic) => {
      return {
        name: mechanic.full_name,
        specialization: mechanic.specialization || "General",
        bookings: mechanic.getDataValue("bookingCount"),
        average_rating: mechanic.average_rating || 0,
      }
    })

    res.json(formattedMechanics)
  } catch (error) {
    console.error("Error fetching top mechanics:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router

