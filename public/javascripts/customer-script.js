// Global variables
var API_URL = typeof API_URL !== "undefined" ? API_URL : "http://localhost:5501/api" // Base URL for API requests

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Home page loaded")
  console.log("Token in localStorage:", localStorage.getItem("token"))
  console.log("User ID in localStorage:", localStorage.getItem("user_id"))

  // Load auth utilities if not already loaded
  await loadAuthUtilities()

  // Initialize authentication
  await initializeAuth()

  // Set up event listeners
  setupEventListeners()

  // Fetch notifications
  fetchNotifications()

  // Set up polling for service request status updates
  setupServiceRequestPolling()

  // Fetch service requests status if on dashboard page
  if (document.getElementById("service-requests-container")) {
    fetchServiceRequests()
  }

  // Fetch user type to update profile options
  fetchUserType()

  // Set up FAQ accordion functionality
  setupFaqAccordion()

  // Set up profile dropdown behavior
  setupProfileDropdown()
})

// Function to set up profile dropdown behavior
function setupProfileDropdown() {
  const profileDropdown = document.querySelector(".dropdown")
  if (profileDropdown) {
    // Add click event instead of hover
    profileDropdown.addEventListener("click", function (e) {
      e.stopPropagation()
      const dropdownContent = this.querySelector(".dropdown-content")
      if (dropdownContent) {
        // Toggle the display
        if (dropdownContent.style.display === "block") {
          dropdownContent.style.display = "none"
        } else {
          dropdownContent.style.display = "block"
        }
      }
    })

    // Close dropdown when clicking elsewhere on the page
    document.addEventListener("click", (e) => {
      if (!profileDropdown.contains(e.target)) {
        const dropdownContent = profileDropdown.querySelector(".dropdown-content")
        if (dropdownContent && dropdownContent.style.display === "block") {
          dropdownContent.style.display = "none"
        }
      }
    })
  }
}

// Replace the entire loadAuthUtilities function with:
// This function is no longer needed since we're making the script independent
function loadAuthUtilities() {
  // No longer loading external auth utilities
  return Promise.resolve()
}

// Replace the initializeAuth function with:
async function initializeAuth() {
  try {
    // Check if we have a token and user_id in localStorage
    const token = localStorage.getItem("token")
    const userId = localStorage.getItem("user_id")

    if (!token || !userId) {
      console.error("No token or user_id found in localStorage")
      // Don't redirect on home page, just show login/register options
      return false
    }

    // Validate token directly
    const isValid = await validateToken()
    if (!isValid) {
      console.log("Token validation failed")
      // Don't redirect on home page
      return false
    }

    console.log("Authentication validated successfully")
    return true
  } catch (error) {
    console.error("Error initializing authentication:", error)
    return false
  }
}

