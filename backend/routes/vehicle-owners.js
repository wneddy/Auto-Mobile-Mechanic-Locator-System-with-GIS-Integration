const express = require("express")
const router = express.Router()
const validateToken = require("../middleware/validateToken")
const {
  User,
  ServiceRequest,
  MechanicProfiles,
  VehicleOwnerProfiles,
  Notification,
  MechEarnings,
  Booking,
} = require("../models")
const { Op } = require("sequelize")
const axios = require("axios")
const path = require("path")

// M-Pesa API credentials
const CONSUMER_KEY = "86i8cHhlZXPlHoaTZ733LQSGLbnpLxkEkGPnj3rE8vhS5VRi"
const CONSUMER_SECRET = "LTYPnnWWaDgOdCjtps3DKpa0cqfSqODIOSiaZYFaHoe8GWYjAGxk4I4nEJlGvbGE"
const MPESA_API_URL = "https://sandbox.safaricom.co.ke" // Use production URL in production
const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" // Your M-Pesa passkey

// Store payment requests for status checking
const paymentRequests = new Map()

// Middleware to ensure the user is a vehicle owner
const isVehicleOwner = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId)

    if (!user || user.user_type !== "vehicle-owner") {
      return res.status(403).json({ message: "Access denied. Vehicle owner privileges required." })
    }

    next()
  } catch (error) {
    console.error("Vehicle owner check error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Apply validateToken middleware to all routes
router.use(validateToken)

// Get all service requests for the logged-in vehicle owner
router.get("/service-requests", async (req, res) => {
  try {
    const userId = req.userId

    // Find the vehicle owner profile ID
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Fetch all service requests for this vehicle owner
    const serviceRequests = await ServiceRequest.findAll({
      where: { user_id: vehicleOwnerProfile.id },
      include: [
        {
          model: MechanicProfiles,
          as: "mechanic",
          attributes: ["id", "full_name", "profile_picture"],
        },
      ],
      order: [["created_at", "DESC"]],
    })

    // Create notifications for status changes if needed
    for (const request of serviceRequests) {
      // Check if we already have a notification for this status
      const existingNotification = await Notification.findOne({
        where: {
          service_request_id: request.id,
          message: { [Op.like]: `%${request.status}%` },
        },
      })

      // If no notification exists for this status and it's not pending, create one
      if (!existingNotification && request.status !== "pending") {
        const mechanicName = request.mechanic ? request.mechanic.full_name : "A mechanic"
        let message = ""

        switch (request.status) {
          case "accepted":
            message = `Your service request #${request.id} has been accepted by ${mechanicName}.`
            break
          case "declined":
            message = `Your service request #${request.id} has been declined by ${mechanicName}.`
            break
          case "completed":
            message = `Your service request #${request.id} has been marked as completed by ${mechanicName}. Click to pay and rate.`
            break
        }

        if (message) {
          await Notification.create({
            user_id: userId,
            message,
            service_request_id: request.id,
            is_read: false,
          })
        }
      }
    }

    res.json(serviceRequests)
  } catch (error) {
    console.error("Error fetching service requests:", error)
    res.status(500).json({ message: "Error fetching service requests" })
  }
})

// Get a specific service request by ID
router.get("/service-requests/:id", async (req, res) => {
  try {
    const userId = req.userId
    const requestId = req.params.id

    // Find the vehicle owner profile ID
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Fetch the specific service request
    const serviceRequest = await ServiceRequest.findOne({
      where: {
        id: requestId,
        user_id: vehicleOwnerProfile.id,
      },
      include: [
        {
          model: MechanicProfiles,
          as: "mechanic",
          attributes: ["id", "full_name", "profile_picture", "workshop_address"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["phone"],
            },
          ],
        },
      ],
    })

    if (!serviceRequest) {
      return res.status(404).json({ message: "Service request not found" })
    }

    res.json(serviceRequest)
  } catch (error) {
    console.error("Error fetching service request:", error)
    res.status(500).json({ message: "Error fetching service request" })
  }
})

// Add this route to get the latest completed service request
router.get("/latest-completed-request", async (req, res) => {
  try {
    const userId = req.userId

    // Find the vehicle owner profile ID
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Fetch the latest completed service request without checking payment_status
    // since that column doesn't exist in the ServiceRequest model
    const latestCompletedRequest = await ServiceRequest.findOne({
      where: {
        user_id: vehicleOwnerProfile.id,
        status: "completed",
      },
      include: [
        {
          model: MechanicProfiles,
          as: "mechanic",
          attributes: ["id", "full_name", "profile_picture", "workshop_address"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["phone"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]], // Get the most recent one
    })

    if (!latestCompletedRequest) {
      return res.status(404).json({ message: "No completed service requests found" })
    }

    res.json(latestCompletedRequest)
  } catch (error) {
    console.error("Error fetching latest completed request:", error)
    res.status(500).json({ message: "Error fetching latest completed request" })
  }
})

// Add this route to create a booking record
router.post("/create-booking", async (req, res) => {
  try {
    const userId = req.userId
    const { requestId, mechanicId, description, status } = req.body

    // Validate required fields
    if (!requestId || !mechanicId) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    // Find the vehicle owner profile
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Create a new booking record
    const booking = await Booking.create({
      requestId,
      mechanicId,
      customerId: vehicleOwnerProfile.id,
      customerName: vehicleOwnerProfile.full_name || "Unknown Customer",
      status: status || "Pending",
    })

    res.json({
      success: true,
      message: "Booking created successfully",
      booking,
    })
  } catch (error) {
    console.error("Error creating booking:", error)
    res.status(500).json({ message: "Error creating booking" })
  }
})

// Helper function to get M-Pesa access token
async function getAccessToken() {
  try {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64")
    const response = await axios.get(`${MPESA_API_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })
    return response.data.access_token
  } catch (error) {
    console.error("Error getting access token:", error.response?.data || error.message)
    return null
  }
}

// Add this route to handle P2P payments
router.post("/stkpushP2P", async (req, res) => {
  try {
    const userId = req.userId
    const { senderPhone, recipientPhone, amount, description, requestId, mechanicId, rating } = req.body

    // Validate required fields
    if (!senderPhone || !recipientPhone || !amount || !description || !requestId || !mechanicId || !rating) {
      return res.status(400).json({ success: false, message: "Missing required fields" })
    }

    // Find the vehicle owner profile
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ success: false, message: "Vehicle owner profile not found" })
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findOne({
      where: {
        id: requestId,
        user_id: vehicleOwnerProfile.id,
      },
    })

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: "Service request not found",
      })
    }

    try {
      // Import the P2P function
      const stkPushP2PPath = path.join(__dirname, "stkPushP2P.js")
      const stkPushP2P = require(stkPushP2PPath)

      // Call the P2P function
      const stkResponse = await stkPushP2P(senderPhone, recipientPhone, amount)

      if (stkResponse.error) {
        return res.status(400).json({
          success: false,
          message: stkResponse.error,
        })
      }

      // Store the checkout request ID for status checking
      const checkoutRequestID = stkResponse.CheckoutRequestID

      // Store payment request details for status checking
      paymentRequests.set(checkoutRequestID, {
        requestId,
        mechanicId,
        amount,
        description,
        senderPhone,
        recipientPhone,
        rating,
        status: "PENDING",
        timestamp: new Date(),
      })

      // Create a booking record if it doesn't exist
      let booking = await Booking.findOne({
        where: {
          requestId,
          mechanicId,
        },
      })

      if (!booking) {
        booking = await Booking.create({
          requestId,
          mechanicId,
          customerId: vehicleOwnerProfile.id,
          customerName: vehicleOwnerProfile.full_name || "Unknown Customer",
          status: "Pending",
        })
      }

      // Return success response
      res.json({
        success: true,
        message: "STK push initiated successfully",
        checkoutRequestID,
        ...stkResponse,
      })
    } catch (error) {
      console.error("Error in P2P payment:", error)
      res.status(500).json({
        success: false,
        message: "Failed to process P2P payment",
        error: error.message,
      })
    }
  } catch (error) {
    console.error("Error in stkpushP2P route:", error)
    res.status(500).json({ success: false, message: "Server error", error: error.message })
  }
})

// Update the initiate-stk-push route to include mechanic's phone number
router.post("/initiate-stk-push", async (req, res) => {
  try {
    const userId = req.userId
    const { requestId, mechanicId, amount, description, phoneNumber, rating } = req.body

    // Validate required fields
    if (!requestId || !mechanicId || !amount || !description || !phoneNumber || !rating) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    // Find the vehicle owner profile
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findOne({
      where: {
        id: requestId,
        user_id: vehicleOwnerProfile.id,
      },
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
      ],
    })

    if (!serviceRequest) {
      return res.status(404).json({
        message: "Service request not found",
      })
    }

    // Get mechanic's phone number for payment
    const mechanicPhone = serviceRequest.mechanic?.user?.phone
    if (!mechanicPhone) {
      return res.status(404).json({ message: "Mechanic phone number not found" })
    }

    // Get M-Pesa access token
    const accessToken = await getAccessToken()
    if (!accessToken) {
      return res.status(500).json({ success: false, message: "Failed to obtain access token" })
    }

    // Generate timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 14)
    const shortCode = "174379" // Your M-Pesa shortcode
    const password = Buffer.from(`${shortCode}${PASSKEY}${timestamp}`).toString("base64")

    // Use a hardcoded callback URL that is guaranteed to be valid
    // M-Pesa requires a publicly accessible HTTPS URL
    const callbackUrl = "https://webhook.site/c78a9a3f-5d93-4f9c-9c9a-1a76c0f5c4e1"

    // Prepare STK Push request
    const stkPushRequest = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: `Service Request #${requestId}`,
      TransactionDesc: description,
    }

    console.log("STK Push Request:", JSON.stringify(stkPushRequest))

    // Send STK Push request
    const stkResponse = await axios.post(`${MPESA_API_URL}/mpesa/stkpush/v1/processrequest`, stkPushRequest, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    console.log("STK Push Response:", JSON.stringify(stkResponse.data))

    // Store payment request details for status checking
    const checkoutRequestID = stkResponse.data.CheckoutRequestID
    paymentRequests.set(checkoutRequestID, {
      requestId,
      mechanicId,
      amount,
      description,
      phoneNumber,
      rating,
      mechanicPhone,
      status: "PENDING",
      timestamp: new Date(),
    })

    res.json({
      success: true,
      message: "STK push initiated successfully",
      checkoutRequestID,
    })
  } catch (error) {
    console.error("Error initiating STK push:", error.response?.data || error.message)
    res
      .status(500)
      .json({ success: false, message: "Failed to initiate payment: " + (error.message || "Unknown error") })
  }
})

// M-Pesa callback endpoint
router.post("/mpesa-callback", async (req, res) => {
  try {
    const { Body } = req.body
    const { stkCallback } = Body
    const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback

    console.log("M-Pesa callback received:", JSON.stringify(req.body))

    // Get the stored payment request
    const paymentRequest = paymentRequests.get(CheckoutRequestID)
    if (!paymentRequest) {
      console.error("Payment request not found for CheckoutRequestID:", CheckoutRequestID)
      return res.status(404).json({ success: false, message: "Payment request not found" })
    }

    // Update payment request status
    if (ResultCode === 0) {
      // Payment successful
      paymentRequest.status = "COMPLETED"

      // Process the successful payment
      await processSuccessfulPayment(paymentRequest)
    } else {
      // Payment failed
      paymentRequest.status = "FAILED"
      paymentRequest.failureReason = ResultDesc
    }

    // Update the stored payment request
    paymentRequests.set(CheckoutRequestID, paymentRequest)

    // Respond to M-Pesa
    res.json({ success: true })
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error)
    res.status(500).json({ success: false, message: "Error processing callback" })
  }
})

// Callback URL for P2P transfers
router.post("/callback", (req, res) => {
  console.log("P2P Callback Response:", req.body)
  res.status(200).json({ message: "Callback received" })
})

// Check payment status
router.post("/check-payment-status", async (req, res) => {
  try {
    const { checkoutRequestID, requestId } = req.body

    if (!checkoutRequestID) {
      return res.status(400).json({ message: "Missing checkoutRequestID" })
    }

    // Get the stored payment request
    const paymentRequest = paymentRequests.get(checkoutRequestID)
    if (!paymentRequest) {
      return res.status(404).json({ message: "Payment request not found" })
    }

    // If payment is still pending but it's been more than 2 minutes, check with M-Pesa
    if (paymentRequest.status === "PENDING" && new Date() - new Date(paymentRequest.timestamp) > 2 * 60 * 1000) {
      try {
        // Get M-Pesa access token
        const accessToken = await getAccessToken()
        if (!accessToken) {
          throw new Error("Failed to obtain access token")
        }

        // Generate timestamp
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:T.]/g, "")
          .slice(0, 14)
        const shortCode = "174379" // Your M-Pesa shortcode
        const password = Buffer.from(`${shortCode}${PASSKEY}${timestamp}`).toString("base64")

        // Query payment status
        const statusResponse = await axios.post(
          `${MPESA_API_URL}/mpesa/stkpushquery/v1/query`,
          {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        )

        // Update payment status based on response
        if (statusResponse.data.ResultCode === 0) {
          paymentRequest.status = "COMPLETED"
          await processSuccessfulPayment(paymentRequest)
        } else if (statusResponse.data.ResultCode === 1032) {
          // Transaction canceled
          paymentRequest.status = "FAILED"
          paymentRequest.failureReason = "Transaction canceled by user"
        } else {
          paymentRequest.status = "FAILED"
          paymentRequest.failureReason = statusResponse.data.ResultDesc
        }

        // Update the stored payment request
        paymentRequests.set(checkoutRequestID, paymentRequest)
      } catch (error) {
        console.error("Error checking payment status with M-Pesa:", error)
        // Don't update status on error, just continue
      }
    }

    res.json({
      status: paymentRequest.status,
      message: paymentRequest.failureReason || "Payment processing",
    })
  } catch (error) {
    console.error("Error checking payment status:", error)
    res.status(500).json({ message: "Error checking payment status" })
  }
})

// Update the processSuccessfulPayment function to create both booking and earnings records
async function processSuccessfulPayment(paymentRequest) {
  try {
    const { requestId, mechanicId, amount, description, rating } = paymentRequest

    // Find the service request
    const serviceRequest = await ServiceRequest.findByPk(requestId)
    if (!serviceRequest) {
      throw new Error(`Service request #${requestId} not found`)
    }

    // Create a new booking record if it doesn't exist
    let booking = await Booking.findOne({
      where: {
        requestId,
        mechanicId,
      },
    })

    if (!booking) {
      // Get vehicle owner profile to get customer name
      const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
        where: { id: serviceRequest.user_id },
      })

      booking = await Booking.create({
        requestId,
        mechanicId,
        customerId: serviceRequest.user_id,
        customerName: vehicleOwnerProfile ? vehicleOwnerProfile.full_name : "Unknown Customer",
        status: "Completed",
      })
    } else {
      // Update existing booking status
      await booking.update({ status: "Completed" })
    }

    // Create a new earnings record
    const earnings = await MechEarnings.create({
      user_id: mechanicId,
      date: new Date(),
      description,
      amount: Number.parseFloat(amount),
      status: "Completed",
    })

    // Update the service request with the rating
    await serviceRequest.update({
      rating: Number.parseFloat(rating),
    })

    // Create a notification for the mechanic
    await Notification.create({
      user_id: mechanicId,
      message: `You received a payment of KES ${amount} for service request #${requestId}. The customer rated your service ${rating}/5 stars.`,
      service_request_id: requestId,
      is_read: false,
    })

    console.log(`Payment for service request #${requestId} processed successfully`)
    return true
  } catch (error) {
    console.error("Error processing successful payment:", error)
    return false
  }
}

