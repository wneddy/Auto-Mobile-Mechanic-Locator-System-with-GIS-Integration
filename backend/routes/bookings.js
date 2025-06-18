const express = require("express")
const router = express.Router()
const { Booking, User, MechanicProfiles, VehicleOwnerProfiles, ServiceRequest } = require("../models")
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

// Get all bookings with pagination, search, and filtering
router.get("/", validateToken, isAdmin, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit
    const search = req.query.search || ""
    const status = req.query.status || ""
    const date = req.query.date || ""

    // Build where clause
    const whereClause = {}

    if (search) {
      whereClause[Op.or] = [{ customerName: { [Op.like]: `%${search}%` } }]
    }

    if (status) {
      whereClause.status = status
    }

    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)

      whereClause.createdAt = {
        [Op.between]: [startDate, endDate],
      }
    }

    // Get total count for pagination
    const count = await Booking.count({ where: whereClause })

    // Get bookings with pagination
    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        {
          model: MechanicProfiles,
          as: "mechanic",
          attributes: ["full_name"],
        },
        {
          model: ServiceRequest,
          as: "serviceRequest",
          include: [
            {
              model: VehicleOwnerProfiles,
              as: "vehicleOwner",
              attributes: ["full_name"],
            },
          ],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    })

    // Format bookings data
    const formattedBookings = bookings.map((booking) => {
      return {
        id: booking.id,
        customerName: booking.customerName || booking.serviceRequest?.vehicleOwner?.full_name || "Unknown",
        mechanicName: booking.mechanic?.full_name || "Unknown",
        service: booking.serviceRequest?.service_type || "General Service",
        date: booking.createdAt,
        status: booking.status,
      }
    })

    res.json({
      bookings: formattedBookings,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count,
    })
  } catch (error) {
    console.error("Error fetching bookings:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get a single booking by ID
router.get("/:id", validateToken, isAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: MechanicProfiles,
          as: "mechanic",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["phone"],
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
                  attributes: ["phone"],
                },
              ],
            },
          ],
        },
      ],
    })

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" })
    }

    // Format booking data
    const formattedBooking = {
      id: booking.id,
      customerName: booking.customerName || booking.serviceRequest?.vehicleOwner?.full_name || "Unknown",
      customerContact: booking.serviceRequest?.vehicleOwner?.user?.phone || "N/A",
      mechanicName: booking.mechanic?.full_name || "Unknown",
      mechanicContact: booking.mechanic?.user?.phone || "N/A",
      service: booking.serviceRequest?.service_type || "General Service",
      vehicle: booking.serviceRequest?.vehicle_details || "N/A",
      date: booking.createdAt,
      time: booking.serviceRequest?.preferred_time || "N/A",
      status: booking.status,
      notes: booking.serviceRequest?.notes || "No notes available",
    }

    res.json(formattedBooking)
  } catch (error) {
    console.error("Error fetching booking:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update booking status
router.put("/:id/status", validateToken, isAdmin, async (req, res) => {
  try {
    const bookingId = req.params.id
    const { status, notes } = req.body

    // Find the booking
    const booking = await Booking.findByPk(bookingId)

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" })
    }

    // Update booking status
    await booking.update({ status })

    // If notes are provided and service request exists, update notes
    if (notes && booking.requestId) {
      const serviceRequest = await ServiceRequest.findByPk(booking.requestId)
      if (serviceRequest) {
        await serviceRequest.update({ notes })
      }
    }

    res.json({ message: "Booking status updated successfully" })
  } catch (error) {
    console.error("Error updating booking status:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router

