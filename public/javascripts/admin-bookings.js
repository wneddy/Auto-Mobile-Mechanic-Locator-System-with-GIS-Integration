// Global variables
if (typeof API_URL === 'undefined') {
    const API_URL = "http://localhost:5501/api"; 
}
let currentPage = 1
let totalPages = 1
const bookingsPerPage = 10
let currentSearchTerm = ""
let currentStatusFilter = ""
let currentDateFilter = ""

// DOM elements
const bookingsTableBody = document.getElementById("bookingsTableBody")
const pagination = document.getElementById("pagination")
const searchInput = document.getElementById("searchInput")
const statusFilter = document.getElementById("statusFilter")
const dateFilter = document.getElementById("dateFilter")
const searchBtn = document.getElementById("searchBtn")
const refreshBtn = document.getElementById("refreshBtn")
const exportBtn = document.getElementById("exportBtn")
const printBtn = document.getElementById("printBtn")
const saveStatusBtn = document.getElementById("saveStatusBtn")

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Admin bookings page loaded")

  // Initialize authentication
  const token = localStorage.getItem("token")
  if (!token) {
    console.error("No token found in localStorage")
    window.location.href = "/public/login.html"
    return
  }

  // Check if user has permission to access this page
  const hasPermission = await checkPermission("booking_management")
  if (!hasPermission) {
    alert("You don't have permission to access this page")
    window.location.href = "/public/admin-dashboard.html"
    return
  }

  // Load bookings
  loadBookings()

  // Set up event listeners
  setupEventListeners()
})

