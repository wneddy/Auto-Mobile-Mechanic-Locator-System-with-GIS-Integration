// Global variables// Global variables
if (typeof API_URL === 'undefined') {
    const API_URL = "http://localhost:5501/api"; // Base URL for API requests (empty for same domain)
}
let currentPage = 1
let totalPages = 1
const mechanicsPerPage = 10
let currentSearchTerm = ""
let currentStatusFilter = ""

// DOM elements
const mechanicsTableBody = document.getElementById("mechanicsTableBody")
const pagination = document.getElementById("pagination")
const searchInput = document.getElementById("searchInput")
const statusFilter = document.getElementById("statusFilter")
const searchBtn = document.getElementById("searchBtn")
const confirmVerifyBtn = document.getElementById("confirmVerifyBtn")

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Admin mechanics page loaded")

  // Initialize authentication
  const token = localStorage.getItem("token")
  if (!token) {
    console.error("No token found in localStorage")
    window.authHandler.redirectToLogin()
    return
  }

  // Check if user has permission to access this page
  const hasPermission = await checkPermission("mechanic_management")
  if (!hasPermission) {
    alert("You don't have permission to access this page")
    window.location.href = "/public/admin-spare-parts.html"
    return
  }

  // Load mechanics
  loadMechanics()

  // Set up event listeners
  searchBtn.addEventListener("click", handleSearch)
  confirmVerifyBtn.addEventListener("click", handleVerifyMechanic)

  // Enter key for search
  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  })
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

// Load mechanics with pagination, search, and filtering
async function loadMechanics() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    // Build query parameters
    let queryParams = `?page=${currentPage}&limit=${mechanicsPerPage}`
    if (currentSearchTerm) {
      queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`
    }
    if (currentStatusFilter) {
      queryParams += `&status=${encodeURIComponent(currentStatusFilter)}`
    }

    const response = await fetch(`${API_URL}/mechanics${queryParams}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch mechanics")
    }

    const data = await response.json()
    renderMechanicsTable(data.mechanics)
    renderPagination(data.totalPages)
    totalPages = data.totalPages
  } catch (error) {
    console.error("Error loading mechanics:", error)
    alert("Failed to load mechanics. Please try again.")
  }
}