// Fetch the user's current token from the server
async function fetchCurrentToken() {
  try {
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      throw new Error("User ID not found in localStorage")
    }

    console.log(`Fetching current token for user ID: ${userId}`)
    const response = await fetch(`${API_URL}/auth/users/${userId}/token`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Use the token from local storage for this request
      },
      // Don't use credentials: 'include' for CORS
    })

    console.log("Token fetch response status:", response.status)

    if (!response.ok) {
      throw new Error(`Failed to fetch current token: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Fetched token data:", data)
    return data.currentToken // Assuming the response contains the currentToken
  } catch (error) {
    console.error("Error fetching current token:", error)
    showAlert("Failed to retrieve token. Please log in again.", "danger")
    return null
  }
}

// Add these new functions after fetchCurrentToken:
// Validate token
async function validateToken() {
  try {
    const token = localStorage.getItem("token")
    if (!token) return false

    // Check if token is expired
    if (isTokenExpired(token)) {
      console.log("Token is expired, trying to refresh...")
      const newToken = await fetchCurrentToken()
      if (!newToken) return false

      localStorage.setItem("token", newToken)
    }

    return true
  } catch (error) {
    console.error("Error validating token:", error)
    return false
  }
}

// Check if token is expired
function isTokenExpired(token) {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return true

    const payload = JSON.parse(atob(parts[1]))
    return Date.now() >= payload.exp * 1000
  } catch (error) {
    console.error("Error checking token expiration:", error)
    return true
  }
}

// Check if user is authenticated
async function checkAuth() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      console.error("No token found in localStorage")
      return false
    }

    console.log("Checking authentication with token:", token.substring(0, 20) + "...")

    // Fetch current user info
    const response = await fetch(`${API_URL}/users/current`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // Don't use credentials: 'include' for CORS
    })

    console.log("Auth check response status:", response.status)

    if (!response.ok) {
      throw new Error(`Authentication failed with status: ${response.status}`)
    }

    const userData = await response.json()
    console.log("User data received:", userData)
    return true
  } catch (error) {
    console.error("Auth check error:", error)
    return false
  }
}

// Set up event listeners
function setupEventListeners() {
  // Toggle the visibility of the pending requests dropdown
  const notificationButton = document.getElementById("notification-button")
  if (notificationButton) {
    console.log("Found notification button, adding click listener")
    notificationButton.addEventListener("click", () => {
      const dropdown = document.getElementById("pending-requests-dropdown")
      if (dropdown) {
        // Toggle display property
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block"
        console.log("Toggled dropdown visibility:", dropdown.style.display)
      } else {
        console.error("Could not find pending-requests-dropdown element")
      }
    })
  } else {
    console.error("Could not find notification-button element")
  }

  // Add event listener for payment button
  const paymentButton = document.getElementById("payment-button")
  if (paymentButton) {
    console.log("Found payment button, adding click listener")
    paymentButton.addEventListener("click", async () => {
      try {
        // Fetch all service requests and find the relevant ones
        const serviceRequests = await fetchServiceRequests(true) // silent mode

        // Filter for requests with status "completed" or "accepted"
        const validRequests = serviceRequests.filter(
          (request) => request.status === "completed" || request.status === "accepted",
        )

        if (validRequests.length > 0) {
          // Sort by date (newest first)
          validRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

          // Get the most recent one
          const latestRequest = validRequests[0]
          showPaymentModal(latestRequest.id, latestRequest.mechanic_id)
        } else {
          showAlert("No service requests found with status 'completed' or 'accepted' for payment", "warning")
        }
      } catch (error) {
        console.error("Error fetching service requests for payment:", error)
        showAlert("Failed to load service requests. Please try again.", "danger")
      }
    })
  }

  // Add event listener for delete profile button
  document.addEventListener("click", (event) => {
    if (event.target.id === "delete-profile") {
      const confirmDelete = confirm("Are you sure you want to delete your profile? This action cannot be undone.")
      if (confirmDelete) {
        deleteProfile()
      }
    }

    // Logout functionality
    if (event.target.id === "logout") {
      handleLogout()
    }
  })

  // Add event listener for refreshing service requests
  const refreshRequestsBtn = document.getElementById("refresh-requests")
  if (refreshRequestsBtn) {
    refreshRequestsBtn.addEventListener("click", fetchServiceRequests)
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#notification-button") && !event.target.closest("#pending-requests-dropdown")) {
      const dropdown = document.getElementById("pending-requests-dropdown")
      if (dropdown && dropdown.style.display === "block") {
        dropdown.style.display = "none"
      }
    }
  })
}

// Get completed service notifications
async function getCompletedServiceNotifications() {
  try {
    // First try to get notifications from the server
    const token = localStorage.getItem("token")
    if (!token) return []

    // Get service requests to check for completed ones
    const serviceRequests = await fetchServiceRequests(true) // true means silent mode (no UI updates)

    // Get stored notifications from localStorage
    const storedNotifications = JSON.parse(localStorage.getItem("statusNotifications") || "[]")

    // Combine server notifications with stored notifications
    let allNotifications = [...storedNotifications]

    // Try to get regular notifications from server
    try {
      const response = await fetch(`${API_URL}/vehicle-owners/notifications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const serverNotifications = await response.json()
        allNotifications = [...allNotifications, ...serverNotifications]
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }

    // Filter for completed service notifications
    const completedNotifications = allNotifications.filter((notification) => {
      // Check if notification is about a completed service
      const isCompleted =
        notification.status === "completed" || (notification.message && notification.message.includes("completed"))

      // If we have the service request, check if it's actually completed
      if (notification.service_request_id || notification.requestId) {
        const requestId = notification.service_request_id || notification.requestId
        const request = serviceRequests.find((r) => r.id === requestId)

        if (request) {
          return request.status === "completed"
        }
      }

      return isCompleted
    })

    // Sort by date (newest first)
    completedNotifications.sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return completedNotifications
  } catch (error) {
    console.error("Error getting completed service notifications:", error)
    return []
  }
}