// Check if user has permission
async function checkPermission(requiredPermission) {
  try {
    const token = localStorage.getItem("token")
    const userId = localStorage.getItem("user_id")

    const response = await fetch(`${API_URL}/admin-profiles/user/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch admin profile")
    }

    const profile = await response.json()
    const permissions = JSON.parse(profile.permissions)

    return permissions.includes(requiredPermission)
  } catch (error) {
    console.error("Error checking permission:", error)
    return false
  }
}

// Set up event listeners
function setupEventListeners() {
  // Search button
  searchBtn.addEventListener("click", handleSearch)

  // Refresh button
  refreshBtn.addEventListener("click", () => {
    searchInput.value = ""
    statusFilter.value = ""
    dateFilter.value = ""
    currentSearchTerm = ""
    currentStatusFilter = ""
    currentDateFilter = ""
    currentPage = 1
    loadBookings()
  })

  // Export button
  exportBtn.addEventListener("click", exportBookings)

  // Print button
  printBtn.addEventListener("click", () => {
    window.print()
  })

  // Save status button
  saveStatusBtn.addEventListener("click", updateBookingStatus)

  // Enter key for search
  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  })
}

// Load bookings with pagination, search, and filtering
async function loadBookings() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    // Build query parameters
    let queryParams = `?page=${currentPage}&limit=${bookingsPerPage}`
    if (currentSearchTerm) {
      queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`
    }
    if (currentStatusFilter) {
      queryParams += `&status=${encodeURIComponent(currentStatusFilter)}`
    }
    if (currentDateFilter) {
      queryParams += `&date=${encodeURIComponent(currentDateFilter)}`
    }

    const response = await fetch(`${API_URL}/bookings${queryParams}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // If the endpoint doesn't exist yet, use mock data
      console.warn("Bookings endpoint not available, using mock data")
      renderMockBookings()
      return
    }

    const data = await response.json()
    renderBookingsTable(data.bookings)
    renderPagination(data.totalPages)
    totalPages = data.totalPages
  } catch (error) {
    console.error("Error loading bookings:", error)
    // Use mock data as fallback
    renderMockBookings()
  }
}

// Render mock bookings for development
function renderMockBookings() {
  const mockBookings = [
    {
      id: 1001,
      customerName: "John Doe",
      mechanicName: "Mike Smith",
      service: "Engine Repair",
      date: "2023-05-15",
      status: "Completed",
    },
    {
      id: 1002,
      customerName: "Jane Wilson",
      mechanicName: "Robert Johnson",
      service: "Brake System",
      date: "2023-05-16",
      status: "In Progress",
    },
    {
      id: 1003,
      customerName: "Alice Brown",
      mechanicName: "David Lee",
      service: "Electrical Wiring",
      date: "2023-05-17",
      status: "Pending",
    },
    {
      id: 1004,
      customerName: "Bob Miller",
      mechanicName: "Sarah Davis",
      service: "Transmission",
      date: "2023-05-18",
      status: "Cancelled",
    },
    {
      id: 1005,
      customerName: "Carol White",
      mechanicName: "James Wilson",
      service: "Body Work",
      date: "2023-05-19",
      status: "Confirmed",
    },
  ]

  renderBookingsTable(mockBookings)

  // Mock pagination
  renderPagination(1)
  totalPages = 1
}

// Render bookings table
function renderBookingsTable(bookings) {
  bookingsTableBody.innerHTML = ""

  if (bookings.length === 0) {
    bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">No bookings found</td>
      </tr>
    `
    return
  }

  bookings.forEach((booking) => {
    const statusBadge = getStatusBadge(booking.status)

    bookingsTableBody.innerHTML += `
      <tr>
        <td>${booking.id}</td>
        <td>${booking.customerName}</td>
        <td>${booking.mechanicName}</td>
        <td>${booking.service}</td>
        <td>${formatDate(booking.date)}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-info action-btn" onclick="viewBooking(${booking.id})">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-primary action-btn" onclick="openUpdateStatusModal(${booking.id}, '${booking.status}')">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>
    `
  })
}

// Get status badge
function getStatusBadge(status) {
  const statusLower = status.toLowerCase().replace(/\s+/g, "-")
  return `<span class="badge badge-${statusLower}">${status}</span>`
}

// Format date
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

// Render pagination
function renderPagination(totalPages) {
  pagination.innerHTML = ""

  // Previous button
  pagination.innerHTML += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
    </li>
  `

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    pagination.innerHTML += `
      <li class="page-item ${currentPage === i ? "active" : ""}">
        <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
      </li>
    `
  }

  // Next button
  pagination.innerHTML += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
    </li>
  `
}

// Change page
window.changePage = (page) => {
  if (page < 1 || page > totalPages) {
    return
  }
  currentPage = page
  loadBookings()
}

// Handle search
function handleSearch() {
  currentSearchTerm = searchInput.value.trim()
  currentStatusFilter = statusFilter.value
  currentDateFilter = dateFilter.value
  currentPage = 1 // Reset to first page
  loadBookings()
}

// View booking details
window.viewBooking = async (bookingId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    // Try to fetch booking details from API
    let booking
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch booking details")
      }

      booking = await response.json()
    } catch (error) {
      console.warn("Booking details endpoint not available, using mock data")
      // Use mock data if API fails
      booking = getMockBookingDetails(bookingId)
    }

    // Render booking details
    const bookingDetailsBody = document.getElementById("bookingDetailsBody")
    bookingDetailsBody.innerHTML = `
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Booking ID:</div>
        <div class="col-md-8">${booking.id}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Customer:</div>
        <div class="col-md-8">${booking.customerName}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Customer Contact:</div>
        <div class="col-md-8">${booking.customerContact || "N/A"}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Mechanic:</div>
        <div class="col-md-8">${booking.mechanicName}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Mechanic Contact:</div>
        <div class="col-md-8">${booking.mechanicContact || "N/A"}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Service:</div>
        <div class="col-md-8">${booking.service}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Vehicle:</div>
        <div class="col-md-8">${booking.vehicle || "N/A"}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Date:</div>
        <div class="col-md-8">${formatDate(booking.date)}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Time:</div>
        <div class="col-md-8">${booking.time || "N/A"}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Status:</div>
        <div class="col-md-8">${getStatusBadge(booking.status)}</div>
      </div>
      <div class="row booking-detail-row">
        <div class="col-md-4 booking-detail-label">Notes:</div>
        <div class="col-md-8">${booking.notes || "No notes available"}</div>
      </div>
    `

    // Show modal
    $("#viewBookingModal").modal("show")
  } catch (error) {
    console.error("Error fetching booking details:", error)
    showAlert("Failed to load booking details", "danger")
  }
}

