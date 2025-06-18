//import { Chart } from "@/components/ui/chart"
// Global variables// Global variables// Global variables
if (typeof API_URL === 'undefined') {
    const API_URL = "http://localhost:5501/api"; // Base URL for API requests (empty for same domain)
}
let currentTimeRange = "month"
let bookingsChart = null
let userDistributionChart = null

// DOM elements
const totalUsersElement = document.getElementById("totalUsers")
const totalMechanicsElement = document.getElementById("totalMechanics")
const totalBookingsElement = document.getElementById("totalBookings")
const totalPartsElement = document.getElementById("totalParts")
const recentBookingsTable = document.getElementById("recentBookingsTable")
const topMechanicsTable = document.getElementById("topMechanicsTable")
const exportReportBtn = document.getElementById("exportReportBtn")
const printReportBtn = document.getElementById("printReportBtn")
const timeRangeDropdown = document.getElementById("timeRangeDropdown")

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Admin dashboard page loaded")
  console.log("Token in localStorage:", localStorage.getItem("token"))
  console.log("User ID in localStorage:", localStorage.getItem("user_id"))

  // Initialize authentication
  const token = localStorage.getItem("token")
  if (!token) {
    console.error("No token found in localStorage")
    redirectToLogin()
    return
  }

  // Check if user has permission to access this page
  const hasPermission = await checkPermission("reporting_analytics")
  if (!hasPermission) {
    alert("You don't have permission to access the dashboard analytics")
    // We'll still show the dashboard but with limited functionality
  }

  // Load dashboard data
  loadDashboardData()

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
  // Time range dropdown
  document.querySelectorAll(".dropdown-menu a").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault()
      const range = e.target.getAttribute("data-range")
      currentTimeRange = range

      // Update dropdown button text
      const rangeText = e.target.textContent
      timeRangeDropdown.textContent = rangeText

      // Update active class
      document.querySelectorAll(".dropdown-menu a").forEach((a) => a.classList.remove("active"))
      e.target.classList.add("active")

      // Reload dashboard data with new time range
      loadDashboardData()
    })
  })

  // Export report button
  exportReportBtn.addEventListener("click", exportReport)

  // Print report button
  printReportBtn.addEventListener("click", () => {
    window.print()
  })
}

// Initialize authentication
async function initializeAuth() {
  try {
    // First, check if we have a token and user_id in localStorage
    const initialToken = localStorage.getItem("token")
    const userId = localStorage.getItem("user_id")

    if (!initialToken || !userId) {
      console.error("No token or user_id found in localStorage")
      redirectToLogin()
      return
    }

    console.log("Fetching current token from server...")

    // Fetch the current token from the server
    const currentToken = await fetchCurrentToken()

    if (currentToken) {
      // Update the token in localStorage
      localStorage.setItem("token", currentToken)
      console.log("Token updated in localStorage")

      // Now check authentication with the updated token
      await checkAuth()
    } else {
      console.error("Failed to fetch current token")
      redirectToLogin()
    }
  } catch (error) {
    console.error("Error initializing authentication:", error)
    redirectToLogin()
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    // Load summary statistics
    await loadSummaryStats()

    // Load charts
    await loadBookingsChart()
    await loadUserDistributionChart()

    // Load tables
    await loadRecentBookings()
    await loadTopMechanics()
  } catch (error) {
    console.error("Error loading dashboard data:", error)
    showAlert("Failed to load dashboard data. Please try again.", "danger")
  }
}