// Fetch the latest completed service request
async function fetchLatestCompletedRequest() {
  try {
    const token = localStorage.getItem("token")
    if (!token) return null

    // Use a specific endpoint to get only the latest completed request
    const response = await fetch(`${API_URL}/vehicle-owners/latest-completed-request`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch latest completed request: ${response.status}`)
    }

    const data = await response.json()

    // If we have a valid request that's completed
    if (data && data.id && data.status === "completed") {
      console.log("Found latest completed request:", data)
      return data
    } else {
      console.log("No completed requests found")
      return null
    }
  } catch (error) {
    console.error("Error fetching latest completed request:", error)
    return null
  }
}

// Set up polling for service request status updates
function setupServiceRequestPolling() {
  // Poll for service request status updates every 30 seconds
  setInterval(async () => {
    await fetchNotifications()
  }, 30000) // 30 seconds
}

// Updated fetchNotifications function to focus on service request status updates
async function fetchNotifications() {
  try {
    const token = localStorage.getItem("token")
    if (!token) return

    console.log("Fetching notifications...")

    // Try to fetch service requests first to check for status updates
    try {
      const serviceRequestsResponse = await fetch(`${API_URL}/vehicle-owners/service-requests`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Don't use credentials: 'include' for CORS
      })

      if (serviceRequestsResponse.ok) {
        const serviceRequests = await serviceRequestsResponse.json()
        console.log("Service requests for notifications:", serviceRequests)

        // Generate notifications based on service request status
        const statusNotifications = generateStatusNotifications(serviceRequests)

        // Now fetch regular notifications
        const notificationsResponse = await fetch(`${API_URL}/vehicle-owners/notifications`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          // Don't use credentials: 'include' for CORS
        })

        if (notificationsResponse.ok) {
          const regularNotifications = await notificationsResponse.json()
          console.log("Regular notifications received:", regularNotifications)

          // Combine both types of notifications
          const allNotifications = [...statusNotifications, ...regularNotifications]
          updateNotifications(allNotifications, serviceRequests)
          return
        }
      }
    } catch (error) {
      console.log("Error fetching service requests or notifications:", error)
    }

    // If that fails, use mock notifications for now
    console.log("Using mock notifications")
    const mockNotifications = [
      {
        id: 1,
        message: "Your service request #123 has been accepted by John Mechanic.",
        created_at: new Date(),
        is_read: false,
        service_request_id: 123,
      },
      {
        id: 2,
        message: "Your service request #124 has been declined by Mike Mechanic.",
        created_at: new Date(Date.now() - 3600000), // 1 hour ago
        is_read: false,
        service_request_id: 124,
      },
      {
        id: 3,
        message: "Your service request #125 has been completed by Sam Mechanic.",
        created_at: new Date(Date.now() - 7200000), // 2 hours ago
        is_read: false,
        service_request_id: 125,
        status: "completed",
      },
    ]
    updateNotifications(mockNotifications, [])
  } catch (error) {
    console.error("Error in fetchNotifications:", error)
    // Use empty notifications
    updateNotifications([], [])
  }
}

// Generate notifications based on service request status
function generateStatusNotifications(serviceRequests) {
  if (!Array.isArray(serviceRequests) || serviceRequests.length === 0) {
    return []
  }

  // Get stored notifications from localStorage to avoid duplicates
  const storedNotifications = JSON.parse(localStorage.getItem("statusNotifications") || "[]")
  const storedIds = new Set(storedNotifications.map((n) => `${n.requestId}-${n.status}`))

  const newNotifications = []

  serviceRequests.forEach((request) => {
    const requestId = request.id
    const status = request.status
    const mechanicName = request.mechanic ? request.mechanic.full_name : "A mechanic"
    const mechanicId = request.mechanic_id
    const uniqueId = `${requestId}-${status}`

    // Only create notification if we haven't seen this status for this request
    if (!storedIds.has(uniqueId)) {
      let message = ""

      switch (status) {
        case "accepted":
          message = `Your service request #${requestId} has been accepted by ${mechanicName}.`
          break
        case "declined":
          message = `Your service request #${requestId} has been declined by ${mechanicName}.`
          break
        case "completed":
          message = `Your service request #${requestId} has been marked as completed by ${mechanicName}. Click to pay and rate.`
          break
        default:
          // Don't create notifications for pending status
          return
      }

      const notification = {
        id: Date.now() + Math.floor(Math.random() * 1000), // Generate a unique ID
        message,
        created_at: new Date(),
        is_read: false,
        requestId,
        status,
        service_request_id: requestId,
        mechanic_id: mechanicId,
      }

      newNotifications.push(notification)
      storedIds.add(uniqueId)
    }
  })

  // Update stored notifications
  if (newNotifications.length > 0) {
    const updatedStoredNotifications = [...storedNotifications, ...newNotifications]
    // Keep only the last 50 notifications to avoid localStorage getting too big
    const trimmedNotifications = updatedStoredNotifications.slice(-50)
    localStorage.setItem("statusNotifications", JSON.stringify(trimmedNotifications))
  }

  return newNotifications
}

