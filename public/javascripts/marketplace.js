// Global variables
const API_URL = "http://localhost:5501/api"; // Set the correct API URL
let currentPage = 1;
let totalPages = 1;
const partsPerPage = 9; // Show 9 parts per page (3x3 grid)
let currentSearchTerm = "";
let currentCategoryFilter = "";

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Marketplace page loaded");
  console.log("Token in localStorage:", localStorage.getItem("token"));
  console.log("User ID in localStorage:", localStorage.getItem("user_id"));

  try {
    // Check if we have a token
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");
    
    if (!token || !userId) {
      // Show a message but don't redirect immediately
      showAlert("Please log in to access all marketplace features", "warning");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return;
    }
    
    // Validate token directly
    const isValid = await validateToken();
    if (!isValid) {
      showAlert("Your session has expired. Please log in again.", "warning");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return;
    }
    
    // Load spare parts
    loadSpareParts();
    
    // Set up event listeners
    setupEventListeners();
    
    // Fetch notifications
    fetchNotifications();
  } catch (error) {
    console.error("Error initializing marketplace:", error);
    showAlert("Error loading marketplace. Please try again later.", "danger");
    
    // Still try to load parts for browsing
    renderMockSpareParts();
    setupEventListeners();
  }
});

// Validate token
async function validateToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      console.log("Token is expired, trying to refresh...");
      const newToken = await fetchCurrentToken();
      if (!newToken) return false;
      
      localStorage.setItem("token", newToken);
    }
    
    return true;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
}

// Check if token is expired
function isTokenExpired(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    return Date.now() >= payload.exp * 1000;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
}

// Fetch the user's current token from the server
async function fetchCurrentToken() {
  try {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      throw new Error("User ID not found in localStorage");
    }

    console.log(`Fetching current token for user ID: ${userId}`);
    const response = await fetch(`${API_URL}/auth/users/${userId}/token`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Use the token from local storage for this request
      },
    });

    console.log("Token fetch response status:", response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch current token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Fetched token data:", data);
    return data.currentToken; // Assuming the response contains the currentToken
  } catch (error) {
    console.error("Error fetching current token:", error);
    showAlert("Failed to retrieve token. Please log in again.", "danger");
    setTimeout(() => {
      redirectToLogin();
    }, 2000);
    return null;
  }
}

// Check if user is authenticated and is a vehicle owner
async function checkAuth() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
      redirectToLogin();
      return false;
    }

    console.log("Checking authentication with token:", token.substring(0, 20) + "...");

    // Fetch current user info
    const response = await fetch(`${API_URL}/users/current`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Auth check response status:", response.status);

    if (!response.ok) {
      throw new Error(`Authentication failed with status: ${response.status}`);
    }

    const userData = await response.json();
    console.log("User data received:", userData);

    // Check if user is a vehicle owner
    if (userData.user_type !== "vehicle-owner") {
      console.error("User is not a vehicle owner:", userData.user_type);
      showAlert("Access denied. Vehicle owner privileges required.", "danger");
      redirectToLogin();
      return false;
    }

    console.log("Vehicle owner authentication successful");
    return true;
  } catch (error) {
    console.error("Auth check error:", error);
    redirectToLogin();
    return false;
  }
}

// Set up event listeners
function setupEventListeners() {
  // Search button
  const searchBtn = document.querySelector(".search-section button");
  if (searchBtn) {
    searchBtn.addEventListener("click", searchParts);
  }

  // Category filter
  const categoryFilter = document.getElementById("category");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", searchParts);
  }

  // Search input - search on Enter key
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        searchParts();
      }
    });
  }

  // Notification button
  const notificationBtn = document.getElementById("notification-button");
  if (notificationBtn) {
    notificationBtn.addEventListener("click", toggleNotifications);
  }

  // Logout button
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Delete profile button
  const deleteProfileBtn = document.getElementById("delete-profile");
  if (deleteProfileBtn) {
    deleteProfileBtn.addEventListener("click", handleDeleteProfile);
  }
}

// Toggle notifications dropdown
function toggleNotifications() {
  const dropdown = document.getElementById("pending-requests-dropdown");
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

// Handle logout
function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  window.location.href = "/login.html";
}

