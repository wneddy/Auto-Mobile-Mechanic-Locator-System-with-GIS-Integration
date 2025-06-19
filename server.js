require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const sequelize = require("./src/config/db")
const User = require("./backend/models/User") 
const db = require("./backend/models/index")
const authRoutes = require("./backend/routes/authRoutes") 
const mechanicRoutes = require("./backend/routes/mechanics") 
const adminProfilesRoutes = require("./backend/routes/admin-profiles")
const sparePartsRoutes = require("./backend/routes/spare-parts")
const usersRoutes = require("./backend/routes/users")
const dashboardRoutes = require("./backend/routes/dashboard")
const bookingsRoutes = require("./backend/routes/bookings")
const notificationRoutes = require("./backend/utils/notifications")
const path = require("path")
const cors = require("cors")
const http = require("http") // Import http module
const socketIo = require("socket.io") // Import socket.io
const favicon = require("serve-favicon")
const chatRoutes = require("./backend/routes/chat")
const Earnings = require("./backend/models/MechEarnings")
const ServiceRequest = require("./backend/models/ServiceRequest")
const vehicleOwnerRoutes = require("./backend/routes/vehicle-owners")

const app = express()

// Create an HTTP server and attach Socket.IO to it
const server = http.createServer(app)

app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://127.0.0.1:5501", "http://localhost:5500", "http://localhost:5501"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

const io = require("socket.io")(server, {
  cors: {
    origin: ["http://127.0.0.1:5500", "http://127.0.0.1:5501", "http://localhost:5500", "http://localhost:5501"],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

app.use(express.json()) // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })) // Middleware to parse URL-encoded bodies
app.use("/uploads", express.static("uploads"))

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "public"))
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.get("/mechanic-locator", (req, res) => {
  res.render("mechanic-locator") // No need to include .ejs
})

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")))

console.log("Static files served from:", path.join(__dirname, "public"))

// Serve static files from the 'src' directory if needed
app.use("/js", express.static(path.join(__dirname, "src/js")))

// Middleware
app.use(bodyParser.json())

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/vehicle-owner", vehicleOwnerRoutes) 
app.use("/api/mechanics", mechanicRoutes)
app.use("/api/admin-profiles", adminProfilesRoutes)
app.use("/api/spare-parts", sparePartsRoutes)
app.use("/api/vehicle-owners", vehicleOwnerRoutes)
app.use("/api/users", usersRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/bookings", bookingsRoutes)
app.use("/api/mechanic-requests", mechanicRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/chat", chatRoutes)

app.use((req, res, next) => {
  req.io = io // Attach socket instance to requests
  next()
})

// Add a route to get service request status updates
app.get("/api/service-request-status", require("./backend/middleware/validateToken"), async (req, res) => {
  try {
    const userId = req.userId

    // Find the vehicle owner profile
    const vehicleOwnerProfile = await db.VehicleOwnerProfiles.findOne({
      where: { user_id: userId },
    })

    if (!vehicleOwnerProfile) {
      return res.status(404).json({ message: "Vehicle owner profile not found" })
    }

    // Get service requests for this vehicle owner
    const serviceRequests = await db.ServiceRequest.findAll({
      where: { user_id: vehicleOwnerProfile.id },
      include: [
        {
          model: db.MechanicProfiles,
          as: "mechanic",
          attributes: ["id", "full_name", "phone"],
        },
      ],
      order: [["updated_at", "DESC"]],
    })

    res.json(serviceRequests)
  } catch (error) {
    console.error("Error fetching service request status:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/", (req, res) => {
  res.send("Welcome to the homepage!")
})

// **Single Socket.IO Connection Handling**
io.on("connection", (socket) => {
  console.log("A user connected")

  // Emit welcome message
  socket.emit("message", "Welcome to the Mechanic Locator!")

  // Handle Location Updates
  socket.on("locationUpdate", (data) => {
    console.log("Location Update:", data)
    io.emit("locationUpdate", data)
  })

  // Handle Chat Messages
  socket.on("chatMessage", async (data) => {
    console.log("Chat Message:", data)
    io.emit("chatMessage", data)
  })

  // Handle Accept Service Request
  socket.on("acceptRequest", (data) => {
    const { requestId, mechanicId } = data
    io.emit("serviceRequestAccepted", { requestId, mechanicId })
  })

  // Handle Decline Service Request
  socket.on("declineRequest", (data) => {
    const { requestId, mechanicId } = data
    io.emit("serviceRequestDeclined", { requestId, mechanicId })
  })

  // Handle Service Request Status Update
  socket.on("updateRequestStatus", async (data) => {
    const { requestId, status } = data
    try {
      const request = await ServiceRequest.findByPk(requestId)
      if (request) {
        await request.update({ status })
        io.emit("updateRequestStatus", { requestId, status })
      }
    } catch (error) {
      console.error("Error updating status:", error)
    }
  })

  // Handle Earnings Status Update
  socket.on("updateEarningsStatus", async (data) => {
    const { earningId, status } = data
    try {
      const earning = await Earnings.findByPk(earningId)
      if (earning) {
        await earning.update({ status })
        io.emit("updateEarningsStatus", { earningId, status })
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
    }
  })

  socket.on("locationUpdate", (data) => {
    // Broadcast the location update to other clients
    socket.broadcast.emit("locationUpdate", data)
  })

  socket.on("availabilityUpdate", (data) => {
    // Broadcast the availability update to other clients
    socket.broadcast.emit("availabilityUpdate", data)
  })

  // Handle Disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected")
  })
})

// Add a route to get current user info
app.get("/api/users/current", require("./backend/middleware/validateToken"), async (req, res) => {
  try {
    const db = require("./backend/models")
    const user = await db.User.findByPk(req.userId, {
      attributes: { exclude: ["password", "resetToken", "resetTokenExpiration"] },
    })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("Error fetching current user:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Something went wrong!" })
})

// Sync the database and start the server
const PORT = process.env.PORT || 5501
db.sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database synced successfully.")
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`)) 
  })
  .catch((error) => {
    console.error("Error syncing database:", error)
  })

module.exports = app