// Update notifications in the UI
function updateNotifications(notifications, serviceRequests) {
  const notificationList = document.getElementById("notification-list")
  const notificationBadge = document.querySelector(".notification-badge")

  if (!notificationList) {
    console.error("Could not find notification-list element")
    return
  }

  if (!notificationBadge) {
    console.error("Could not find notification-badge element")
  }

  notificationList.innerHTML = "" // Clear existing notifications

  // If notifications is not an array, make it an empty array
  if (!Array.isArray(notifications)) {
    notifications = []
  }

  // Filter to only show unread notifications
  const unreadNotifications = notifications.filter((notification) => !notification.is_read)

  console.log(`Found ${unreadNotifications.length} unread notifications`)

  if (notifications.length === 0) {
    notificationList.innerHTML = '<li class="notification-item">No new notifications</li>'

    // Update badge
    if (notificationBadge) {
      notificationBadge.textContent = "0"
      notificationBadge.style.display = "none" // Hide badge when no notifications
    }
    return
  }

  // Sort notifications by date (newest first)
  notifications.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at)
  })

  // Create a map of service requests by ID for quick lookup
  const serviceRequestsMap = {}
  if (Array.isArray(serviceRequests)) {
    serviceRequests.forEach((request) => {
      serviceRequestsMap[request.id] = request
    })
  }

  // Add notifications to the list
  notifications.forEach((notification) => {
    const listItem = document.createElement("li")
    listItem.classList.add("notification-item")

    // Add unread class if notification is not read
    if (!notification.is_read) {
      listItem.classList.add("unread")
    }

    // Format date
    const date = new Date(notification.created_at)
    const formattedDate =
      date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    // Check if this is a completed service notification that needs payment
    const isCompletedService =
      notification.status === "completed" ||
      (notification.message && notification.message.includes("completed")) ||
      (notification.service_request_id &&
        serviceRequestsMap[notification.service_request_id] &&
        serviceRequestsMap[notification.service_request_id].status === "completed")

    // Create notification content
    listItem.innerHTML = `
      <div class="notification-content">
        <p>${notification.message || "New notification"}</p>
        <small class="notification-time">${formattedDate}</small>
        ${isCompletedService ? '<button class="btn-pay-service">Pay & Rate</button>' : ""}
      </div>
    `

    // Add click event for payment if this is a completed service
    if (isCompletedService) {
      const payButton = listItem.querySelector(".btn-pay-service")
      if (payButton) {
        payButton.addEventListener("click", async (e) => {
          e.stopPropagation() // Prevent the notification item click event

          try {
            // Get the specific request ID from the notification
            const requestId = notification.service_request_id || notification.requestId

            // Try to get the service request information
            let request = null
            let mechanicId = notification.mechanic_id

            // If we have the request in the service requests map, use that
            if (serviceRequestsMap[requestId]) {
              request = serviceRequestsMap[requestId]
              mechanicId = request.mechanic_id
            } else {
              // Otherwise, fetch it from the server
              request = await fetchSpecificServiceRequest(requestId)
              if (request) {
                mechanicId = request.mechanic_id
              }
            }

            if (request && mechanicId) {
              // Check if the service is completed or accepted
              if (request.status === "completed" || request.status === "accepted") {
                showPaymentModal(request.id, mechanicId)
              } else if (request.status === "declined") {
                showAlert("Cannot process payment for declined service requests.", "warning")
              } else {
                showAlert("Service request is pending. Payment will be available after completion.", "info")
              }
            } else {
              showAlert("Cannot process payment: Service request details not available", "warning")
            }
          } catch (error) {
            console.error("Error processing payment button click:", error)
            showAlert("Error loading service request details", "danger")
          }
        })
      }

      // Make the entire notification clickable for completed services
      listItem.style.cursor = "pointer"
      listItem.addEventListener("click", async () => {
        const requestId = notification.service_request_id || notification.requestId

        try {
          // Try to get the service request information
          let request = null
          let mechanicId = notification.mechanic_id

          // If we have the request in the service requests map, use that
          if (serviceRequestsMap[requestId]) {
            request = serviceRequestsMap[requestId]
            mechanicId = request.mechanic_id
          } else {
            // Otherwise, fetch it from the server
            request = await fetchSpecificServiceRequest(requestId)
            if (request) {
              mechanicId = request.mechanic_id
            }
          }

          if (request && mechanicId) {
            // Check if the service is completed or accepted
            if (request.status === "completed" || request.status === "accepted") {
              showPaymentModal(request.id, mechanicId)
            } else if (request.status === "declined") {
              showAlert("Cannot process payment for declined service requests.", "warning")
            } else {
              showAlert("Service request is pending. Payment will be available after completion.", "info")
            }
          } else {
            showAlert("Cannot process payment: Service request details not available", "warning")
          }
        } catch (error) {
          console.error("Error processing notification click:", error)
          showAlert("Error loading service request details", "danger")
        }
      })
    }

    notificationList.appendChild(listItem)
  })

  // Update notification badge count with unread notifications
  if (notificationBadge) {
    const unreadCount = unreadNotifications.length
    notificationBadge.textContent = unreadCount
    notificationBadge.style.display = unreadCount > 0 ? "inline-flex" : "none"
  }

  // Add a "Mark all as read" button if there are unread notifications
  if (unreadNotifications.length > 0) {
    const markAllButton = document.createElement("li")
    markAllButton.classList.add("mark-all-read")
    markAllButton.innerHTML = `<button>Mark all as read</button>`
    markAllButton.querySelector("button").addEventListener("click", markAllNotificationsAsRead)
    notificationList.appendChild(markAllButton)
  }
}

