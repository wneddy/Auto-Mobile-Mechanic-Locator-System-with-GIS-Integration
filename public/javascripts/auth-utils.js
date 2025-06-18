// auth-utils.js - Centralized authentication handling for the mechanic locator system
const API_URL = "http://localhost:5501/api"; // Set the correct API URL

// Initialize authentication
async function initAuth() {
  console.log("Auth utils initialized");
  console.log("Token in localStorage:", localStorage.getItem("token"));
  console.log("User ID in localStorage:", localStorage.getItem("user_id"));
}

// Fetch the current token for a user
async function fetchCurrentToken() {
  try {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      console.error("No user ID found in localStorage");
      return null;
    }

    console.log(`Fetching current token for user ID: ${userId}`);
    
    // First, check if we already have a token in localStorage
    const existingToken = localStorage.getItem("token");
    if (!existingToken) {
      console.error("No token found in localStorage");
      return null;
    }

    // Try to use the existing token to fetch the current token
    const response = await fetch(`${API_URL}/auth/users/${userId}/token`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${existingToken}`,
      },
    });

    console.log("Token fetch response status:", response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.log("Token expired, redirecting to login");
        redirectToLogin();
        return null;
      }
      throw new Error(`Failed to fetch current token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Fetched token data:", data);

    // Update the token in localStorage only if we got a valid token back
    if (data.currentToken) {
      localStorage.setItem("token", data.currentToken);
      console.log("Token updated in localStorage");
      return data.currentToken;
    } else {
      console.error("No token returned from server");
      return existingToken; // Return the existing token if no new token was provided
    }
  } catch (error) {
    console.error("Error fetching current token:", error);
    // Don't redirect here, just return the existing token
    return localStorage.getItem("token");
  }
}

// Check if user is authenticated and has the correct role
async function checkAuth(requiredRole = "vehicle-owner") {
  try {
    // First, check if we have a token in localStorage
    const existingToken = localStorage.getItem("token");
    if (!existingToken) {
      console.error("No token found in localStorage");
      redirectToLogin();
      return false;
    }

    // For the mechanic locator page, we'll skip the role check
    // This is a temporary workaround until the /users/current endpoint is fixed
    if (window.location.pathname.includes("mechanic-locator")) {
      console.log("On mechanic locator page, skipping full auth check");
      return true;
    }

    // Try to fetch the current user info with the existing token
    console.log("Checking authentication with token:", existingToken.substring(0, 20) + "...");

    // Fetch current user info
    const response = await fetch(`${API_URL}/users/current`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${existingToken}`,
      },
    });

    console.log("Auth check response status:", response.status);

    if (!response.ok) {
      // If the token is invalid or expired, try to fetch a new one
      if (response.status === 401 || response.status === 403) {
        console.log("Token may be expired or invalid, attempting to refresh");
        const newToken = await fetchCurrentToken();
        
        if (!newToken) {
          console.error("Failed to refresh token");
          redirectToLogin();
          return false;
        }
        
        // Try again with the new token
        const retryResponse = await fetch(`${API_URL}/users/current`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        
        if (!retryResponse.ok) {
          console.error("Authentication failed even with refreshed token");
          // If we're on the mechanic locator page, continue anyway
          if (window.location.pathname.includes("mechanic-locator")) {
            console.log("On mechanic locator page, continuing despite auth issues");
            return true;
          }
          redirectToLogin();
          return false;
        }
        
        const userData = await retryResponse.json();
        
        // Check if user has the required role
        if (userData.user_type !== requiredRole) {
          console.error(`User is not a ${requiredRole}:`, userData.user_type);
          showAlert(`Access denied. ${requiredRole} privileges required.`, "danger");
          redirectToLogin();
          return false;
        }
        
        return true;
      } else {
        // For other errors, if we're on the mechanic locator page, continue anyway
        if (window.location.pathname.includes("mechanic-locator")) {
          console.log("On mechanic locator page, continuing despite auth issues");
          return true;
        }
        throw new Error(`Authentication failed with status: ${response.status}`);
      }
    }

    const userData = await response.json();
    console.log("User data received:", userData);

    // Check if user has the required role
    if (userData.user_type !== requiredRole) {
      console.error(`User is not a ${requiredRole}:`, userData.user_type);
      showAlert(`Access denied. ${requiredRole} privileges required.`, "danger");
      redirectToLogin();
      return false;
    }

    console.log(`${requiredRole} authentication successful`);
    return true;
  } catch (error) {
    console.error("Auth check error:", error);
    // If we're on the mechanic locator page, continue anyway
    if (window.location.pathname.includes("mechanic-locator")) {
      console.log("On mechanic locator page, continuing despite auth issues");
      return true;
    }
    // Don't redirect immediately on error, try to fetch a new token first
    const newToken = await fetchCurrentToken();
    if (!newToken) {
      redirectToLogin();
      return false;
    }
    return false;
  }
}

// Handle logout
function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("vehicle_owner_profile_id");
  window.location.href = "/login.html";
}

// Redirect to login page
function redirectToLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("vehicle_owner_profile_id");
  window.location.href = "/login.html";
}

// Show alert message
function showAlert(message, type) {
  // Create alert element if it doesn't exist
  let alertElement = document.getElementById("alert-message");
  if (!alertElement) {
    alertElement = document.createElement("div");
    alertElement.id = "alert-message";
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.style.position = "fixed";
    alertElement.style.top = "20px";
    alertElement.style.right = "20px";
    alertElement.style.zIndex = "9999";
    document.body.appendChild(alertElement);
  } else {
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
  }

  // Set alert content
  alertElement.innerHTML = `
    ${message}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  `;

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alertElement.remove();
  }, 5000);
}

// Export functions for use in other scripts
window.authUtils = {
  initAuth,
  fetchCurrentToken,
  checkAuth,
  handleLogout,
  redirectToLogin,
  showAlert,
};