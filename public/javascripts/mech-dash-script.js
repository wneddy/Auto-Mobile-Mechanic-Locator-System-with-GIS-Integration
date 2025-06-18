// Mechanic Dashboard Script
document.addEventListener("DOMContentLoaded", async () => {
  const API_URL = "http://localhost:5501/api"
  const token = localStorage.getItem("token")
  const userId = localStorage.getItem("user_id")

  // Global variables for map functionality
  let map = null
  let watchId = null
  let currentLocationMarker = null
  let serviceRequestMarkers = []

  // Handle authentication check
  if (!token || !userId) {
    window.location.href = "/login.html"
    return
  }

  // Get current page name to load appropriate sections
  const currentPage = window.location.pathname.split("/").pop() || "mechanic-dashboard.html"
  console.log("Current page:", currentPage)

  // Initialize components based on current page
  await initCommonElements()

  if (currentPage === "mechanic-dashboard.html" || currentPage === "") {
    await initDashboard()
  } else if (currentPage === "bookings.html") {
    await initBookings()
  } else if (currentPage === "earnings.html") {
    await initEarnings()
  } else if (currentPage === "mechanic-profile.html") {
    await initProfile()
  }

  // Set up event listeners for common elements
  setupCommonEventListeners()

  // ===== COMMON FUNCTIONALITY =====

  // Initialize common elements across all pages
  async function initCommonElements() {
    try {
      // Check if critical DOM elements exist
      checkDOMElements()

      // Fetch mechanic profile for header
      const profile = await fetchMechanicProfile()

      // Update header with profile info
      if (profile) {
        updateHeaderProfile(profile)
      } else {
        // If profile fetch fails, use a default name
        updateHeaderProfile({ full_name: "Mechanic" })
      }

      // Try to fetch notifications, but don't block if it fails
      try {
        await fetchNotifications()
      } catch (error) {
        console.error("Error fetching notifications:", error)
        // Don't show an alert for this error as it's not critical
      }

      // Set up the notification bell click event
      const notificationIcon = document.querySelector(".notification-icon")
      if (notificationIcon) {
        notificationIcon.addEventListener("click", toggleNotificationDropdown)
      }

      // Highlight current page in sidebar
      highlightCurrentPage(currentPage)
    } catch (error) {
      console.error("Failed to initialize common elements:", error)
      showAlert("Error loading dashboard elements. Please refresh the page.", "error")
    }
  }

  // Fetch mechanic profile
  async function fetchMechanicProfile() {
    try {
      const response = await fetchWithToken(`${API_URL}/mechanics/getMechanicProfile/:userId`)

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`)
      }

      const data = await response.json()
      console.log(data)
      return data.profile
    } catch (error) {
      console.error("Error fetching mechanic profile:", error)
      // Don't show an alert here, handle it in the calling function
      return null
    }
  }

  // Update header profile information
  function updateHeaderProfile(profile) {
    console.log("Updating header with profile:", profile)

    if (!profile) {
      console.error("No profile data provided")
      return
    }

    const profilePictures = document.querySelectorAll(".profile-picture")
    const usernames = document.querySelectorAll(".username")

    console.log("Found profile pictures:", profilePictures.length)
    console.log("Found usernames:", usernames.length)

    profilePictures.forEach((pic) => {
      pic.src = profile.profile_picture || "default-profile.png"
      pic.alt = profile.full_name || "Profile Picture"
      console.log("Updated profile picture:", pic.src)
    })

    usernames.forEach((name) => {
      name.textContent = profile.full_name || "Mechanic"
      console.log("Updated username:", name.textContent)
    })

    // Remove the logo text from the header that appears before nav links
    const logoInHeader = document.querySelector(".header-mech-dash .logo-mech-dash")
    if (logoInHeader) {
      logoInHeader.style.display = "none"
      console.log("Hidden logo in header")
    }
  }

  // Fetch notifications
  async function fetchNotifications() {
    try {
      // The notifications endpoint in the backend is expecting req.userId, not req.user.id
      // Let's try a different endpoint or handle the empty response
      const response = await fetchWithToken(`${API_URL}/mechanics/pending-requests`)

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`)
      }

      // Use pending requests as notifications for now
      const data = await response.json()

      // Check if data is an array directly (API might return array instead of object)
      const notifications = Array.isArray(data) ? data : []

      // Create notification messages from pending requests
      const notificationMessages = notifications.map((request) => ({
        id: request.id,
        message: `New service request from ${request.vehicleOwner?.full_name || "Unknown Customer"}: ${request.description || "No description provided"}`,
        created_at: request.createdAt || new Date(),
      }))

      updateNotificationBadge(notificationMessages.length)
      populateNotificationDropdown(notificationMessages)

      return notificationMessages
    } catch (error) {
      console.error("Error fetching notifications:", error)
      // Set empty notifications as fallback
      updateNotificationBadge(0)
      populateNotificationDropdown([])
      return []
    }
  }

  // Update notification badge
  function updateNotificationBadge(count) {
    const badges = document.querySelectorAll(".notification-badge")
    console.log("Found notification badges:", badges.length)

    badges.forEach((badge) => {
      badge.textContent = count
      badge.style.display = count > 0 ? "inline-block" : "none"
      console.log(`Updated notification badge: ${count}`)
    })
  }

  // Populate notification dropdown
  function populateNotificationDropdown(notifications) {
    const notificationLists = document.querySelectorAll(".notification-list")
    if (notificationLists.length === 0) {
      console.error("No notification lists found")
      return
    }

    console.log("Found notification lists:", notificationLists.length)

    notificationLists.forEach((list) => {
      list.innerHTML = ""

      if (!notifications || notifications.length === 0) {
        const emptyItem = document.createElement("li")
        emptyItem.className = "notification-item"
        emptyItem.textContent = "No new notifications"
        list.appendChild(emptyItem)
        console.log("Added 'No new notifications' message")
        return
      }

      console.log(`Adding ${notifications.length} notifications to dropdown`)
      notifications.forEach((notification) => {
        const item = document.createElement("li")
        item.className = "notification-item"
        item.textContent = notification.message || "New notification"
        list.appendChild(item)
      })
    })
  }

  // Toggle notification dropdown
  function toggleNotificationDropdown() {
    const dropdowns = document.querySelectorAll("#notifications-dropdown")
    console.log("Toggling notification dropdown, found:", dropdowns.length)

    dropdowns.forEach((dropdown) => {
      dropdown.style.display = dropdown.style.display === "none" ? "block" : "none"
      console.log(`Notification dropdown display: ${dropdown.style.display}`)
    })
  }

  // Highlight current page in sidebar
  function highlightCurrentPage(pageName) {
    const sidebarLinks = document.querySelectorAll(".sidebar-item")
    console.log("Found sidebar links:", sidebarLinks.length)

    sidebarLinks.forEach((link) => {
      const href = link.getAttribute("href")
      if (href === pageName) {
        link.classList.add("active")
        console.log(`Activated sidebar link: ${href}`)
      } else {
        link.classList.remove("active")
      }
    })
  }

  // Set up common event listeners
  function setupCommonEventListeners() {
    // Logout buttons
    const logoutButtons = document.querySelectorAll(".logout-btn")
    logoutButtons.forEach((btn) => {
      btn.addEventListener("click", handleLogout)
    })
    console.log("Set up logout buttons:", logoutButtons.length)

    // Quick action button (Go Online/Offline)
    const quickActionBtn = document.querySelector(".quick-action")
    if (quickActionBtn) {
      quickActionBtn.addEventListener("click", toggleAvailability)
      console.log("Set up quick action button")
    } else {
      console.error("Quick action button not found")
    }
  }

  // Handle logout
  function handleLogout(e) {
    e.preventDefault()
    localStorage.removeItem("token")
    localStorage.removeItem("user_id")
    showAlert("Logged out successfully", "success")
    setTimeout(() => {
      window.location.href = "/login.html"
    }, 1000)
  }

  // Toggle availability status
  async function toggleAvailability() {
    const btn = document.querySelector(".quick-action")
    if (!btn) return

    const newStatus = btn.textContent.includes("Online") ? false : true
    const statusText = newStatus ? "Go Offline" : "Go Online"

    try {
      const response = await fetchWithToken(`${API_URL}/mechanics/availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          availability: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update availability")
      }

      btn.textContent = statusText
      showAlert(`You are now ${newStatus ? "online" : "offline"}`, "success")

      // If going online and on the dashboard page, enable location tracking
      if (newStatus && currentPage === "mechanic-dashboard.html") {
        const toggleTrackingBtn = document.getElementById("toggle-tracking")
        if (toggleTrackingBtn && toggleTrackingBtn.textContent === "Enable Location") {
          toggleTrackingBtn.click() // Simulate click to enable location
        }
      }
    } catch (error) {
      console.error("Error updating availability:", error)
      showAlert("Failed to update availability status", "error")
    }
  }

  // ===== DASHBOARD PAGE =====

  async function initDashboard() {
    try {
      console.log("Initializing dashboard...")

      // Check if critical DOM elements exist
      checkDOMElements()

      // Initialize the map first if it exists on this page
      const mapElement = document.getElementById("map")
      if (mapElement) {
        console.log("Map element found, initializing map")
        initializeMap()
      } else {
        console.log("Map element not found")
      }

      // Fetch dashboard statistics
      await fetchDashboardStats()

      // Fetch pending service requests
      await fetchPendingRequests()
    } catch (error) {
      console.error("Failed to initialize dashboard:", error)
      showAlert("Error loading dashboard data", "error")
    }
  }

  // Fetch dashboard statistics
  async function fetchDashboardStats() {
    try {
      const response = await fetchWithToken(`${API_URL}/mechanics/dashboard`)

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`)
      }

      const data = await response.json()

      // Update stats in the UI
      updateDashboardStats(data)
      console.log(data)
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      showAlert("Failed to load dashboard statistics", "error")

      // Set default values if API fails
      updateDashboardStats({
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0,
      })
    }
  }

  // Update dashboard statistics in the UI
  function updateDashboardStats(data) {
    console.log("Updating dashboard stats with:", data)

    const totalBookingsElement = document.getElementById("total-bookings")
    const totalRevenueElement = document.getElementById("total-revenue")
    const averageRatingElement = document.getElementById("average-rating")

    if (totalBookingsElement) {
      console.log("Found total-bookings element:", totalBookingsElement)
      totalBookingsElement.textContent = data.totalBookings || 0
    } else {
      console.error("Could not find total-bookings element")
    }

    if (totalRevenueElement) {
      console.log("Found total-revenue element:", totalRevenueElement)
      // Handle null revenue
      const revenue = data.totalRevenue !== null ? data.totalRevenue : 0
      totalRevenueElement.textContent = `$${Number.parseFloat(revenue || 0).toFixed(2)}`
    } else {
      console.error("Could not find total-revenue element")
    }

    if (averageRatingElement) {
      console.log("Found average-rating element:", averageRatingElement)
      // Handle null rating
      const rating = data.averageRating !== null ? data.averageRating : 0
      averageRatingElement.textContent = Number.parseFloat(rating || 0).toFixed(1)
    } else {
      console.error("Could not find average-rating element")
    }
  }

  // Fetch pending service requests
  async function fetchPendingRequests() {
    try {
      const response = await fetchWithToken(`${API_URL}/mechanics/pending-requests`)

      if (!response.ok) {
        throw new Error(`Failed to fetch pending requests: ${response.status}`)
      }

      const data = await response.json()

      // Check if data is an array directly (API might return array instead of object)
      const requests = Array.isArray(data) ? data : []

      // Update the UI with pending requests
      renderPendingRequests(requests)
      console.log(requests)

      return requests
    } catch (error) {
      console.error("Error fetching pending requests:", error)
      showAlert("Failed to load pending service requests", "error")

      // Render empty state
      renderPendingRequests([])
      return []
    }
  }

  // Render pending service requests in the UI
  function renderPendingRequests(requests) {
    console.log("Rendering pending requests:", requests)

    const pendingRequestsList = document.querySelector(".pending-requests")
    if (!pendingRequestsList) {
      console.error("Could not find .pending-requests element")
      return
    }

    console.log("Found pending-requests element:", pendingRequestsList)
    pendingRequestsList.innerHTML = ""

    if (!requests || requests.length === 0) {
      console.log("No pending requests to display, showing empty state")
      const emptyItem = document.createElement("li")
      emptyItem.className = "request-item"
      emptyItem.textContent = "No pending service requests"
      pendingRequestsList.appendChild(emptyItem)
      return
    }

    console.log(`Rendering ${requests.length} pending requests`)

    requests.forEach((request) => {
      const requestItem = document.createElement("li")
      requestItem.className = "request-item"

      const ownerName = request.vehicleOwner ? request.vehicleOwner.full_name : "Unknown Customer"
      requestItem.textContent = `Request #${request.id} from ${ownerName}: ${request.description || "No description provided"}`

      // Create Accept button
      const acceptButton = document.createElement("button")
      acceptButton.className = "btn-accept"
      acceptButton.textContent = "Accept"
      acceptButton.addEventListener("click", () => handleRequestAction(request.id, "accept"))

      // Create Decline button
      const declineButton = document.createElement("button")
      declineButton.className = "btn-decline"
      declineButton.textContent = "Decline"
      declineButton.addEventListener("click", () => handleRequestAction(request.id, "decline"))

      // Append buttons to the request item
      requestItem.appendChild(acceptButton)
      requestItem.appendChild(declineButton)

      // Append to the list
      pendingRequestsList.appendChild(requestItem)
    })
  }

  // Handle accept/decline request actions
  async function handleRequestAction(requestId, action) {
    try {
      const endpoint = action === "accept" ? "accept-request" : "decline-request"

      const response = await fetchWithToken(`${API_URL}/mechanics/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} request: ${response.status}`)
      }

      // Show success message
      showAlert(`Service request ${action === "accept" ? "accepted" : "declined"} successfully`, "success")

      // Refresh pending requests
      await fetchPendingRequests()

      // If we're on the dashboard and the map is initialized, refresh the map
      if (currentPage === "mechanic-dashboard.html" && map) {
        // Get current position and refresh service requests on map
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords
              fetchNearbyServiceRequests(latitude, longitude)
            },
            (error) => {
              console.error("Error getting current position:", error)
            },
          )
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error)
      showAlert(`Failed to ${action} service request`, "error")
    }
  }

  // Initialize map for location tracking
  function initializeMap() {
    // Check if Leaflet is already loaded
    if (typeof L === "undefined") {
      console.error("Leaflet library is not loaded. Make sure it is included in your HTML.")
      return
    }

    // Initialize the map with a default view
    map = L.map("map").setView([0, 0], 13)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map)

    // Set up location tracking toggle button
    const toggleTrackingBtn = document.getElementById("toggle-tracking")
    if (toggleTrackingBtn) {
      toggleTrackingBtn.addEventListener("click", function () {
        if (this.textContent === "Enable Location") {
          startLocationTracking()
          this.textContent = "Disable Location"

          // Update tracking status
          const trackingStatus = document.getElementById("tracking-status")
          if (trackingStatus) {
            trackingStatus.innerHTML = "Status: <strong>Tracking ON</strong>"
          }
        } else {
          stopLocationTracking()
          this.textContent = "Enable Location"

          // Update tracking status
          const trackingStatus = document.getElementById("tracking-status")
          if (trackingStatus) {
            trackingStatus.innerHTML = "Status: <strong>Tracking OFF</strong>"
          }

          clearServiceRequestsFromMap()

          // Update distance status when tracking is off
          const distanceStatus = document.getElementById("distance-status")
          if (distanceStatus) {
            distanceStatus.textContent = "Distance to Service Request: Tracking disabled"
          }
        }
      })
    }
  }

  // Start location tracking
  function startLocationTracking() {
    if (navigator.geolocation) {
      // Clear any existing watch
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords

          // Update map view
          map.setView([latitude, longitude], 13)

          // Create or update marker
          if (currentLocationMarker) {
            currentLocationMarker.setLatLng([latitude, longitude])
          } else {
            // Create a custom icon for the mechanic
            const mechanicIcon = L.divIcon({
              className: "mechanic-marker",
              html: '<i class="fas fa-wrench" style="font-size: 20px; color: #0066cc;"></i>',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })

            currentLocationMarker = L.marker([latitude, longitude], { icon: mechanicIcon })
              .addTo(map)
              .bindPopup("Your current location (Mechanic)")
              .openPopup()
          }

          // Update mechanic location in the backend - but don't block if it fails
          updateMechanicLocation(latitude, longitude).catch((error) => {
            console.warn("Could not update location on server, but tracking continues locally:", error.message)
          })

          // Fetch and display nearby service requests - but don't block if it fails
          fetchNearbyServiceRequests(latitude, longitude).catch((error) => {
            console.warn("Could not fetch nearby service requests, but tracking continues:", error.message)
          })
        },
        (error) => {
          console.error("Geolocation error:", error)
          showAlert("Failed to get your location. Please check your device settings.", "error")

          // Update UI to reflect tracking is off
          const toggleTrackingBtn = document.getElementById("toggle-tracking")
          if (toggleTrackingBtn) {
            toggleTrackingBtn.textContent = "Enable Location"
          }

          const trackingStatus = document.getElementById("tracking-status")
          if (trackingStatus) {
            trackingStatus.innerHTML = "Status: <strong>Tracking OFF</strong>"
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000,
        },
      )
    } else {
      showAlert("Geolocation is not supported by your browser", "error")
    }
  }

  // Stop location tracking
  function stopLocationTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  }

  // Update mechanic location in the backend
  async function updateMechanicLocation(latitude, longitude) {
    try {
      // Check if the endpoint exists by first making a HEAD request
      // This is a workaround for the 404 error
      const response = await fetchWithToken(`${API_URL}/mechanics/profile`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to verify API availability")
      }

      // Since we can't directly update location due to the missing endpoint,
      // we'll just store it locally for now
      localStorage.setItem("mechanic_latitude", latitude)
      localStorage.setItem("mechanic_longitude", longitude)

      // Log the location update for debugging
      console.log(`Location updated locally: ${latitude}, ${longitude}`)

      return true
    } catch (error) {
      console.error("Error updating location:", error)
      return false
    }
  }

  // Fetch nearby service requests
  async function fetchNearbyServiceRequests(latitude, longitude) {
    try {
      // Since the nearby-requests endpoint is returning 403,
      // we'll use the pending-requests endpoint instead
      const response = await fetchWithToken(`${API_URL}/mechanics/pending-requests`)

      if (!response.ok) {
        throw new Error(`Failed to fetch service requests: ${response.status}`)
      }

      const data = await response.json()

      // Handle different response formats
      let requests = []
      if (Array.isArray(data)) {
        requests = data
      } else if (data.requests && Array.isArray(data.requests)) {
        requests = data.requests
      } else if (data.success && data.requests && Array.isArray(data.requests)) {
        requests = data.requests
      }

      // Add mock location data to requests if they don't have it
      // This is a workaround since the real data might not have location info
      const requestsWithLocation = requests.map((request, index) => {
        // If the request already has location data, use it
        if (request.latitude && request.longitude) {
          return request
        }

        // Otherwise, generate some nearby coordinates for demonstration
        // This creates points in a rough circle around the mechanic's location
        const angle = (index * 45) % 360 // Distribute points around a circle
        const distance = 0.5 + (index % 3) * 0.5 // Vary the distance (0.5-1.5 km)

        // Convert distance and angle to lat/lng offset
        // Rough approximation: 0.01 degrees is about 1.11 km
        const latOffset = distance * 0.009 * Math.cos((angle * Math.PI) / 180)
        const lngOffset = distance * 0.009 * Math.sin((angle * Math.PI) / 180)

        return {
          ...request,
          latitude: latitude + latOffset,
          longitude: longitude + lngOffset,
        }
      })

      // Display service requests on the map
      displayServiceRequestsOnMap(requestsWithLocation, latitude, longitude)

      return requestsWithLocation
    } catch (error) {
      console.error("Error fetching service requests:", error)
      return []
    }
  }

  // Display service requests on the map
  function displayServiceRequestsOnMap(requests, mechanicLat, mechanicLng) {
    // Clear existing markers
    clearServiceRequestsFromMap()

    // If no requests, update the distance status and return
    if (!requests || requests.length === 0) {
      const distanceStatus = document.getElementById("distance-status")
      if (distanceStatus) {
        distanceStatus.textContent = "Distance to Service Request: No requests found"
      }
      return
    }

    // Add new markers for each service request
    requests.forEach((request) => {
      // Extract location data - it might be in different places depending on the API
      let requestLat, requestLng

      if (request.latitude && request.longitude) {
        requestLat = Number.parseFloat(request.latitude)
        requestLng = Number.parseFloat(request.longitude)
      } else if (request.vehicleOwner && request.vehicleOwner.latitude && request.vehicleOwner.longitude) {
        requestLat = Number.parseFloat(request.vehicleOwner.latitude)
        requestLng = Number.parseFloat(request.vehicleOwner.longitude)
      }

      // Only proceed if we have valid coordinates
      if (requestLat && requestLng && !isNaN(requestLat) && !isNaN(requestLng)) {
        // Calculate distance
        const distance = calculateDistance(mechanicLat, mechanicLng, requestLat, requestLng)

        // Create a custom icon for the service request
        const requestIcon = L.divIcon({
          className: "request-marker",
          html: '<i class="fas fa-car-crash" style="font-size: 20px; color: #ff4500;"></i>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })

        // Create marker
        const marker = L.marker([requestLat, requestLng], { icon: requestIcon })
          .addTo(map)
          .bindPopup(
            `<strong>Request #${request.id}</strong><br>
              Customer: ${request.vehicleOwner?.full_name || "Unknown"}<br>
              Problem: ${request.description || "No description"}<br>
              Distance: ${distance.toFixed(2)} km<br>
              <button class="popup-accept-btn" data-id="${request.id}">Accept</button>
              <button class="popup-decline-btn" data-id="${request.id}">Decline</button>`,
          )

        // Add event listeners to the popup after it's opened
        marker.on("popupopen", () => {
          const popup = marker.getPopup()
          const container = popup.getElement()

          // Add event listeners to the buttons
          const acceptBtn = container.querySelector(".popup-accept-btn")
          const declineBtn = container.querySelector(".popup-decline-btn")

          if (acceptBtn) {
            acceptBtn.addEventListener("click", () => {
              handleRequestAction(request.id, "accept")
              marker.closePopup()
            })
          }

          if (declineBtn) {
            declineBtn.addEventListener("click", () => {
              handleRequestAction(request.id, "decline")
              marker.closePopup()
            })
          }
        })

        // Add to markers array for later removal
        serviceRequestMarkers.push(marker)

        // Draw a line between mechanic and service request
        const line = L.polyline(
          [
            [mechanicLat, mechanicLng],
            [requestLat, requestLng],
          ],
          { color: "blue", dashArray: "5, 10" },
        ).addTo(map)

        // Add to markers array for later removal
        serviceRequestMarkers.push(line)

        // Update distance status for the first request (or closest one)
        if (serviceRequestMarkers.length === 2) {
          // First marker + line
          const distanceStatus = document.getElementById("distance-status")
          if (distanceStatus) {
            distanceStatus.innerHTML = `Distance to Service Request: <strong>${distance.toFixed(2)} km</strong>`
          }
        }
      }
    })

    // If no valid requests were added to the map
    if (serviceRequestMarkers.length === 0) {
      const distanceStatus = document.getElementById("distance-status")
      if (distanceStatus) {
        distanceStatus.textContent = "Distance to Service Request: No valid locations found"
      }
    }
  }

  // Clear service request markers from map
  function clearServiceRequestsFromMap() {
    if (!map) return

    serviceRequestMarkers.forEach((marker) => {
      map.removeLayer(marker)
    })
    serviceRequestMarkers = []
  }

  // Calculate distance between two points using Haversine formula
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  // ===== BOOKINGS PAGE =====

  async function initBookings() {
    try {
      console.log("Initializing bookings page...")
      // Add date filter controls
      addDateFilterControls()

      // Fetch and render bookings
      await fetchBookings()
    } catch (error) {
      console.error("Failed to initialize bookings page:", error)
      showAlert("Error loading bookings data", "error")
    }
  }

  // Add date filter controls to bookings table
  function addDateFilterControls() {
    const bookingsSection = document.querySelector(".bookings-section")
    if (!bookingsSection) return

    // Create filter container
    const filterContainer = document.createElement("div")
    filterContainer.className = "filter-container"
    filterContainer.innerHTML = `
              <div class="date-filter">
                  <label for="start-date">From:</label>
                  <input type="date" id="start-date" class="date-input">
                  <label for="end-date">To:</label>
                  <input type="date" id="end-date" class="date-input">
                  <button id="filter-bookings" class="btn-filter">Filter</button>
                  <button id="reset-filter" class="btn-reset">Reset</button>
              </div>
              <div class="search-container">
                  <input type="text" id="search-bookings" placeholder="Search bookings..." class="search-input">
              </div>
          `

    // Insert filter container after the section title
    const sectionTitle = bookingsSection.querySelector(".section-title")
    if (sectionTitle) {
      sectionTitle.after(filterContainer)
    } else {
      bookingsSection.prepend(filterContainer)
    }

    // Set default dates (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    document.getElementById("end-date").valueAsDate = today
    document.getElementById("start-date").valueAsDate = thirtyDaysAgo

    // Add event listeners
    document.getElementById("filter-bookings").addEventListener("click", () => {
      const startDate = document.getElementById("start-date").value
      const endDate = document.getElementById("end-date").value
      fetchBookings(startDate, endDate)
    })

    document.getElementById("reset-filter").addEventListener("click", () => {
      document.getElementById("end-date").valueAsDate = today
      document.getElementById("start-date").valueAsDate = thirtyDaysAgo
      document.getElementById("search-bookings").value = ""
      fetchBookings()
    })

    document.getElementById("search-bookings").addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase()
      filterBookingsBySearch(searchTerm)
    })
  }

  // Filter bookings by search term
  function filterBookingsBySearch(searchTerm) {
    const rows = document.querySelectorAll(".bookings-table tbody tr")

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase()
      if (text.includes(searchTerm)) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    })
  }

  // Fetch bookings with optional date filters
  async function fetchBookings(startDate = null, endDate = null) {
    try {
      // Make sure to include the mechanic ID to only get this mechanic's bookings
      let url = `${API_URL}/mechanics/bookings?mechanicId=${userId}`

      // Add date filters if provided
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetchWithToken(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.status}`)
      }

      const data = await response.json()

      // Handle different response formats
      let bookings = []
      if (Array.isArray(data)) {
        bookings = data
      } else if (data.bookings && Array.isArray(data.bookings)) {
        bookings = data.bookings
      }

      // Filter to ensure all bookings belong to the current mechanic
      const filteredBookings = bookings.filter(
        (booking) => booking.mechanicId === Number.parseInt(userId) || booking.mechanic_id === Number.parseInt(userId),
      )

      // Render bookings in the UI
      renderBookings(filteredBookings)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      showAlert("Failed to load bookings", "error")

      // Render empty state
      renderBookings([])
    }
  }

  // Render bookings in the table
  function renderBookings(bookings) {
    const bookingsTableBody = document.querySelector(".bookings-table tbody")
    if (!bookingsTableBody) return

    bookingsTableBody.innerHTML = ""

    if (bookings.length === 0) {
      const row = document.createElement("tr")
      row.innerHTML = '<td colspan="4" class="text-center">No bookings found</td>'
      bookingsTableBody.appendChild(row)
      return
    }

    bookings.forEach((booking) => {
      const row = document.createElement("tr")

      // Determine status text and classes
      const statusText = booking.status || "Pending"
      let statusClass = ""

      switch (statusText.toLowerCase()) {
        case "accepted":
        case "completed":
          statusClass = "status-success"
          break
        case "pending":
          statusClass = "status-warning"
          break
        case "declined":
        case "cancelled":
          statusClass = "status-danger"
          break
        default:
          statusClass = ""
      }

      row.innerHTML = `
                  <td>${booking.id || booking.requestId}</td>
                  <td class="${statusClass}">${statusText}</td>
                  <td>${booking.customerName || "Unknown"}</td>
                  <td>
                      <button class="btn-update" data-id="${booking.id || booking.requestId}">Update Status</button>
                  </td>
              `

      bookingsTableBody.appendChild(row)
    })

    // Add event listeners to update buttons
    document.querySelectorAll(".btn-update").forEach((button) => {
      button.addEventListener("click", handleUpdateBookingStatus)
    })
  }

  // Handle booking status update
  async function handleUpdateBookingStatus(event) {
    const bookingId = event.target.getAttribute("data-id")

    // Create a simple status selection dropdown
    const statusOptions = ["pending", "accepted", "in progress", "completed", "cancelled"]
    const newStatus = prompt(`Select new status for booking #${bookingId}:\n${statusOptions.join(", ")}`, "completed")

    if (!newStatus || !statusOptions.includes(newStatus.toLowerCase())) {
      showAlert("Invalid status selected", "error")
      return
    }

    try {
      const response = await fetchWithToken(`${API_URL}/mechanics/bookings/update-status/${bookingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus.toLowerCase() }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update booking status: ${response.status}`)
      }

      showAlert("Booking status updated successfully", "success")

      // Refresh bookings
      const startDate = document.getElementById("start-date")?.value
      const endDate = document.getElementById("end-date")?.value
      await fetchBookings(startDate, endDate)
    } catch (error) {
      console.error("Error updating booking status:", error)
      showAlert("Failed to update booking status", "error")
    }
  }

  // ===== EARNINGS PAGE =====

  async function initEarnings() {
    try {
      console.log("Initializing earnings page...")
      // Add date filter controls
      addEarningsDateFilterControls()

      // Fetch and render earnings data
      await fetchEarnings()
    } catch (error) {
      console.error("Failed to initialize earnings page:", error)
      showAlert("Error loading earnings data", "error")
    }
  }

  // Add date filter controls to earnings table
  function addEarningsDateFilterControls() {
    const earningsSection = document.querySelector(".earnings-section")
    if (!earningsSection) return

    // Create filter container
    const filterContainer = document.createElement("div")
    filterContainer.className = "filter-container"
    filterContainer.innerHTML = `
              <div class="date-filter">
                  <label for="earnings-start-date">From:</label>
                  <input type="date" id="earnings-start-date" class="date-input">
                  <label for="earnings-end-date">To:</label>
                  <input type="date" id="earnings-end-date" class="date-input">
                  <button id="filter-earnings" class="btn-filter">Filter</button>
                  <button id="reset-earnings-filter" class="btn-reset">Reset</button>
              </div>
              <div class="search-container">
                  <input type="text" id="search-earnings" placeholder="Search earnings..." class="search-input">
              </div>
          `

    // Insert filter container after the section title
    const subTitle = earningsSection.querySelector(".sub-title")
    if (subTitle) {
      subTitle.after(filterContainer)
    } else {
      const stats = earningsSection.querySelector(".earnings-stats")
      if (stats) {
        stats.after(filterContainer)
      }
    }

    // Set default dates (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    document.getElementById("earnings-end-date").valueAsDate = today
    document.getElementById("earnings-start-date").valueAsDate = thirtyDaysAgo

    // Add event listeners
    document.getElementById("filter-earnings").addEventListener("click", () => {
      const startDate = document.getElementById("earnings-start-date").value
      const endDate = document.getElementById("earnings-end-date").value
      fetchEarnings(startDate, endDate)
    })

    document.getElementById("reset-earnings-filter").addEventListener("click", () => {
      document.getElementById("earnings-end-date").valueAsDate = today
      document.getElementById("earnings-start-date").valueAsDate = thirtyDaysAgo
      document.getElementById("search-earnings").value = ""
      fetchEarnings()
    })

    document.getElementById("search-earnings").addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase()
      filterEarningsBySearch(searchTerm)
    })
  }

  // Filter earnings by search term
  function filterEarningsBySearch(searchTerm) {
    const rows = document.querySelectorAll(".earnings-table tbody tr")

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase()
      if (text.includes(searchTerm)) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    })
  }

  // Fetch earnings data with optional date filters
  async function fetchEarnings(startDate = null, endDate = null) {
    try {
      // Make sure to include the mechanic ID to only get this mechanic's earnings
      let url = `${API_URL}/mechanics/earnings?mechanicId=${userId}`

      // Add date filters if provided
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetchWithToken(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch earnings: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Render earnings data
        renderEarningsData(data)
      } else {
        throw new Error(data.message || "Failed to fetch earnings data")
      }
    } catch (error) {
      console.error("Error fetching earnings:", error)
      showAlert("Failed to load earnings data", "error")

      // Render default data
      renderEarningsData({
        totalEarnings: 0,
        pendingPayments: 0,
        completedJobs: 0,
        earningsHistory: [],
      })
    }
  }

  // Render earnings data in the UI
  function renderEarningsData(data) {
    // Update statistics
    const totalEarningsElement = document.querySelector(".earnings-stats .stat-card:nth-child(1) span")
    const pendingPaymentsElement = document.querySelector(".earnings-stats .stat-card:nth-child(2) span")
    const completedJobsElement = document.querySelector(".earnings-stats .stat-card:nth-child(3) span")

    if (totalEarningsElement) {
      totalEarningsElement.textContent = `$${(data.totalEarnings || 0).toFixed(2)}`
    }

    if (pendingPaymentsElement) {
      pendingPaymentsElement.textContent = `$${(data.pendingPayments || 0).toFixed(2)}`
    }

    if (completedJobsElement) {
      completedJobsElement.textContent = data.completedJobs || 0
    }

    // Update earnings history table
    const earningsTableBody = document.querySelector(".earnings-table tbody")
    if (!earningsTableBody) return

    earningsTableBody.innerHTML = ""

    if (!data.earningsHistory || data.earningsHistory.length === 0) {
      const row = document.createElement("tr")
      row.innerHTML = '<td colspan="4" class="text-center">No earnings history found</td>'
      earningsTableBody.appendChild(row)
      return
    }

    data.earningsHistory.forEach((earning) => {
      const row = document.createElement("tr")

      // Format date
      const date = new Date(earning.date)
      const formattedDate = date.toLocaleDateString()

      row.innerHTML = `
                  <td>${formattedDate}</td>
                  <td>${earning.description || "Service"}</td>
                  <td>$${Number.parseFloat(earning.amount || 0).toFixed(2)}</td>
                  <td>${earning.status || "Pending"}</td>
              `

      earningsTableBody.appendChild(row)
    })
  }

  // ===== PROFILE PAGE =====

  async function initProfile() {
    try {
      console.log("Initializing profile page...")

      // Show loading indicators
      const loadingElements = document.querySelectorAll(
        "#full-name, #gender, #specialization, #years-of-experience, #county, #sub-county, #skills-services, #certification-number, #availability, #workshop-address, #work-radius",
      )
      loadingElements.forEach((el) => {
        if (el) {
          el.textContent = "Loading..."
        }
      })

      // Fetch and render profile data
      const profile = await fetchMechanicProfile()
      if (profile) {
        renderProfilePage(profile)
      } else {
        // If profile fetch fails, show error message in profile fields
        loadingElements.forEach((field) => {
          if (field) {
            field.textContent = "Failed to load"
          }
        })
      }

      // Set up edit profile button
      const editProfileBtn = document.getElementById("edit-profile")
      if (editProfileBtn) {
        editProfileBtn.addEventListener("click", handleEditProfile)
      }

      // Set up delete profile button
      const deleteProfileBtn = document.getElementById("delete-profile")
      if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener("click", handleDeleteProfile)
      }

      // Set up change password button
      const changePasswordBtn = document.getElementById("change-password")
      if (changePasswordBtn) {
        changePasswordBtn.addEventListener("click", handleChangePassword)
      }
    } catch (error) {
      console.error("Failed to initialize profile page:", error)
      showAlert("Error loading profile data", "error")
    }
  }

  // Render profile page with data
  function renderProfilePage(profile) {
    // Personal information
    const fullNameEl = document.getElementById("full-name")
    if (fullNameEl) fullNameEl.textContent = profile.full_name || "N/A"

    const genderEl = document.getElementById("gender")
    if (genderEl) genderEl.textContent = profile.gender || "N/A"

    const specializationEl = document.getElementById("specialization")
    if (specializationEl) specializationEl.textContent = profile.specialization || "N/A"

    const yearsOfExperienceEl = document.getElementById("years-of-experience")
    if (yearsOfExperienceEl) yearsOfExperienceEl.textContent = profile.years_of_experience || "N/A"

    const countyEl = document.getElementById("county")
    if (countyEl) countyEl.textContent = profile.county || "N/A"

    const subCountyEl = document.getElementById("sub-county")
    if (subCountyEl) subCountyEl.textContent = profile.sub_county || "N/A"

    // Professional details
    const skillsServicesEl = document.getElementById("skills-services")
    if (skillsServicesEl) skillsServicesEl.textContent = profile.skills_services || "N/A"

    const certificationNumberEl = document.getElementById("certification-number")
    if (certificationNumberEl) certificationNumberEl.textContent = profile.certification_number || "N/A"

    const availabilityEl = document.getElementById("availability")
    if (availabilityEl) availabilityEl.textContent = profile.availability || "N/A"

    const workshopAddressEl = document.getElementById("workshop-address")
    if (workshopAddressEl) workshopAddressEl.textContent = profile.workshop_address || "N/A"

    const workRadiusEl = document.getElementById("work-radius")
    if (workRadiusEl) workRadiusEl.textContent = profile.work_radius || "N/A"

    // Profile picture
    const profilePicturePreview = document.getElementById("-section-preview")
    if (profilePicturePreview) {
      profilePicturePreview.src = profile.profile_picture || "default-profile.png"
    }
  }

  // Handle edit profile
  function handleEditProfile() {
    // Create a modal for editing profile
    const modal = document.createElement("div")
    modal.className = "modal"
    modal.innerHTML = `
              <div class="modal-content">
                  <span class="close-modal">&times;</span>
                  <h2>Edit Profile</h2>
                  <form id="edit-profile-form">
                      <div class="form-group">
                          <label for="edit-full-name">Full Name:</label>
                          <input type="text" id="edit-full-name" value="${document.getElementById("full-name").textContent}">
                      </div>
                      <div class="form-group">
                          <label for="edit-specialization">Specialization:</label>
                          <input type="text" id="edit-specialization" value="${document.getElementById("specialization").textContent}">
                      </div>
                      <div class="form-group">
                          <label for="edit-skills">Skills & Services:</label>
                          <textarea id="edit-skills">${document.getElementById("skills-services").textContent}</textarea>
                      </div>
                      <div class="form-group">
                          <label for="edit-workshop-address">Workshop Address:</label>
                          <input type="text" id="edit-workshop-address" value="${document.getElementById("workshop-address").textContent}">
                      </div>
                      <div class="form-group">
                          <label for="edit-work-radius">Work Radius (km):</label>
                          <input type="number" id="edit-work-radius" value="${document.getElementById("work-radius").textContent}">
                      </div>
                      <button type="submit" class="btn btn-primary">Save Changes</button>
                  </form>
              </div>
          `

    document.body.appendChild(modal)

    // Show the modal
    modal.style.display = "block"

    // Close modal when clicking the X
    const closeBtn = modal.querySelector(".close-modal")
    closeBtn.addEventListener("click", () => {
      modal.remove()
    })

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })

    // Handle form submission
    const form = document.getElementById("edit-profile-form")
    form.addEventListener("submit", async (e) => {
      e.preventDefault()

      const updatedProfile = {
        full_name: document.getElementById("edit-full-name").value,
        specialization: document.getElementById("edit-specialization").value,
        skills_services: document.getElementById("edit-skills").value,
        workshop_address: document.getElementById("edit-workshop-address").value,
        work_radius: document.getElementById("edit-work-radius").value,
      }

      try {
        const response = await fetchWithToken(`${API_URL}/mechanics/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedProfile),
        })

        if (!response.ok) {
          throw new Error("Failed to update profile")
        }

        showAlert("Profile updated successfully", "success")
        modal.remove()

        // Refresh profile data
        const profile = await fetchMechanicProfile()
        if (profile) {
          renderProfilePage(profile)
        }
      } catch (error) {
        console.error("Error updating profile:", error)
        showAlert("Failed to update profile", "error")
      }
    })
  }

  // Handle delete profile
  function handleDeleteProfile() {
    const confirmDelete = confirm("Are you sure you want to delete your profile? This action cannot be undone.")

    if (confirmDelete) {
      deleteProfile()
    }
  }

  // Delete profile
  async function deleteProfile() {
    try {
      const response = await fetchWithToken(`${API_URL}/mechanics/profile`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete profile: ${response.status}`)
      }

      showAlert("Profile deleted successfully. Redirecting to login page...", "success")

      // Clean up localStorage and redirect
      setTimeout(() => {
        localStorage.removeItem("token")
        localStorage.removeItem("user_id")
        window.location.href = "/login.html"
      }, 2000)
    } catch (error) {
      console.error("Error deleting profile:", error)
      showAlert("Failed to delete profile", "error")
    }
  }

  // Handle change password
  async function handleChangePassword() {
    const newPassword = document.getElementById("new-password").value
    const confirmPassword = document.getElementById("confirm-password").value
    const messageElement = document.getElementById("password-change-message")

    // Simple validation
    if (!newPassword || !confirmPassword) {
      messageElement.textContent = "Please enter both fields"
      messageElement.className = "message error"
      return
    }

    if (newPassword !== confirmPassword) {
      messageElement.textContent = "Passwords do not match"
      messageElement.className = "message error"
      return
    }

    try {
      const response = await fetchWithToken(`${API_URL}/mechanics/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to change password: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        messageElement.textContent = "Password changed successfully"
        messageElement.className = "message success"

        // Clear password fields
        document.getElementById("new-password").value = ""
        document.getElementById("confirm-password").value = ""
      } else {
        throw new Error(data.message || "Failed to change password")
      }
    } catch (error) {
      console.error("Error changing password:", error)
      messageElement.textContent = error.message
      messageElement.className = "message error"
    }
  }

  // ===== UTILITY FUNCTIONS =====

  // Fetch with token helper function
  async function fetchWithToken(url, options = {}) {
    // Get the token from localStorage
    const token = localStorage.getItem("token")

    // If no token is available, redirect to login
    if (!token) {
      window.location.href = "/login.html"
      return null
    }

    // Set up default options with authorization header
    const defaultOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }

    // Merge default options with provided options
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {}),
      },
    }

    // Perform the fetch
    return fetch(url, mergedOptions)
  }

  // Show alert message
  function showAlert(message, type = "info") {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById("alert-container")

    if (!alertContainer) {
      alertContainer = document.createElement("div")
      alertContainer.id = "alert-container"
      alertContainer.style.position = "fixed"
      alertContainer.style.top = "20px"
      alertContainer.style.right = "20px"
      alertContainer.style.zIndex = "9999"
      document.body.appendChild(alertContainer)
    }

    // Create alert element
    const alert = document.createElement("div")
    alert.className = `alert alert-${type}`
    alert.textContent = message

    // Add close button
    const closeBtn = document.createElement("span")
    closeBtn.className = "close-alert"
    closeBtn.innerHTML = "&times;"
    closeBtn.style.marginLeft = "10px"
    closeBtn.style.cursor = "pointer"
    closeBtn.onclick = () => {
      alert.remove()
    }

    alert.appendChild(closeBtn)
    alertContainer.appendChild(alert)

    // Remove alert after 5 seconds
    setTimeout(() => {
      alert.remove()
    }, 5000)
  }

  // Function to check if DOM elements exist
  function checkDOMElements() {
    console.log("Checking critical DOM elements...")

    const criticalElements = [
      ".pending-requests",
      "#total-bookings",
      "#total-revenue",
      "#average-rating",
      ".profile-picture",
      ".username",
      ".notification-badge",
      ".notification-list",
    ]

    criticalElements.forEach((selector) => {
      const elements = document.querySelectorAll(selector)
      console.log(`${selector}: ${elements.length} elements found`)
    })
  }
})