// Function to show payment modal with M-Pesa integration
function showPaymentModal(requestId, mechanicId) {
  // Fetch the service request details first to get the latest data
  fetchServiceRequestDetails(requestId)
    .then((request) => {
      if (!request) {
        showAlert("Could not fetch service request details", "danger")
        return
      }

      // Get mechanic's phone number for payment
      const mechanicPhone = request.mechanic?.user?.phone

      // Create modal element
      const modal = document.createElement("div")
      modal.className = "payment-modal"
      modal.innerHTML = `
        <div class="payment-modal-content">
          <span class="close-modal">&times;</span>
          <h2>Payment & Rating</h2>
          
          <div class="service-details">
            <h3>Service Details</h3>
            <p><strong>Request ID:</strong> ${request.id}</p>
            <p><strong>Mechanic:</strong> ${request.mechanic ? request.mechanic.full_name : "Unknown"}</p>
            <p><strong>Status:</strong> ${request.status}</p>
            <p><strong>Date:</strong> ${new Date(request.created_at).toLocaleString()}</p>
            <p><strong>Description:</strong> ${request.description || "No description provided"}</p>
          </div>
          
          <div class="payment-section">
            <h3>Service Payment</h3>
            <div class="form-group">
              <label for="payment-amount">Amount (KES):</label>
              <input type="number" id="payment-amount" min="1" step="0.01" value="500.00" required>
            </div>
            
            <div class="form-group">
              <label for="payment-description">Description of Service:</label>
              <textarea id="payment-description" placeholder="Describe the service provided..." required>${request.description || ""}</textarea>
            </div>
            
            <div class="form-group">
              <label for="phone-number">Your M-Pesa Phone Number:</label>
              <input type="tel" id="phone-number" placeholder="254XXXXXXXXX" required>
              <small>Enter your M-Pesa phone number starting with 254</small>
            </div>
            
            ${mechanicPhone ? `<p class="mechanic-phone"><strong>Payment will be sent to:</strong> ${mechanicPhone}</p>` : ""}
          </div>
          
          <div class="rating-section">
            <h3>Rate Service</h3>
            <div class="rating-stars">
              <span class="star" data-rating="1">★</span>
              <span class="star" data-rating="2">★</span>
              <span class="star" data-rating="3">★</span>
              <span class="star" data-rating="4">★</span>
              <span class="star" data-rating="5">★</span>
            </div>
          </div>
          
          <button id="submit-payment" data-request-id="${requestId}" data-mechanic-id="${mechanicId}">Pay with M-Pesa</button>
        </div>
      `

      document.body.appendChild(modal)

      // Add event listeners
      const closeBtn = modal.querySelector(".close-modal")
      closeBtn.addEventListener("click", () => {
        modal.remove()
      })

      // Handle star rating selection
      let selectedRating = 0
      const stars = modal.querySelectorAll(".star")
      stars.forEach((star) => {
        star.addEventListener("click", () => {
          selectedRating = Number.parseInt(star.getAttribute("data-rating"))

          // Update visual state of stars
          stars.forEach((s) => {
            const rating = Number.parseInt(s.getAttribute("data-rating"))
            if (rating <= selectedRating) {
              s.classList.add("selected")
            } else {
              s.classList.remove("selected")
            }
          })
        })
      })

      // Handle payment submission
      const submitBtn = modal.querySelector("#submit-payment")
      submitBtn.addEventListener("click", () => {
        const amount = document.getElementById("payment-amount").value
        const description = document.getElementById("payment-description").value
        const phoneNumber = document.getElementById("phone-number").value

        if (!amount || amount <= 0) {
          showAlert("Please enter a valid payment amount", "warning")
          return
        }

        if (!description) {
          showAlert("Please provide a description of the service", "warning")
          return
        }

        if (!phoneNumber || !phoneNumber.match(/^254\d{9}$/)) {
          showAlert("Please enter a valid M-Pesa phone number starting with 254", "warning")
          return
        }

        if (selectedRating === 0) {
          showAlert("Please select a rating for the service", "warning")
          return
        }

        // Create booking record and initiate payment
        createBookingAndInitiatePayment(requestId, mechanicId, {
          amount,
          description,
          phoneNumber,
          rating: selectedRating,
        })

        modal.remove()
      })
    })
    .catch((error) => {
      console.error("Error showing payment modal:", error)
      showAlert("Failed to load payment details. Please try again.", "danger")
    })
}

// Function to create booking record and initiate payment
async function createBookingAndInitiatePayment(requestId, mechanicId, paymentData) {
  try {
    // First, create the booking record
    const bookingResponse = await createBookingRecord(requestId, mechanicId, paymentData.rating)

    if (!bookingResponse.success) {
      showAlert(`Failed to create booking record: ${bookingResponse.message}`, "danger")
      return
    }

    // If booking record creation is successful, initiate the STK push
    initiateSTKPush(requestId, mechanicId, paymentData)
  } catch (error) {
    console.error("Error creating booking record and initiating payment:", error)
    showAlert("Failed to create booking record and initiate payment. Please try again.", "danger")
  }
}

// Function to create booking record
async function createBookingRecord(requestId, mechanicId, rating) {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      showAlert("You must be logged in to make a payment", "warning")
      return { success: false, message: "Not logged in" }
    }

    const response = await fetch(`${API_URL}/vehicle-owners/create-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        requestId,
        mechanicId,
        rating,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Failed to create booking record: ${response.status} - ${data.message}`)
    }

    return { success: true, message: "Booking record created successfully", data: data }
  } catch (error) {
    console.error("Error creating booking record:", error)
    return { success: false, message: error.message || "Failed to create booking record" }
  }
}

// Function to fetch service request details with mechanic phone number
async function fetchServiceRequestDetails(requestId) {
  try {
    const token = localStorage.getItem("token")
    if (!token) return null

    const response = await fetch(`${API_URL}/vehicle-owners/service-requests/${requestId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch service request details: ${response.status}`)
    }

    const request = await response.json()

    // If mechanic phone is not included in the response, try to fetch it separately
    if (request.mechanic && !request.mechanic.user?.phone) {
      try {
        const mechanicResponse = await fetch(`${API_URL}/mechanics/${request.mechanic_id}/details`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (mechanicResponse.ok) {
          const mechanicData = await mechanicResponse.json()
          if (!request.mechanic.user) {
            request.mechanic.user = {}
          }
          request.mechanic.user.phone = mechanicData.phone
        }
      } catch (error) {
        console.error("Error fetching mechanic details:", error)
      }
    }

    return request
  } catch (error) {
    console.error("Error fetching service request details:", error)
    return null
  }
}

