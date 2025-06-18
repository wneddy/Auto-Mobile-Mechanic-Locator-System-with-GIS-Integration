// Global variables// Global variables
if (typeof API_URL === 'undefined') {
    const API_URL = "http://localhost:5501/api"; // Base URL for API requests (empty for same domain)
}
let currentPage = 1
let totalPages = 1
const usersPerPage = 10
let currentSearchTerm = ""
let currentUserTypeFilter = ""

// DOM elements
const usersTableBody = document.getElementById("usersTableBody")
const pagination = document.getElementById("pagination")
const searchInput = document.getElementById("searchInput")
const userTypeFilter = document.getElementById("userTypeFilter")
const searchBtn = document.getElementById("searchBtn")
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn")

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Admin users page loaded")

  // Initialize authentication
  const token = localStorage.getItem("token")
  if (!token) {
    console.error("No token found in localStorage")
    window.authHandler.redirectToLogin()
    return
  }

  // Check if user has permission to access this page
  const hasPermission = await checkPermission("user_management")
  if (!hasPermission) {
    alert("You don't have permission to access this page")
    window.location.href = "/public/admin-spare-parts.html"
    return
  }

  // Load users
  loadUsers()

  // Set up event listeners
  searchBtn.addEventListener("click", handleSearch)
  confirmDeleteBtn.addEventListener("click", handleDeleteUser)

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

// Load users with pagination, search, and filtering
async function loadUsers() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    // Build query parameters
    let queryParams = `?page=${currentPage}&limit=${usersPerPage}`
    if (currentSearchTerm) {
      queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`
    }
    if (currentUserTypeFilter) {
      queryParams += `&userType=${encodeURIComponent(currentUserTypeFilter)}`
    }

    const response = await fetch(`${API_URL}/users${queryParams}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch users")
    }

    const data = await response.json()
    renderUsersTable(data.users)
    renderPagination(data.totalPages)
    totalPages = data.totalPages
  } catch (error) {
    console.error("Error loading users:", error)
    alert("Failed to load users. Please try again.")
  }
}

// Render users table
function renderUsersTable(users) {
  usersTableBody.innerHTML = ""

  if (users.length === 0) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">No users found</td>
      </tr>
    `
    return
  }

  users.forEach((user) => {
    const statusBadge = user.isActive
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-inactive">Inactive</span>'

    usersTableBody.innerHTML += `
      <tr>
        <td>${user.id}</td>
        <td>${user.email}</td>
        <td>${user.phone}</td>
        <td>${formatUserType(user.user_type)}</td>
        <td>${statusBadge}</td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-info action-btn" onclick="viewUser(${user.id})">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-danger action-btn" onclick="openDeleteModal(${user.id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `
  })
}

// Format user type for display
function formatUserType(userType) {
  switch (userType) {
    case "admin":
      return "Admin"
    case "mechanic":
      return "Mechanic"
    case "vehicle-owner":
      return "Vehicle Owner"
    default:
      return userType
  }
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
  loadUsers()
}

// Handle search
function handleSearch() {
  currentSearchTerm = searchInput.value.trim()
  currentUserTypeFilter = userTypeFilter.value
  currentPage = 1 // Reset to first page
  loadUsers()
}

// View user details
window.viewUser = async (userId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user details")
    }

    const user = await response.json()

    // Render user details
    const userDetailsBody = document.getElementById("userDetailsBody")
    userDetailsBody.innerHTML = `
      <div class="row user-detail-row">
        <div class="col-md-4 user-detail-label">ID:</div>
        <div class="col-md-8">${user.id}</div>
      </div>
      <div class="row user-detail-row">
        <div class="col-md-4 user-detail-label">Email:</div>
        <div class="col-md-8">${user.email}</div>
      </div>
      <div class="row user-detail-row">
        <div class="col-md-4 user-detail-label">Phone:</div>
        <div class="col-md-8">${user.phone}</div>
      </div>
      <div class="row user-detail-row">
        <div class="col-md-4 user-detail-label">User Type:</div>
        <div class="col-md-8">${formatUserType(user.user_type)}</div>
      </div>
      <div class="row user-detail-row">
        <div class="col-md-4 user-detail-label">Status:</div>
        <div class="col-md-8">${user.isActive ? "Active" : "Inactive"}</div>
      </div>
      <div class="row user-detail-row">
        <div class="col-md-4 user-detail-label">Created At:</div>
        <div class="col-md-8">${new Date(user.createdAt).toLocaleString()}</div>
      </div>
      <div class="row user-detail-row">
        <div class="col-md-4 user-detail-label">Last Updated:</div>
        <div class="col-md-8">${new Date(user.updatedAt).toLocaleString()}</div>
      </div>
    `

    // Show modal
    jQuery("#viewUserModal").modal("show")
  } catch (error) {
    console.error("Error fetching user details:", error)
    alert("Failed to load user details")
  }
}

// Open delete confirmation modal
window.openDeleteModal = (userId) => {
  document.getElementById("deleteUserId").value = userId
  jQuery("#deleteConfirmModal").modal("show")
}

// Handle delete user
async function handleDeleteUser() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const userId = document.getElementById("deleteUserId").value

    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to delete user")
    }

    // Close modal
    jQuery("#deleteConfirmModal").modal("hide")

    // Reload users
    loadUsers()
    alert("User deleted successfully")
  } catch (error) {
    console.error("Error deleting user:", error)
    alert("Failed to delete user")
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

// jQuery is already loaded via CDN in the HTML file

