// auth-handler.js - Centralized authentication handling for admin pages
const API_URL = "http://localhost:5501/api" // Set the correct API URL

// Initialize authentication when the page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("Auth handler initialized")
  console.log("Token in localStorage:", localStorage.getItem("token"))
  console.log("User ID in localStorage:", localStorage.getItem("user_id"))

  // Set up logout event listener if the button exists
  const logoutBtn = document.getElementById("logout-btn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout)
  }
})

// Fetch the current token for a user
async function fetchCurrentToken() {
  try {
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      console.error("No user ID found in localStorage")
      return null
    }

    console.log(`Fetching current token for user ID: ${userId}`)
    const response = await fetch(`${API_URL}/auth/users/${userId}/token`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    console.log("Token fetch response status:", response.status)

    if (!response.ok) {
      throw new Error(`Failed to fetch current token: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Fetched token data:", data)

    // Update the token in localStorage
    if (data.currentToken) {
      localStorage.setItem("token", data.currentToken)
      console.log("Token updated in localStorage")
    }

    return data.currentToken
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
      return false
    }

    console.log("Checking authentication with token:", token.substring(0, 20) + "...")

    // Fetch current user info
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
      return false
    }

    console.log("Admin authentication successful")
    return true
  } catch (error) {
    console.error("Auth check error:", error)
    redirectToLogin()
    return false
  }
}



// Handle logout
function handleLogout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user_id")
  window.location.href = "/public/login.html" // Fix the path to include /public
}

// Redirect to login page
function redirectToLogin() {
  localStorage.removeItem("token")
  localStorage.removeItem("user_id")
  window.location.href = "/public/login.html" // Fix the path to include /public
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
      // Fallback alert if modal is not available
      alert(`${message}`)
    }
  } else {
    // Fallback alert if modal is not available
    alert(`${message}`)
  }
}

// Make functions available globally
window.authHandler = {
  fetchCurrentToken,
  checkAuth,
  handleLogout,
  redirectToLogin,
  showAlert,
}