// Handle delete profile
async function handleDeleteProfile() {
  if (confirm("Are you sure you want to delete your profile? This action cannot be undone.")) {
    try {
      const token = await fetchCurrentToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/vehicle-owners/profile`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete profile");
      }

      showAlert("Profile deleted successfully. Redirecting to login page...", "success");
      setTimeout(() => {
        handleLogout();
      }, 2000);
    } catch (error) {
      console.error("Error deleting profile:", error);
      showAlert("Failed to delete profile. Please try again.", "danger");
    }
  }
}

// Redirect to login page
function redirectToLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
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

// Load spare parts with pagination, search, and filtering
async function loadSpareParts() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Show loading state
    const partsContainer = document.getElementById("parts-container");
    partsContainer.innerHTML =
      '<div class="col-12 text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>';

    // Build query parameters
    let queryParams = `?page=${currentPage}&limit=${partsPerPage}`;
    if (currentSearchTerm) {
      queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`;
    }
    if (currentCategoryFilter) {
      queryParams += `&category=${encodeURIComponent(currentCategoryFilter)}`;
    }

    // Check if the endpoint exists
    console.log(`Fetching spare parts from: ${API_URL}/marketplace/spare-parts${queryParams}`);
    
    // Try the marketplace endpoint first
    try {
      const response = await fetch(`${API_URL}/marketplace/spare-parts${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        renderSpareParts(data.parts);
        renderPagination(data.totalPages);
        totalPages = data.totalPages;
        return;
      }
      
      if (response.status === 404) {
        console.log("Marketplace endpoint not found, trying fallback...");
        throw new Error("Endpoint not found");
      }
    } catch (error) {
      console.log("Trying fallback endpoint...");
    }
    
    // Fallback to spare-parts endpoint without marketplace prefix
    try {
      const fallbackResponse = await fetch(`${API_URL}/spare-parts${queryParams}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        renderSpareParts(fallbackData.parts);
        renderPagination(fallbackData.totalPages);
        totalPages = fallbackData.totalPages;
        return;
      }
    } catch (error) {
      console.log("Fallback endpoint failed, using mock data");
    }
    
    // Last resort: use mock data
    console.log("Using mock data as last resort");
    renderMockSpareParts();
  } catch (error) {
    console.error("Error loading spare parts:", error);
    showAlert("Failed to load spare parts. Using sample data instead.", "warning");
    
    // Use mock data as fallback
    renderMockSpareParts();
  }
}

// Render mock spare parts for testing when API is unavailable
function renderMockSpareParts() {
  console.log("Rendering mock spare parts data");
  
  const mockParts = [
    {
      id: 1,
      name: "Brake Pads",
      description: "High-quality brake pads for all vehicle types",
      price: 45.99,
      quantity: 20,
      category: "brakes",
      imageUrl: "https://via.placeholder.com/300x200?text=Brake+Pads"
    },
    {
      id: 2,
      name: "Oil Filter",
      description: "Premium oil filter for optimal engine performance",
      price: 12.99,
      quantity: 35,
      category: "engine",
      imageUrl: "https://via.placeholder.com/300x200?text=Oil+Filter"
    },
    {
      id: 3,
      name: "Spark Plugs (Set of 4)",
      description: "High-performance spark plugs for improved fuel efficiency",
      price: 24.99,
      quantity: 15,
      category: "engine",
      imageUrl: "https://via.placeholder.com/300x200?text=Spark+Plugs"
    },
    {
      id: 4,
      name: "Headlight Assembly",
      description: "Replacement headlight assembly with improved visibility",
      price: 89.99,
      quantity: 8,
      category: "electrical",
      imageUrl: "https://via.placeholder.com/300x200?text=Headlight"
    },
    {
      id: 5,
      name: "Shock Absorber",
      description: "Heavy-duty shock absorber for a smoother ride",
      price: 65.50,
      quantity: 12,
      category: "suspension",
      imageUrl: "https://via.placeholder.com/300x200?text=Shock+Absorber"
    },
    {
      id: 6,
      name: "Side Mirror",
      description: "Replacement side mirror with turn signal indicator",
      price: 49.99,
      quantity: 6,
      category: "body",
      imageUrl: "https://via.placeholder.com/300x200?text=Side+Mirror"
    }
  ];
  
  renderSpareParts(mockParts);
  renderPagination(1);
  totalPages = 1;
}

// Render spare parts
function renderSpareParts(parts) {
  const partsContainer = document.getElementById("parts-container");
  partsContainer.innerHTML = "";

  if (!parts || parts.length === 0) {
    partsContainer.innerHTML =
      '<div class="col-12 text-center"><p>No spare parts found. Try a different search or category.</p></div>';
    return;
  }

  parts.forEach((part) => {
    const partCard = document.createElement("div");
    partCard.className = "col-md-4 mb-4";

    // Format price to 2 decimal places
    const formattedPrice = Number.parseFloat(part.price).toFixed(2);

    // Get stock status
    const stockStatus = getStockStatusBadge(part.quantity);

    partCard.innerHTML = `
            <div class="card h-100">
                ${
                  part.imageUrl
                    ? `<img src="${part.imageUrl}" class="card-img-top" alt="${part.name}" style="height: 200px; object-fit: cover;">`
                    : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                        <span class="text-muted">No Image Available</span>
                       </div>`
                }
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${part.name}</h5>
                    <p class="card-text">${part.description || "No description available."}</p>
                    <div class="mt-auto">
                        <p class="card-text"><strong>Price: ksh${formattedPrice}</strong></p>
                        <p class="card-text">
                            <span class="badge ${stockStatus.class}">${stockStatus.text}</span>
                            <small class="text-muted ml-2">${part.quantity} in stock</small>
                        </p>
                        <p class="card-text"><small class="text-muted">Category: ${part.category || "Uncategorized"}</small></p>
                        <button class="btn btn-primary btn-block add-to-cart-btn" data-part-id="${part.id}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;

    partsContainer.appendChild(partCard);
  });

  // Add event listeners to "Add to Cart" buttons
  document.querySelectorAll(".add-to-cart-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const partId = this.getAttribute("data-part-id");
      addToCart(partId);
    });
  });
}

