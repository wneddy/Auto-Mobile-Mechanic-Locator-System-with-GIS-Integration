const express = require("express")
const router = express.Router()
const { Order, OrderItem, SparePart, User } = require("../models")
const validateToken = require("../middleware/validateToken")

// Create a new order
router.post("/", validateToken, async (req, res) => {
  try {
    const { items, paymentMethod, paymentDetails } = req.body
    const userId = req.userId

    // Validate request
    if (!items || !items.length || !paymentMethod) {
      return res.status(400).json({ message: "Invalid order data" })
    }

    // Create order
    const order = await Order.create({
      userId,
      status: "pending",
      paymentMethod,
      paymentDetails: JSON.stringify(paymentDetails),
      total: 0, // Will be calculated below
    })

    // Create order items and calculate total
    let total = 0
    const orderItems = []

    for (const item of items) {
      // Fetch part details from database
      const part = await SparePart.findByPk(item.id)

      if (!part) {
        continue // Skip if part not found
      }

      // Calculate item total
      const itemTotal = part.price * item.quantity
      total += itemTotal

      // Create order item
      const orderItem = await OrderItem.create({
        orderId: order.id,
        partId: part.id,
        quantity: item.quantity,
        price: part.price,
        total: itemTotal,
      })

      orderItems.push(orderItem)
    }

    // Update order total
    order.total = total
    await order.save()

    // Process payment
    let paymentResult

    if (paymentMethod === "mpesa") {
      paymentResult = await processMpesaPayment(paymentDetails.phoneNumber, total, order.id)
    } else {
      // Simulate successful payment for other methods
      paymentResult = {
        success: true,
        transactionId: "TRX" + Math.floor(Math.random() * 1000000),
      }
    }

    // Update order status based on payment result
    if (paymentResult.success) {
      order.status = "completed"
      order.paymentDetails = JSON.stringify({
        ...JSON.parse(order.paymentDetails),
        transactionId: paymentResult.transactionId,
      })
      await order.save()
    } else {
      order.status = "payment_failed"
      order.paymentDetails = JSON.stringify({
        ...JSON.parse(order.paymentDetails),
        error: paymentResult.error,
      })
      await order.save()

      return res.status(400).json({
        message: "Payment failed",
        error: paymentResult.error,
        orderId: order.id,
      })
    }

    // Return success response
    res.status(201).json({
      message: "Order created successfully",
      orderId: order.id,
      status: order.status,
      total: order.total,
    })
  } catch (error) {
    console.error("Error creating order:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Process M-Pesa payment
async function processMpesaPayment(phoneNumber, amount, orderId) {
  try {
    // This would be replaced with actual M-Pesa API integration
    console.log(`Processing M-Pesa payment of KES ${amount} from ${phoneNumber} for order ${orderId}`)

    // Simulate successful payment
    return {
      success: true,
      transactionId: "MPE" + Math.floor(Math.random() * 1000000),
    }

   
  } catch (error) {
    console.error("Error processing M-Pesa payment:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Get order by ID
router.get("/:id", validateToken, async (req, res) => {
  try {
    const orderId = req.params.id
    const userId = req.userId

    // Find order
    const order = await Order.findOne({
      where: { id: orderId, userId },
      include: [
        {
          model: OrderItem,
          include: [{ model: SparePart }],
        },
      ],
    })

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Format response
    const formattedOrder = {
      id: order.id,
      date: order.createdAt,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentDetails: JSON.parse(order.paymentDetails),
      total: order.total,
      items: order.OrderItems.map((item) => ({
        id: item.SparePart.id,
        name: item.SparePart.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
      })),
    }

    res.json(formattedOrder)
  } catch (error) {
    console.error("Error fetching order:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all orders for the current user
router.get("/", validateToken, async (req, res) => {
  try {
    const userId = req.userId

    // Find all orders for the user
    const orders = await Order.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    })

    res.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router