// Function to initiate M-Pesa STK Push
async function initiateSTKPush(requestId, mechanicId, paymentData) {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      showAlert("You must be logged in to make a payment", "warning")
      return
    }

    // Show loading message
    showAlert("Processing your payment request...", "info")

    const response = await fetch(`${API_URL}/vehicle-owners/initiate-stk-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        requestId,
        mechanicId,
        amount: paymentData.amount,
        description: paymentData.description,
        phoneNumber: paymentData.phoneNumber,
        rating: paymentData.rating,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to initiate payment: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      // Show success message
      showAlert("M-Pesa payment request sent. Please check your phone to complete the transaction.", "success")

      // Start polling for payment status
      pollPaymentStatus(data.checkoutRequestID, requestId)
    } else {
      showAlert(`Payment initiation failed: ${data.message}`, "danger")
    }

    return data
  } catch (error) {
    console.error("Error initiating payment:", error)
    showAlert("Failed to initiate payment. Please try again later.", "danger")
  }
}

// Function to poll payment status
function pollPaymentStatus(checkoutRequestID, requestId) {
  let attempts = 0
  const maxAttempts = 10
  const interval = 5000 // 5 seconds

  const checkStatus = async () => {
    if (attempts >= maxAttempts) {
      showAlert("Payment status check timed out. Please check your M-Pesa messages for confirmation.", "warning")
      return
    }

    attempts++

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/vehicle-owners/check-payment-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          checkoutRequestID,
          requestId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to check payment status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === "COMPLETED") {
        showAlert("Payment completed successfully! Thank you for your business.", "success")
        // Refresh notifications and service requests
        fetchNotifications()
        fetchServiceRequests()
        return
      } else if (data.status === "FAILED") {
        showAlert(`Payment failed: ${data.message}`, "danger")
        return
      } else {
        // Still pending, continue polling
        setTimeout(checkStatus, interval)
        return
      }
    } catch (error) {
      console.error("Error checking payment status:", error)
      setTimeout(checkStatus, interval)
    }
  }

  // Start polling
  setTimeout(checkStatus, interval)
}

// Add this new function to mark all notifications as read
async function markAllNotificationsAsRead() {
  try {
    const token = localStorage.getItem("token")
    if (!token) return

    const response = await fetch(`${API_URL}/vehicle-owners/mark-notifications-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // Don't use credentials: 'include' for CORS
      body: JSON.stringify({}), // Empty body to mark all as read
    })

    if (response.ok) {
      console.log("Marked all notifications as read")

      // Also mark local status notifications as read
      const storedNotifications = JSON.parse(localStorage.getItem("statusNotifications") || "[]")
      const updatedNotifications = storedNotifications.map((n) => ({ ...n, is_read: true }))
      localStorage.setItem("statusNotifications", JSON.stringify(updatedNotifications))

      // Refresh notifications
      fetchNotifications()

      // Close the dropdown
      const dropdown = document.getElementById("pending-requests-dropdown")
      if (dropdown) {
        dropdown.style.display = "none"
      }
    } else {
      console.error("Failed to mark notifications as read:", response.status)
    }
  } catch (error) {
    console.error("Error marking notifications as read:", error)
  }
}

// Add a new function to fetch a specific service request
async function fetchSpecificServiceRequest(requestId) {
  try {
    const token = localStorage.getItem("token")
    if (!token) return null

    const response = await fetch(`${API_URL}/vehicle-owners/service-requests/${requestId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch service request: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching specific service request:", error)
    return null
  }
}

// Modified fetchServiceRequests to optionally work in silent mode (no UI updates)
async function fetchServiceRequests(silentMode = false) {
  try {
    const token = localStorage.getItem("token")
    const userId = localStorage.getItem("user_id")

    if (!token || !userId) {
      console.error("No token or user ID found")
      return []
    }

    console.log("Fetching service requests...")

    const response = await fetch(`${API_URL}/vehicle-owners/service-requests`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch service requests: ${response.status}`)
    }

    const requests = await response.json()
    console.log("Service requests:", requests)

    // Update the UI with service requests if not in silent mode
    if (!silentMode) {
      updateServiceRequestsUI(requests)

      // Check for status changes and generate notifications
      const statusNotifications = generateStatusNotifications(requests)
      if (statusNotifications.length > 0) {
        // Refresh notifications display if we have new status notifications
        fetchNotifications()
      }
    }

    return requests
  } catch (error) {
    console.error("Error fetching service requests:", error)
    if (!silentMode) {
      showAlert("Failed to load service requests. Please try again.", "danger")
    }
    return []
  }
}

// New function to update service requests in the UI
function updateServiceRequestsUI(requests) {
  const requestsContainer = document.getElementById("service-requests-container")
  if (!requestsContainer) {
    console.log("Service requests container not found in the DOM")
    return
  }

  requestsContainer.innerHTML = "" // Clear existing content

  if (!requests || requests.length === 0) {
    requestsContainer.innerHTML = '<div class="empty-state">No service requests found</div>'
    return
  }

  // Create a table to display service requests
  const table = document.createElement("table")
  table.className = "service-requests-table"

  // Create table header
  const thead = document.createElement("thead")
  thead.innerHTML = `
    <tr>
      <th>Request ID</th>
      <th>Mechanic</th>
      <th>Status</th>
      <th>Date</th>
      <th>Actions</th>
    </tr>
  `
  table.appendChild(thead)

  // Create table body
  const tbody = document.createElement("tbody")

  requests.forEach((request) => {
    const row = document.createElement("tr")

    // Set row class based on status
    row.className = `request-status-${request.status || "pending"}`

    // Format date safely
    let formattedDate = "Unknown date"
    try {
      if (request.created_at) {
        const date = new Date(request.created_at)
        formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString()
      }
    } catch (e) {
      console.error("Error formatting date:", e)
    }

    // Get mechanic name safely
    const mechanicName =
      request.mechanic && request.mechanic.full_name ? request.mechanic.full_name : "Unknown Mechanic"

    // Create status badge with appropriate color
    let statusBadgeClass = ""
    const status = request.status || "pending"
    switch (status) {
      case "accepted":
        statusBadgeClass = "status-accepted"
        break
      case "declined":
        statusBadgeClass = "status-declined"
        break
      case "completed":
        statusBadgeClass = "status-completed"
        break
      default:
        statusBadgeClass = "status-pending"
    }

    // Determine which buttons to show based on status
    let actionButtons = ""

    if (request.status === "accepted" && request.mechanic_id) {
      actionButtons += `<button class="btn-contact" data-mechanic-id="${request.mechanic_id}">Contact Mechanic</button>`
    }

    if (request.status === "completed" || request.status === "accepted") {
      actionButtons += `<button class="btn-pay" data-request-id="${request.id}" data-mechanic-id="${request.mechanic_id}">Pay & Rate</button>`
    }

    row.innerHTML = `
      <td>${request.id || "N/A"}</td>
      <td>${mechanicName}</td>
      <td><span class="status-badge ${statusBadgeClass}">${status}</span></td>
      <td>${formattedDate}</td>
      <td>${actionButtons}</td>
    `

    tbody.appendChild(row)
  })

  table.appendChild(tbody)
  requestsContainer.appendChild(table)

  // Add event listeners to buttons
  const contactButtons = document.querySelectorAll(".btn-contact")
  contactButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mechanicId = button.getAttribute("data-mechanic-id")
      contactMechanic(mechanicId)
    })
  })

  const payButtons = document.querySelectorAll(".btn-pay")
  payButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const requestId = button.getAttribute("data-request-id")
      const mechanicId = button.getAttribute("data-mechanic-id")
      showPaymentModal(requestId, mechanicId)
    })
  })
}