// Get stock status badge
function getStockStatusBadge(quantity) {
  if (quantity <= 0) {
    return { class: "badge-danger", text: "Out of Stock" };
  } else if (quantity < 5) {
    return { class: "badge-warning", text: "Low Stock" };
  } else {
    return { class: "badge-success", text: "In Stock" };
  }
}

// Add to cart functionality
function addToCart(partId) {
  // Get existing cart from localStorage or initialize empty array
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Check if item is already in cart
  const existingItem = cart.find((item) => item.id === partId);

  if (existingItem) {
    // Increment quantity if already in cart
    existingItem.quantity += 1;
    showAlert("Item quantity updated in cart!", "success");
  } else {
    // Add new item to cart
    cart.push({
      id: partId,
      quantity: 1,
    });
    showAlert("Item added to cart!", "success");
  }

  // Save updated cart to localStorage
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Render pagination
function renderPagination(totalPages) {
  // If there's no pagination element or only one page, don't render pagination
  if (!document.getElementById("pagination") || totalPages <= 1) return;

  const paginationElement = document.createElement("nav");
  paginationElement.setAttribute("aria-label", "Page navigation");

  const paginationList = document.createElement("ul");
  paginationList.className = "pagination justify-content-center";

  // Previous button
  const prevItem = document.createElement("li");
  prevItem.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;

  const prevLink = document.createElement("a");
  prevLink.className = "page-link";
  prevLink.href = "#";
  prevLink.textContent = "Previous";
  prevLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      loadSpareParts();
    }
  });

  prevItem.appendChild(prevLink);
  paginationList.appendChild(prevItem);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageItem = document.createElement("li");
    pageItem.className = `page-item ${currentPage === i ? "active" : ""}`;

    const pageLink = document.createElement("a");
    pageLink.className = "page-link";
    pageLink.href = "#";
    pageLink.textContent = i;
    pageLink.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      loadSpareParts();
    });

    pageItem.appendChild(pageLink);
    paginationList.appendChild(pageItem);
  }

  // Next button
  const nextItem = document.createElement("li");
  nextItem.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;

  const nextLink = document.createElement("a");
  nextLink.className = "page-link";
  nextLink.href = "#";
  nextLink.textContent = "Next";
  nextLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      loadSpareParts();
    }
  });

  nextItem.appendChild(nextLink);
  paginationList.appendChild(nextItem);

  paginationElement.appendChild(paginationList);

  // Add pagination to the container
  const container = document.querySelector(".parts-list .container-mp");

  // Remove existing pagination if any
  const existingPagination = container.querySelector("nav");
  if (existingPagination) {
    container.removeChild(existingPagination);
  }

  container.appendChild(paginationElement);
}

// Search parts
function searchParts() {
  const searchInput = document.getElementById("search");
  const categoryFilter = document.getElementById("category");

  currentSearchTerm = searchInput.value.trim();
  currentCategoryFilter = categoryFilter.value;
  currentPage = 1; // Reset to first page when searching

  loadSpareParts();
}

// Fetch notifications
async function fetchNotifications() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Try different notification endpoints
    const endpoints = [
      `${API_URL}/notifications`,
      `${API_URL}/vehicle-owners/notifications`,
      `${API_URL}/mechanics/get-notifications`
    ];
    
    let success = false;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying notifications endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const notifications = await response.json();
          updateNotifications(notifications);
          success = true;
          break;
        }
      } catch (error) {
        console.log(`Endpoint ${endpoint} failed, trying next...`);
      }
    }
    
    if (!success) {
      // If all endpoints fail, use empty notifications
      console.log("All notification endpoints failed, using empty notifications");
      updateNotifications([]);
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    // Use empty notifications
    updateNotifications([]);
  }
}

// Update notifications in the UI
function updateNotifications(notifications) {
  // Update notification count
  const notificationCount = document.getElementById("notification-count");
  if (notificationCount) {
    notificationCount.textContent = notifications.length || 0;
  }

  // Update notification list
  const notificationList = document.getElementById("notification-list");
  if (notificationList) {
    notificationList.innerHTML = "";

    if (!notifications || notifications.length === 0) {
      notificationList.innerHTML = '<li class="notification-item">No new notifications</li>';
    } else {
      notifications.forEach((notification) => {
        const listItem = document.createElement("li");
        listItem.className = "notification-item";
        listItem.textContent = notification.message || "New notification";
        notificationList.appendChild(listItem);
      });
    }
  }
}



// Export functions for use in other scripts
window.marketplaceAuth = {
  fetchCurrentToken,
  checkAuth,
  handleLogout,
  redirectToLogin,
  showAlert,
};

// Make searchParts function available globally
window.searchParts = searchParts;