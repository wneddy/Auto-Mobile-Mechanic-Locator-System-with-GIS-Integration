// Global variables
if (typeof API_URL === 'undefined') {
    const API_URL = "http://localhost:5501/api"; // Base URL for API requests (empty for same domain)
}

// DOM elements
const adminProfileForm = document.getElementById("adminProfileForm")
const profilePicture = document.getElementById("profilePicture")
const imagePreview = document.getElementById("imagePreview")

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Admin profile creator page loaded")

  // Load auth handler script if not already loaded
  await loadAuthHandlerScript()

  // Initialize authentication
  const token = localStorage.getItem("token")
  if (!token) {
    console.error("No token found in localStorage")
    redirectToLogin()
    return
  }

  // Check if profile already exists
  await checkExistingProfile()

  // Set up event listeners
  adminProfileForm.addEventListener("submit", handleProfileSubmit)
  profilePicture.addEventListener("change", previewImage)
})

// Load auth handler script
async function loadAuthHandlerScript() {
  return new Promise((resolve, reject) => {
    if (window.authHandler) {
      resolve()
      return
    }

    const script = document.createElement("script")
    // Fix the path - remove /public prefix
    script.src = "/javascripts/auth-handler.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load auth handler script"))
    document.head.appendChild(script)
  })
}

// Redirect to login page
function redirectToLogin() {
  localStorage.removeItem("token")
  localStorage.removeItem("user_id")
  window.location.href = "/public/login.html"
}

// Check if admin profile already exists
async function checkExistingProfile() {
  try {
    const token = localStorage.getItem("token")
    const userId = localStorage.getItem("user_id")

    console.log("Checking if profile exists for user ID:", userId)

    const response = await fetch(`${API_URL}/admin-profiles/user/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    console.log("Profile check response status:", response.status)

    // If profile exists, redirect to admin dashboard
    if (response.ok) {
      console.log("Profile exists, redirecting to dashboard")
      window.location.href = "/public/admin-spare-parts.html"
      return true
    } else if (response.status === 404) {
      console.log("No profile found, staying on profile creation page")
      return false
    } else {
      console.error("Unexpected response when checking profile:", response.status)
      return false
    }
  } catch (error) {
    console.error("Error checking profile:", error)
    return false
  }
}

// Fix the handleProfileSubmit function to properly handle permissions
async function handleProfileSubmit(e) {
  e.preventDefault()

  try {
    console.log("Form submission started")
    const form = e.target
    const formData = new FormData(form)

    // Add user ID
    const userId = localStorage.getItem("user_id")
    formData.append("user_id", userId)
    console.log("Added user_id to form data:", userId)

    // Get selected permissions and convert to JSON string
    const permissions = []
    document.querySelectorAll('input[name="permissions"]:checked').forEach((checkbox) => {
      permissions.push(checkbox.value)
    })

    // Remove any existing permissions entries from the FormData
    formData.delete("permissions")

    // Add the permissions as a JSON string
    formData.append("permissions", JSON.stringify(permissions))
    console.log("Permissions added (as JSON string):", JSON.stringify(permissions))

    // Log all form data
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`)
    }

    // Get the current token
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    console.log("Sending profile creation request with token")

    const response = await fetch(`${API_URL}/admin-profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    console.log("Profile creation response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to create admin profile: ${errorData.message || response.statusText}`)
    }

    const profileData = await response.json()
    console.log("Profile created successfully:", profileData)

    alert("Profile created successfully! Redirecting to dashboard...")

    // Fix the redirect path - add /public prefix
    setTimeout(() => {
      window.location.href = "/public/admin-dashboard.html"
    }, 2000)
  } catch (error) {
    console.error("Error creating profile:", error)
    alert(`Failed to create profile: ${error.message}`)
  }
}

// Preview profile image
function previewImage(e) {
  imagePreview.innerHTML = ""

  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader()

    reader.onload = (e) => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`
    }

    reader.readAsDataURL(e.target.files[0])
  }
}