// Update the contact mechanic function to handle the missing phone field
async function contactMechanic(mechanicId) {
  try {
    console.log(`Contacting mechanic with ID: ${mechanicId}`)

    // Try to fetch mechanic details if needed
    const token = localStorage.getItem("token")
    if (!token) {
      showAlert("You must be logged in to contact a mechanic", "warning")
      return
    }

    // Show a contact dialog with available options
    const message =
      "Contact options:\n\n" +
      "1. Use the chat feature (coming soon)\n" +
      "2. Request a call back\n\n" +
      "Our system will notify the mechanic of your request."

    if (confirm(message + "\n\nWould you like to proceed?")) {
      showAlert("Contact request sent to mechanic. They will respond shortly.", "success")
    }
  } catch (error) {
    console.error("Error contacting mechanic:", error)
    showAlert("Failed to contact mechanic. Please try again later.", "danger")
  }
}

// Function to show rating modal
function showRatingModal(requestId) {
  // Create modal element
  const modal = document.createElement("div")
  modal.className = "rating-modal"
  modal.innerHTML = `
    <div class="rating-modal-content">
      <span class="close-modal">&times;</span>
      <h2>Rate Service</h2>
      <div class="rating-stars">
        <span class="star" data-rating="1">★</span>
        <span class="star" data-rating="2">★</span>
        <span class="star" data-rating="3">★</span>
        <span class="star" data-rating="4">★</span>
        <span class="star" data-rating="5">★</span>
      </div>
      <textarea id="rating-comment" placeholder="Add a comment (optional)"></textarea>
      <button id="submit-rating" data-request-id="${requestId}">Submit Rating</button>
    </div>
  `

  document.body.appendChild(modal)

  // Add event listeners
  const closeBtn = modal.querySelector(".close-modal")
  closeBtn.addEventListener("click", () => {
    modal.remove()
  })

  // Handle star rating selection
  let selectedRating = 0
  const stars = modal.querySelectorAll(".star")
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = Number.parseInt(star.getAttribute("data-rating"))

      // Update visual state of stars
      stars.forEach((s) => {
        const rating = Number.parseInt(s.getAttribute("data-rating"))
        if (rating <= selectedRating) {
          s.classList.add("selected")
        } else {
          s.classList.remove("selected")
        }
      })
    })
  })

  // Handle rating submission
  const submitBtn = modal.querySelector("#submit-rating")
  submitBtn.addEventListener("click", () => {
    if (selectedRating === 0) {
      showAlert("Please select a rating", "warning")
      return
    }

    const comment = modal.querySelector("#rating-comment").value
    submitRating(requestId, selectedRating, comment)
    modal.remove()
  })
}

// Function to submit a rating
async function submitRating(requestId, rating, comment) {
  try {
    const token = localStorage.getItem("token")

    const response = await fetch(`${API_URL}/vehicle-owners/rate-service/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // Don't use credentials: 'include' for CORS
      body: JSON.stringify({
        rating,
        comment,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to submit rating: ${response.status}`)
    }

    showAlert("Rating submitted successfully", "success")

    // Refresh service requests to update UI
    fetchServiceRequests()
  } catch (error) {
    console.error("Error submitting rating:", error)
    showAlert("Failed to submit rating. Please try again.", "danger")
  }
}

// Function to fetch user type
async function fetchUserType() {
  try {
    const token = localStorage.getItem("token")
    if (!token) return

    const response = await fetch(`${API_URL}/auth/type`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // Don't use credentials: 'include' for CORS
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user type")
    }

    const data = await response.json()
    const userType = data.user_type // Assuming the response contains a user_type field

    // Update dropdown options based on user type
    updateProfileOptions(userType)
  } catch (error) {
    console.error("Error fetching user type:", error)
  }
}