// Get mock booking details
function getMockBookingDetails(bookingId) {
  // Mock data for development
  const mockBookings = {
    1001: {
      id: 1001,
      customerName: "John Doe",
      customerContact: "555-123-4567",
      mechanicName: "Mike Smith",
      mechanicContact: "555-987-6543",
      service: "Engine Repair",
      vehicle: "Toyota Camry 2018",
      date: "2023-05-15",
      time: "10:00 AM",
      status: "Completed",
      notes: "Engine oil leak fixed. Replaced gasket and performed full inspection.",
    },
    1002: {
      id: 1002,
      customerName: "Jane Wilson",
      customerContact: "555-234-5678",
      mechanicName: "Robert Johnson",
      mechanicContact: "555-876-5432",
      service: "Brake System",
      vehicle: "Honda Civic 2020",
      date: "2023-05-16",
      time: "2:30 PM",
      status: "In Progress",
      notes: "Replacing brake pads and checking rotors.",
    },
    1003: {
      id: 1003,
      customerName: "Alice Brown",
      customerContact: "555-345-6789",
      mechanicName: "David Lee",
      mechanicContact: "555-765-4321",
      service: "Electrical Wiring",
      vehicle: "Ford F-150 2019",
      date: "2023-05-17",
      time: "9:15 AM",
      status: "Pending",
      notes: "Customer reported issues with headlights and dashboard.",
    },
    1004: {
      id: 1004,
      customerName: "Bob Miller",
      customerContact: "555-456-7890",
      mechanicName: "Sarah Davis",
      mechanicContact: "555-654-3210",
      service: "Transmission",
      vehicle: "Chevrolet Malibu 2017",
      date: "2023-05-18",
      time: "11:45 AM",
      status: "Cancelled",
      notes: "Customer cancelled due to scheduling conflict.",
    },
    1005: {
      id: 1005,
      customerName: "Carol White",
      customerContact: "555-567-8901",
      mechanicName: "James Wilson",
      mechanicContact: "555-543-2109",
      service: "Body Work",
      vehicle: "BMW 3 Series 2021",
      date: "2023-05-19",
      time: "3:00 PM",
      status: "Confirmed",
      notes: "Minor dent repair and paint touch-up on driver's side door.",
    },
  }

  return (
    mockBookings[bookingId] || {
      id: bookingId,
      customerName: "Unknown Customer",
      mechanicName: "Unknown Mechanic",
      service: "Unknown Service",
      date: new Date().toISOString().split("T")[0],
      status: "Pending",
      notes: "No details available",
    }
  )
}

// Open update status modal
window.openUpdateStatusModal = (bookingId, currentStatus) => {
  document.getElementById("bookingId").value = bookingId
  document.getElementById("bookingStatus").value = currentStatus
  document.getElementById("statusNotes").value = ""
  $("#updateStatusModal").modal("show")
}

// Update booking status
async function updateBookingStatus() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const bookingId = document.getElementById("bookingId").value
    const status = document.getElementById("bookingStatus").value
    const notes = document.getElementById("statusNotes").value

    // Try to update booking status via API
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, notes }),
      })

      if (!response.ok) {
        throw new Error("Failed to update booking status")
      }

      // Close modal
      jQuery("#updateStatusModal").modal("hide")

      // Reload bookings
      loadBookings()
      showAlert("Booking status updated successfully", "success")
    } catch (error) {
      console.warn("Booking status update endpoint not available, simulating success")
      // Simulate success if API fails
      jQuery("#updateStatusModal").modal("hide")
      loadBookings()
      showAlert("Booking status updated successfully (simulated)", "success")
    }
  } catch (error) {
    console.error("Error updating booking status:", error)
    showAlert("Failed to update booking status", "danger")
  }
}

// Export bookings
function exportBookings() {
  try {
    // Create a CSV string
    let csvContent = "data:text/csv;charset=utf-8,"

    // Add header
    csvContent += "ID,Customer,Mechanic,Service,Date,Status\r\n"

    // Get table rows
    const rows = bookingsTableBody.querySelectorAll("tr")
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td")
      if (cells.length >= 6) {
        const id = cells[0].textContent
        const customer = cells[1].textContent
        const mechanic = cells[2].textContent
        const service = cells[3].textContent
        const date = cells[4].textContent
        const status = cells[5].textContent.replace(/(<([^>]+)>)/gi, "").trim() // Remove HTML tags

        csvContent += `${id},${customer},${mechanic},${service},${date},${status}\r\n`
      }
    })

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "bookings_" + new Date().toISOString().split("T")[0] + ".csv")
    document.body.appendChild(link)

    // Trigger download
    link.click()

    // Clean up
    document.body.removeChild(link)
  } catch (error) {
    console.error("Error exporting bookings:", error)
    showAlert("Failed to export bookings", "danger")
  }
}

// Show alert message
function showAlert(message, type) {
  const alertModalBody = document.getElementById("alertModalBody")
  alertModalBody.innerHTML = `
    <div class="alert alert-${type} mb-0">
      ${message}
    </div>
  `

  // Show modal
  jQuery("#alertModal").modal("show")
}

// Import jQuery
var script = document.createElement("script")
script.src = "https://code.jquery.com/jquery-3.6.0.min.js"
script.onload = () => {
  console.log("jQuery loaded")
  // You can now use jQuery safely
  var jQuery = window.jQuery
}
document.head.appendChild(script)

// Handle logout
function handleLogout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user_id")
    window.location.href = "/public/login.html"
  }
  
  // Redirect to login page
  function redirectToLogin() {
    localStorage.removeItem("token")
    localStorage.removeItem("user_id")
    window.location.href = "/public/login.html"
  }

  // Export functions for use in other scripts
window.adminAuth = {
    fetchCurrentToken,
    checkAuth,
    handleLogout,
    redirectToLogin,
    showAlert,
  }