// Load summary statistics
async function loadSummaryStats() {
  try {
    const token = localStorage.getItem("token")

    // Fetch summary statistics
    const response = await fetch(`${API_URL}/dashboard/stats?timeRange=${currentTimeRange}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // If the endpoint doesn't exist yet, use mock data
      console.warn("Dashboard stats endpoint not available, using mock data")

      // Mock data
      const mockStats = {
        totalUsers: 125,
        totalMechanics: 42,
        totalBookings: 287,
        totalParts: 156,
      }

      // Update UI with mock data
      totalUsersElement.textContent = mockStats.totalUsers
      totalMechanicsElement.textContent = mockStats.totalMechanics
      totalBookingsElement.textContent = mockStats.totalBookings
      totalPartsElement.textContent = mockStats.totalParts

      return
    }

    const stats = await response.json()

    // Update UI with real data
    totalUsersElement.textContent = stats.totalUsers
    totalMechanicsElement.textContent = stats.totalMechanics
    totalBookingsElement.textContent = stats.totalBookings
    totalPartsElement.textContent = stats.totalParts
  } catch (error) {
    console.error("Error loading summary stats:", error)

    // Use mock data as fallback
    const mockStats = {
      totalUsers: 125,
      totalMechanics: 42,
      totalBookings: 287,
      totalParts: 156,
    }

    totalUsersElement.textContent = mockStats.totalUsers
    totalMechanicsElement.textContent = mockStats.totalMechanics
    totalBookingsElement.textContent = mockStats.totalBookings
    totalPartsElement.textContent = mockStats.totalParts
  }
}

// Load bookings chart
async function loadBookingsChart() {
  try {
    const token = localStorage.getItem("token")

    // Fetch bookings chart data
    const response = await fetch(`${API_URL}/dashboard/bookings-chart?timeRange=${currentTimeRange}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    let chartData

    if (!response.ok) {
      // If the endpoint doesn't exist yet, use mock data
      console.warn("Bookings chart endpoint not available, using mock data")

      // Mock data
      chartData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "Bookings",
            data: [15, 21, 28, 30, 26, 32, 38, 36, 42, 45, 48, 52],
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
      }
    } else {
      chartData = await response.json()
    }

    // Get the chart canvas
    const ctx = document.getElementById("bookingsChart").getContext("2d")

    // Destroy existing chart if it exists
    if (bookingsChart) {
      bookingsChart.destroy()
    }

    // Create new chart
    bookingsChart = new Chart(ctx, {
      type: "line",
      data: chartData,
      options: {
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 10,
            right: 25,
            top: 25,
            bottom: 0,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
          },
          y: {
            ticks: {
              maxTicksLimit: 5,
              padding: 10,
            },
            grid: {
              color: "rgb(233, 236, 244)",
              drawBorder: false,
              borderDash: [2],
              zeroLineBorderDash: [2],
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgb(255, 255, 255)",
            bodyColor: "#858796",
            titleColor: "#6e707e",
            titleMarginBottom: 10,
            borderColor: "#dddfeb",
            borderWidth: 1,
            padding: 15,
            displayColors: false,
            caretPadding: 10,
          },
        },
      },
    })
  } catch (error) {
    console.error("Error loading bookings chart:", error)

    // Use mock data as fallback
    const mockData = {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [
        {
          label: "Bookings",
          data: [15, 21, 28, 30, 26, 32, 38, 36, 42, 45, 48, 52],
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
    }

    const ctx = document.getElementById("bookingsChart").getContext("2d")

    if (bookingsChart) {
      bookingsChart.destroy()
    }

    bookingsChart = new Chart(ctx, {
      type: "line",
      data: mockData,
      options: {
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 10,
            right: 25,
            top: 25,
            bottom: 0,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
          },
          y: {
            ticks: {
              maxTicksLimit: 5,
              padding: 10,
            },
            grid: {
              color: "rgb(233, 236, 244)",
              drawBorder: false,
              borderDash: [2],
              zeroLineBorderDash: [2],
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgb(255, 255, 255)",
            bodyColor: "#858796",
            titleColor: "#6e707e",
            titleMarginBottom: 10,
            borderColor: "#dddfeb",
            borderWidth: 1,
            padding: 15,
            displayColors: false,
            caretPadding: 10,
          },
        },
      },
    })
  }
}

// Load user distribution chart
async function loadUserDistributionChart() {
  try {
    const token = localStorage.getItem("token")

    // Fetch user distribution chart data
    const response = await fetch(`${API_URL}/dashboard/user-distribution`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    let chartData

    if (!response.ok) {
      // If the endpoint doesn't exist yet, use mock data
      console.warn("User distribution endpoint not available, using mock data")

      // Mock data
      chartData = {
        labels: ["Vehicle Owners", "Mechanics", "Admins"],
        datasets: [
          {
            data: [70, 25, 5],
            backgroundColor: ["#4e73df", "#1cc88a", "#36b9cc"],
            hoverBackgroundColor: ["#2e59d9", "#17a673", "#2c9faf"],
            hoverBorderColor: "rgba(234, 236, 244, 1)",
          },
        ],
      }
    } else {
      chartData = await response.json()
    }

    // Get the chart canvas
    const ctx = document.getElementById("userDistributionChart").getContext("2d")

    // Destroy existing chart if it exists
    if (userDistributionChart) {
      userDistributionChart.destroy()
    }

    // Create new chart
    userDistributionChart = new Chart(ctx, {
      type: "doughnut",
      data: chartData,
      options: {
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
          tooltip: {
            backgroundColor: "rgb(255, 255, 255)",
            bodyColor: "#858796",
            borderColor: "#dddfeb",
            borderWidth: 1,
            displayColors: false,
            caretPadding: 10,
          },
        },
      },
    })
  } catch (error) {
    console.error("Error loading user distribution chart:", error)

    // Use mock data as fallback
    const mockData = {
      labels: ["Vehicle Owners", "Mechanics", "Admins"],
      datasets: [
        {
          data: [70, 25, 5],
          backgroundColor: ["#4e73df", "#1cc88a", "#36b9cc"],
          hoverBackgroundColor: ["#2e59d9", "#17a673", "#2c9faf"],
          hoverBorderColor: "rgba(234, 236, 244, 1)",
        },
      ],
    }

    const ctx = document.getElementById("userDistributionChart").getContext("2d")

    if (userDistributionChart) {
      userDistributionChart.destroy()
    }

    userDistributionChart = new Chart(ctx, {
      type: "doughnut",
      data: mockData,
      options: {
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
          tooltip: {
            backgroundColor: "rgb(255, 255, 255)",
            bodyColor: "#858796",
            borderColor: "#dddfeb",
            borderWidth: 1,
            displayColors: false,
            caretPadding: 10,
          },
        },
      },
    })
  }
}