// Render mechanics table
function renderMechanicsTable(mechanics) {
  mechanicsTableBody.innerHTML = ""

  if (mechanics.length === 0) {
    mechanicsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center">No mechanics found</td>
      </tr>
    `
    return
  }

  mechanics.forEach((mechanic) => {
    const statusBadge = mechanic.isVerified
      ? '<span class="badge badge-verified">Verified</span>'
      : '<span class="badge badge-pending">Pending</span>'

    const ratingStars = renderRatingStars(mechanic.average_rating || 0)

    mechanicsTableBody.innerHTML += `
      <tr>
        <td>${mechanic.id}</td>
        <td>
          ${
            mechanic.profile_picture
              ? `<img src="${mechanic.profile_picture}" alt="${mechanic.full_name}" class="table-img">`
              : '<span class="badge badge-secondary">No Image</span>'
          }
        </td>
        <td>${mechanic.full_name}</td>
        <td>${mechanic.specialization || "General"}</td>
        <td>${mechanic.location || "N/A"}</td>
        <td>${statusBadge}</td>
        <td>${ratingStars} (${mechanic.average_rating || 0})</td>
        <td>
          <button class="btn btn-sm btn-info action-btn" onclick="viewMechanic(${mechanic.id})">
            <i class="fas fa-eye"></i>
          </button>
          ${
            !mechanic.isVerified
              ? `<button class="btn btn-sm btn-success action-btn" onclick="openVerifyModal(${mechanic.id})">
                  <i class="fas fa-check"></i>
                </button>`
              : ""
          }
        </td>
      </tr>
    `
  })
}

// Render rating stars
function renderRatingStars(average_rating) {
  const fullStars = Math.floor(average_rating)
  const halfStar = average_rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)

  let starsHtml = ""

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="fas fa-star rating-stars"></i>'
  }

  // Half star
  if (halfStar) {
    starsHtml += '<i class="fas fa-star-half-alt rating-stars"></i>'
  }

  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="far fa-star rating-stars"></i>'
  }

  return starsHtml
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
  loadMechanics()
}

// Handle search
function handleSearch() {
  currentSearchTerm = searchInput.value.trim()
  currentStatusFilter = statusFilter.value
  currentPage = 1 // Reset to first page
  loadMechanics()
}

// View mechanic details
window.viewMechanic = async (mechanicId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const response = await fetch(`${API_URL}/mechanics/${mechanicId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch mechanic details")
    }

    const mechanic = await response.json()

    // Render mechanic details
    const mechanicDetailsBody = document.getElementById("mechanicDetailsBody")
    mechanicDetailsBody.innerHTML = `
      <div class="row">
        <div class="col-md-4 text-center mb-3">
          ${
            mechanic.profile_picture
              ? `<img src="${mechanic.profile_picture}" alt="${mechanic.full_name}" class="mechanic-profile-img">`
              : '<div class="no-image">No Image</div>'
          }
        </div>
        <div class="col-md-8">
          <div class="row mechanic-detail-row">
            <div class="col-md-4 mechanic-detail-label">ID:</div>
            <div class="col-md-8">${mechanic.id}</div>
          </div>
          <div class="row mechanic-detail-row">
            <div class="col-md-4 mechanic-detail-label">Name:</div>
            <div class="col-md-8">${mechanic.full_name}</div>
          </div>
          <div class="row mechanic-detail-row">
            <div class="col-md-4 mechanic-detail-label">Specialization:</div>
            <div class="col-md-8">${mechanic.specialization || "General"}</div>
          </div>
          <div class="row mechanic-detail-row">
            <div class="col-md-4 mechanic-detail-label">Location:</div>
            <div class="col-md-8">${mechanic.location || "N/A"}</div>
          </div>
          <div class="row mechanic-detail-row">
            <div class="col-md-4 mechanic-detail-label">Status:</div>
            <div class="col-md-8">${mechanic.isVerified ? "Verified" : "Pending Verification"}</div>
          </div>
          <div class="row mechanic-detail-row">
            <div class="col-md-4 mechanic-detail-label">Rating:</div>
            <div class="col-md-8">${renderRatingStars(mechanic.average_rating || 0)} (${mechanic.average_rating || 0})</div>
          </div>
          <div class="row mechanic-detail-row">
            <div class="col-md-4 mechanic-detail-label">Experience:</div>
            <div class="col-md-8">${mechanic.experience || "N/A"} years</div>
          </div>
          <div class="row mechanic-detail-row">
            <div class="col-md-4 mechanic-detail-label">Contact:</div>
            <div class="col-md-8">${mechanic.contact_phone || "N/A"}</div>
          </div>
        </div>
      </div>
      <div class="row mt-3">
        <div class="col-12">
          <h5>About</h5>
          <p>${mechanic.bio || "No information provided."}</p>
        </div>
      </div>
    `

    // Show modal
    $("#viewMechanicModal").modal("show")
  } catch (error) {
    console.error("Error fetching mechanic details:", error)
    alert("Failed to load mechanic details")
  }
}

// Open verify confirmation modal
window.openVerifyModal = (mechanicId) => {
  document.getElementById("verifyMechanicId").value = mechanicId
  $("#verifyMechanicModal").modal("show")
}

// Handle verify mechanic
async function handleVerifyMechanic() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const mechanicId = document.getElementById("verifyMechanicId").value

    const response = await fetch(`${API_URL}/mechanics/${mechanicId}/verify`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isVerified: true }),
    })

    if (!response.ok) {
      throw new Error("Failed to verify mechanic")
    }

    // Close modal
    $("#verifyMechanicModal").modal("hide")

    // Reload mechanics
    loadMechanics()
    alert("Mechanic verified successfully")
  } catch (error) {
    console.error("Error verifying mechanic:", error)
    alert("Failed to verify mechanic")
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

  // Export functions for use in other scripts
window.adminAuth = {
    fetchCurrentToken,
    checkAuth,
    handleLogout,
    redirectToLogin,
    showAlert,
  }

// Add jQuery to the window object
// jQuery is already loaded via CDN in the HTML file
const $ = jQuery