// Submit a payment and rating for a completed service (fallback method)
router.post("/submit-payment", async (req, res) => {
  try {
    const userId = req.userId
    const { requestId, mechanicId, amount, description, rating, paymentMethod } = req.body

    // Validate required fields
    if (!requestId || !mechanicId || !amount || !description || !rating) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    // Find the vehicle owner profile
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findOne({
      where: {
        id: requestId,
        user_id: vehicleOwnerProfile.id,
        status: "completed",
      },
    })

    if (!serviceRequest) {
      return res.status(404).json({
        message: "Service request not found or not completed yet",
      })
    }

    // Create a new earnings record
    const earnings = await MechEarnings.create({
      user_id: mechanicId, // This is the mechanic's ID
      date: new Date(),
      description,
      amount: Number.parseFloat(amount),
      status: "Completed", // Set to completed since payment is processed immediately
    })

    // Update the service request with the rating
    await serviceRequest.update({
      rating: Number.parseFloat(rating),
    })

    // Create a notification for the mechanic
    await Notification.create({
      user_id: mechanicId,
      message: `You received a payment of KES ${amount} for service request #${requestId}. The customer rated your service ${rating}/5 stars.`,
      service_request_id: requestId,
      is_read: false,
    })

    res.json({
      message: "Payment and rating submitted successfully",
      earnings,
      serviceRequest,
    })
  } catch (error) {
    console.error("Error submitting payment:", error)
    res.status(500).json({ message: "Error submitting payment" })
  }
})