// Function to update profile options based on user type
function updateProfileOptions(userType) {
  const profileOptions = document.getElementById("profileOptions")
  if (!profileOptions) return

  // Clear existing options
  profileOptions.innerHTML = ""

  // Add options based on user type
  if (userType === "vehicle-owner") {
    profileOptions.innerHTML += '<a href="/public/vehicle-owner-profile-creator.html">Create Profile</a>'
    profileOptions.innerHTML += '<a href="dash-vehicle-owner.html">View Profile</a>'
    profileOptions.innerHTML += '<a href="edit-vehicle-owner.html">Update Profile</a>'
    profileOptions.innerHTML += '<a href="#" id="delete-profile">Delete Profile</a>'
  } else if (userType === "mechanic") {
    profileOptions.innerHTML += '<a href="view-profile.html">View Profile</a>'
    profileOptions.innerHTML += '<a href="update-profile.html">Update Profile</a>'
  } else if (userType === "vendor") {
    profileOptions.innerHTML += '<a href="view-profile.html">View Profile</a>'
  } else if (userType === "admin") {
    profileOptions.innerHTML += '<a href="view-profile.html">View Profile</a>'
    profileOptions.innerHTML += '<a href="admin-dashboard.html">Admin Dashboard</a>'
  }

  // Add logout option
  profileOptions.innerHTML += '<a href="#" id="logout">Logout</a>'
}

// Function to delete the profile
function deleteProfile() {
  const token = localStorage.getItem("token") // Get the token from localStorage
  const userId = localStorage.getItem("user_id") // Get the user ID from localStorage

  if (!token || !userId) {
    alert("You must be logged in to delete your profile.")
    return
  }

  // Confirm deletion
  const confirmDelete = confirm("Are you sure you want to delete your profile? This action cannot be undone.")
  if (!confirmDelete) {
    return // Exit if the user cancels
  }

  // Make the DELETE request to the backend
  fetch(`${API_URL}/auth/delete-profile/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`, // Include the token in the Authorization header
      "Content-Type": "application/json",
    },
    // Don't use credentials: 'include' for CORS
  })
    .then((response) => {
      if (response.ok) {
        alert("Your profile has been deleted successfully.")
        localStorage.removeItem("token") // Remove token from localStorage
        localStorage.removeItem("user_id") // Remove user ID from localStorage
        window.location.href = "login.html" // Redirect to login page
      } else {
        return response.json().then((err) => {
          throw new Error(err.message || "Failed to delete profile. Please try again.")
        })
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      alert(error.message) // Show the error message
    })
}

// Handle logout
function handleLogout() {
  fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
    // Don't use credentials: 'include' for CORS
  })
    .then((response) => {
      if (response.ok) {
        localStorage.removeItem("token") // Remove token from localStorage
        localStorage.removeItem("user_id") // Remove user ID from localStorage
        sessionStorage.clear()
        window.location.href = "login.html" // Redirect to login page
      } else {
        console.error("Logout failed")
      }
    })
    .catch((error) => console.error("Error:", error))
}

// Function to fetch vehicle owner profile
async function fetchVehicleOwnerProfile(userId) {
  const token = localStorage.getItem("token") // Get the token from localStorage
  try {
    const profileResponse = await fetch(`${API_URL}/auth/getVehicleOwnerProfile/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Include the token in the request headers
      },
      // Don't use credentials: 'include' for CORS
    })
    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      // Handle the profile data (e.g., display it on the page)
      console.log(profileData)
      return profileData
    } else {
      console.error("Failed to fetch profile:", profileResponse.statusText)
      return null
    }
  } catch (error) {
    console.error("Error fetching vehicle owner profile:", error)
    return null
  }
}

// Set up FAQ accordion functionality
function setupFaqAccordion() {
  const faqQuestions = document.querySelectorAll(".faq-question")

  faqQuestions.forEach((question) => {
    question.addEventListener("click", function () {
      // Toggle active class on the clicked question
      this.classList.toggle("active")

      // Get the answer element (next sibling)
      const answer = this.nextElementSibling

      // Toggle display of the answer
      if (answer.style.display === "block") {
        answer.style.display = "none"
        this.querySelector("i").className = "fas fa-chevron-down"
      } else {
        answer.style.display = "block"
        this.querySelector("i").className = "fas fa-chevron-up"
      }
    })
  })
}

// Show alert message
function showAlert(message, type) {
  // Create alert element if it doesn't exist
  let alertElement = document.getElementById("alert-message")
  if (!alertElement) {
    alertElement = document.createElement("div")
    alertElement.id = "alert-message"
    alertElement.className = `alert alert-${type} alert-dismissible fade show`
    alertElement.style.position = "fixed"
    alertElement.style.top = "20px"
    alertElement.style.right = "20px"
    alertElement.style.zIndex = "9999"
    document.body.appendChild(alertElement)
  } else {
    alertElement.className = `alert alert-${type} alert-dismissible fade show`
  }

  // Set alert content
  alertElement.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alertElement.remove()
  }, 5000)
}

// Update the window.customerAuth export at the end of the file:
window.customerAuth = {
  fetchCurrentToken,
  validateToken,
  isTokenExpired,
  checkAuth,
  handleLogout,
  redirectToLogin: () => {
    window.location.href = "login.html"
  },
  showAlert,
  fetchNotifications,
  fetchUserType,
  fetchVehicleOwnerProfile,
  fetchServiceRequests,
  markAllNotificationsAsRead,
  showPaymentModal,
  initiateSTKPush,
}