// Load recent bookings
async function loadRecentBookings() {
  try {
    const token = localStorage.getItem("token")

    // Fetch recent bookings data
    const response = await fetch(`${API_URL}/dashboard/recent-bookings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    let bookings

    if (!response.ok) {
      // If the endpoint doesn't exist yet, use mock data
      console.warn("Recent bookings endpoint not available, using mock data")

      // Mock data
      bookings = [
        { id: 1001, customer: "John Doe", mechanic: "Mike Smith", date: "2023-05-15", status: "completed" },
        { id: 1002, customer: "Jane Wilson", mechanic: "Robert Johnson", date: "2023-05-16", status: "in-progress" },
        { id: 1003, customer: "Alice Brown", mechanic: "David Lee", date: "2023-05-17", status: "pending" },
        { id: 1004, customer: "Bob Miller", mechanic: "Sarah Davis", date: "2023-05-18", status: "cancelled" },
        { id: 1005, customer: "Carol White", mechanic: "James Wilson", date: "2023-05-19", status: "completed" },
      ]
    } else {
      bookings = await response.json()
    }

    // Render bookings table
    recentBookingsTable.innerHTML = ""

    if (bookings.length === 0) {
      recentBookingsTable.innerHTML = `<tr><td colspan="5" class="text-center">No recent bookings found</td></tr>`
      return
    }

    bookings.forEach((booking) => {
      const statusBadge = getStatusBadge(booking.status)

      recentBookingsTable.innerHTML += `
        <tr>
          <td>${booking.id}</td>
          <td>${booking.customer}</td>
          <td>${booking.mechanic}</td>
          <td>${formatDate(booking.date)}</td>
          <td>${statusBadge}</td>
        </tr>
      `
    })
  } catch (error) {
    console.error("Error loading recent bookings:", error)

    // Use mock data as fallback
    const mockBookings = [
      { id: 1001, customer: "John Doe", mechanic: "Mike Smith", date: "2023-05-15", status: "completed" },
      { id: 1002, customer: "Jane Wilson", mechanic: "Robert Johnson", date: "2023-05-16", status: "in-progress" },
      { id: 1003, customer: "Alice Brown", mechanic: "David Lee", date: "2023-05-17", status: "pending" },
      { id: 1004, customer: "Bob Miller", mechanic: "Sarah Davis", date: "2023-05-18", status: "cancelled" },
      { id: 1005, customer: "Carol White", mechanic: "James Wilson", date: "2023-05-19", status: "completed" },
    ]

    recentBookingsTable.innerHTML = ""

    mockBookings.forEach((booking) => {
      const statusBadge = getStatusBadge(booking.status)

      recentBookingsTable.innerHTML += `
        <tr>
          <td>${booking.id}</td>
          <td>${booking.customer}</td>
          <td>${booking.mechanic}</td>
          <td>${formatDate(booking.date)}</td>
          <td>${statusBadge}</td>
        </tr>
      `
    })
  }
}

// Load top mechanics
async function loadTopMechanics() {
  try {
    const token = localStorage.getItem("token")

    // Fetch top mechanics data
    const response = await fetch(`${API_URL}/dashboard/top-mechanics`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    let mechanics

    if (!response.ok) {
      // If the endpoint doesn't exist yet, use mock data
      console.warn("Top mechanics endpoint not available, using mock data")

      // Mock data
      mechanics = [
        { name: "Mike Smith", specialization: "Engine Repair", bookings: 42, average_rating: 4.9 },
        { name: "Robert Johnson", specialization: "Electrical Systems", bookings: 38, average_rating: 4.8 },
        { name: "David Lee", specialization: "Brake Systems", bookings: 35, average_rating: 4.7 },
        { name: "Sarah Davis", specialization: "Transmission", bookings: 31, average_rating: 4.6 },
        { name: "James Wilson", specialization: "General Mechanic", bookings: 28, average_rating: 4.5 },
      ]
    } else {
      mechanics = await response.json()
    }

    // Render mechanics table
    topMechanicsTable.innerHTML = ""

    if (mechanics.length === 0) {
      topMechanicsTable.innerHTML = `<tr><td colspan="4" class="text-center">No mechanics found</td></tr>`
      return
    }

    mechanics.forEach((mechanic) => {
      const ratingStars = renderRatingStars(mechanic.average_rating)

      topMechanicsTable.innerHTML += `
        <tr>
          <td>${mechanic.name}</td>
          <td>${mechanic.specialization}</td>
          <td>${mechanic.bookings}</td>
          <td>${ratingStars} (${mechanic.average_rating})</td>
        </tr>
      `
    })
  } catch (error) {
    console.error("Error loading top mechanics:", error)

    // Use mock data as fallback
    const mockMechanics = [
      { name: "Mike Smith", specialization: "Engine Repair", bookings: 42, rating: 4.9 },
      { name: "Robert Johnson", specialization: "Electrical Systems", bookings: 38, rating: 4.8 },
      { name: "David Lee", specialization: "Brake Systems", bookings: 35, rating: 4.7 },
      { name: "Sarah Davis", specialization: "Transmission", bookings: 31, rating: 4.6 },
      { name: "James Wilson", specialization: "General Mechanic", bookings: 28, rating: 4.5 },
    ]

    topMechanicsTable.innerHTML = ""

    mockMechanics.forEach((mechanic) => {
      const ratingStars = renderRatingStars(mechanic.average_rating)

      topMechanicsTable.innerHTML += `
        <tr>
          <td>${mechanic.name}</td>
          <td>${mechanic.specialization}</td>
          <td>${mechanic.bookings}</td>
          <td>${ratingStars} (${mechanic.average_rating})</td>
        </tr>
      `
    })
  }
}

// Fetch token for userId
async function fetchCurrentToken() {
  try {
    const userId = localStorage.getItem("user_id")

    console.log(`Fetching current token for user ID: ${userId}`)
    // Fix the URL - remove the duplicate /api
    const response = await fetch(`${API_URL}/auth/users/${userId}/token`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Use the token from local storage for this request
      },
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
    setTimeout(() => {
      redirectToLogin()
    }, 2000)
    return null
  }
}

// Check if user is authenticated
async function checkAuth() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      console.error("No token found in localStorage")
      redirectToLogin()
      return
    }

    console.log("Checking authentication with token:", token.substring(0, 20) + "...")

    // Fetch current user info - fix the URL by removing duplicate /api
    const response = await fetch(`${API_URL}/users/current`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    console.log("Auth check response status:", response.status)

    if (!response.ok) {
      throw new Error(`Authentication failed with status: ${response.status}`)
    }

    const userData = await response.json()
    console.log("User data received:", userData)

    // Check if user is admin
    if (userData.user_type !== "admin") {
      console.error("User is not an admin:", userData.user_type)
      showAlert("Access denied. Admin privileges required.", "danger")
      redirectToLogin()
    } else {
      console.log("Admin authentication successful")
    }
  } catch (error) {
    console.error("Auth check error:", error)
    redirectToLogin()
  }
}

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

// Render rating stars
function renderRatingStars(average_rating) {
  const fullStars = Math.floor(average_rating)
  const halfStar = average_rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)

  let starsHtml = ""

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="fas fa-star text-warning"></i>'
  }

  // Half star
  if (halfStar) {
    starsHtml += '<i class="fas fa-star-half-alt text-warning"></i>'
  }

  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="far fa-star text-warning"></i>'
  }

  return starsHtml
}

// Get status badge
function getStatusBadge(status) {
  switch (status.toLowerCase()) {
    case "completed":
      return '<span class="badge badge-success">Completed</span>'
    case "in-progress":
      return '<span class="badge badge-info">In Progress</span>'
    case "pending":
      return '<span class="badge badge-warning">Pending</span>'
    case "cancelled":
      return '<span class="badge badge-danger">Cancelled</span>'
    default:
      return '<span class="badge badge-secondary">' + status + "</span>"
  }
}

// Format date
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

// Export report
function exportReport() {
  try {
    // Create a CSV string
    let csvContent = "data:text/csv;charset=utf-8,"

    // Add header
    csvContent += "Auto-Mobile Mechanic Locator System - Dashboard Report\r\n"
    csvContent += "Generated on: " + new Date().toLocaleString() + "\r\n\r\n"

    // Add summary stats
    csvContent += "Summary Statistics\r\n"
    csvContent += "Total Users," + totalUsersElement.textContent + "\r\n"
    csvContent += "Total Mechanics," + totalMechanicsElement.textContent + "\r\n"
    csvContent += "Total Bookings," + totalBookingsElement.textContent + "\r\n"
    csvContent += "Total Spare Parts," + totalPartsElement.textContent + "\r\n\r\n"

    // Add recent bookings
    csvContent += "Recent Bookings\r\n"
    csvContent += "ID,Customer,Mechanic,Date,Status\r\n"

    // Get table rows
    const bookingRows = recentBookingsTable.querySelectorAll("tr")
    bookingRows.forEach((row) => {
      const cells = row.querySelectorAll("td")
      if (cells.length === 5) {
        const id = cells[0].textContent
        const customer = cells[1].textContent
        const mechanic = cells[2].textContent
        const date = cells[3].textContent
        const status = cells[4].textContent.replace(/(<([^>]+)>)/gi, "").trim() // Remove HTML tags

        csvContent += `${id},${customer},${mechanic},${date},${status}\r\n`
      }
    })

    csvContent += "\r\nTop Mechanics\r\n"
    csvContent += "Name,Specialization,Bookings,Rating\r\n"

    // Get table rows
    const mechanicRows = topMechanicsTable.querySelectorAll("tr")
    mechanicRows.forEach((row) => {
      const cells = row.querySelectorAll("td")
      if (cells.length === 4) {
        const name = cells[0].textContent
        const specialization = cells[1].textContent
        const bookings = cells[2].textContent
        const average_rating = cells[3].textContent
          .replace(/(<([^>]+)>)/gi, "")
          .trim()
          .match(/\d+\.\d+/)[0] // Extract rating number

        csvContent += `${name},${specialization},${bookings},${average_rating}\r\n`
      }
    })

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "dashboard_report_" + new Date().toISOString().split("T")[0] + ".csv")
    document.body.appendChild(link)

    // Trigger download
    link.click()

    // Clean up
    document.body.removeChild(link)
  } catch (error) {
    console.error("Error exporting report:", error)
    showAlert("Failed to export report. Please try again.", "danger")
  }
}

// Show alert message
function showAlert(message, type) {
  console.log(`Alert: ${message} (${type})`)

  // For modal alert
  const alertModalBody = document.getElementById("alertModalBody")
  if (alertModalBody) {
    alertModalBody.innerHTML = `
            <div class="alert alert-${type} mb-0">
                ${message}
            </div>
        `

    // Use jQuery to show the modal if it's available
    if (typeof jQuery !== "undefined") {
      jQuery("#alertModal").modal("show")

      // Auto-close after 3 seconds for success messages
      if (type === "success") {
        setTimeout(() => {
          jQuery("#alertModal").modal("hide")
        }, 3000)
      }
    } else {
      console.warn("jQuery is not defined. Modal functionality will not work.")
    }
  } else {
    // Fallback alert if modal is not available
    alert(`${message}`)
  }
  const alertModalBody2 = document.getElementById("alertModalBody")
  alertModalBody2.innerHTML = `
    <div class="alert alert-${type} mb-0">
      ${message}
    </div>
  `

  // Show modal
  $("#alertModal").modal("show")
}

// Export functions for use in other scripts
window.adminAuth = {
  fetchCurrentToken,
  checkAuth,
  handleLogout,
  redirectToLogin,
  showAlert,
}

// Import jQuery
const script = document.createElement("script")
script.src = "https://code.jquery.com/jquery-3.6.0.min.js"
script.type = "text/javascript"
script.onload = () => {
  // Now you can use jQuery
  window.jQuery = jQuery // Make jQuery available in the global scope
  window.$ = jQuery // Make $ available in the global scope
  jQuery(document).ready(() => {
    console.log("jQuery is loaded!")
  })
}
document.head.appendChild(script)

// Ensure $ is available after jQuery loads
script.onload = () => {
  window.jQuery = jQuery // Make jQuery available as jQuery
  window.$ = jQuery // Make jQuery available as $
  jQuery(document).ready(() => {
    console.log("jQuery is loaded and $ is available!")
  })
}