// Submit a rating for a completed service
router.post("/rate-service/:requestId", async (req, res) => {
  try {
    const userId = req.userId
    const requestId = req.params.requestId
    const { rating, comment } = req.body

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" })
    }

    // Find the vehicle owner profile
    const vehicleOwnerProfile = await VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findOne({
      where: {
        id: requestId,
        user_id: vehicleOwnerProfile.id,
        status: "completed",
      },
    })

    if (!serviceRequest) {
      return res.status(404).json({
        message: "Service request not found or not completed yet",
      })
    }

    // Update the service request with the rating
    await serviceRequest.update({
      rating: Number.parseFloat(rating),
    })

    // Create a notification for the mechanic
    await Notification.create({
      user_id: serviceRequest.mechanic_id,
      message: `Your service for request #${requestId} has been rated ${rating}/5 stars.`,
      service_request_id: requestId,
      is_read: false,
    })

    res.json({
      message: "Rating submitted successfully",
      serviceRequest,
    })
  } catch (error) {
    console.error("Error submitting rating:", error)
    res.status(500).json({ message: "Error submitting rating" })
  }
})

// Get notifications for the vehicle owner
router.get("/notifications", async (req, res) => {
  try {
    const userId = req.userId

    // Directly use the user ID from the token for notifications
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: 20,
    })

    res.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    res.status(500).json({ message: "Error fetching notifications" })
  }
})

// Mark notifications as read
router.post("/mark-notifications-read", async (req, res) => {
  try {
    const userId = req.userId
    const { notificationIds } = req.body

    // Update notifications directly using the user ID from the token
    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await Notification.update(
        { is_read: true },
        {
          where: {
            id: { [Op.in]: notificationIds },
            user_id: userId,
          },
        },
      )
    } else {
      // Mark all notifications as read
      await Notification.update({ is_read: true }, { where: { user_id: userId } })
    }

    res.json({ message: "Notifications marked as read" })
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    res.status(500).json({ message: "Error marking notifications as read" })
  }
})

module.exports = router

