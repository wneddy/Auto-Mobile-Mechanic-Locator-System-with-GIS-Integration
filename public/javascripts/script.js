// Global variables
if (typeof API_URL === 'undefined') {
  const API_URL = "http://localhost:5501/api"; // Base URL for API requests (empty for same domain)
}

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Page loaded");
  
  // Get current page name to load appropriate sections
  const currentPage = window.location.pathname.split('/').pop() || "home.html";
  console.log("Current page:", currentPage);

  // Initialize authentication
  try {
    // Make sure authUtils is available
    if (window.authUtils) {
      // Initialize auth utilities
      window.authUtils.initAuth();
    }

    // Initialize common elements for all pages
    initCommonElements();

    // Initialize page-specific functionality
    if (currentPage === 'home.html') {
      initHomePage();
    } else if (currentPage === 'marketplace.html') {
      initMarketplace();
    } else if (currentPage === 'cart.html') {
      initCart();
    } else if (currentPage === 'checkout.html') {
      initCheckout();
    } else if (currentPage.includes('mechanic-locator') || currentPage === 'find-mechanic.html') {
      initMechanicLocator();
    }

    // Set up common event listeners
    setupCommonEventListeners();
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Initialize common elements across all pages
function initCommonElements() {
  // Set up profile dropdown
  const profileDropdown = document.getElementById('profileDropdown');
  if (profileDropdown) {
    profileDropdown.addEventListener('click', function() {
      const profileOptions = document.getElementById('profileOptions');
      if (profileOptions) {
        profileOptions.classList.toggle('show');
      }
    });
  }

  // Set up notification button - only if it exists on the page
  const notificationButton = document.getElementById('notification-button');
  if (notificationButton) {
    notificationButton.addEventListener('click', function() {
      const dropdown = document.getElementById('pending-requests-dropdown');
      if (dropdown) {
        dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
      }
    });

    // Fetch notifications
    fetchNotifications();
  }

  // Update cart count if element exists
  updateCartCount();
}

// Set up common event listeners
function setupCommonEventListeners() {
  // Logout functionality
  const logoutLinks = document.querySelectorAll('#logout');
  logoutLinks.forEach(link => {
    if (link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        logout();
      });
    }
  });

  // Delete profile functionality
  const deleteProfileLinks = document.querySelectorAll('#delete-profile');
  deleteProfileLinks.forEach(link => {
    if (link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        handleDeleteProfile();
      });
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.matches('.profile-icon') && !event.target.matches('.dropdown-content *')) {
      const dropdowns = document.getElementsByClassName('dropdown-content');
      for (let i = 0; i < dropdowns.length; i++) {
        const openDropdown = dropdowns[i];
        if (openDropdown.classList.contains('show')) {
          openDropdown.classList.remove('show');
        }
      }
    }
  });

  // FAQ accordion functionality (if on a page with FAQs)
  const faqQuestions = document.querySelectorAll('.faq-question');
  if (faqQuestions.length > 0) {
    faqQuestions.forEach(question => {
      question.addEventListener('click', function() {
        this.classList.toggle('active');
        const answer = this.nextElementSibling;
        if (answer.style.display === 'block') {
          answer.style.display = 'none';
        } else {
          answer.style.display = 'block';
        }
      });
    });
  }
}

// Fetch notifications
async function fetchNotifications() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token available. Cannot fetch notifications.');
      return;
    }

    // Try to fetch notifications from the pending-requests endpoint as a fallback
    // since the get-notifications endpoint is returning a 500 error
    const response = await fetch(`${API_URL}/mechanics/pending-requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    // Convert pending requests to notifications format
    let notifications = [];
    if (Array.isArray(data)) {
      notifications = data.map(request => ({
        id: request.id,
        message: `New service request: ${request.description || 'No description provided'}`,
        created_at: request.createdAt || new Date()
      }));
    }

    // Update notification badge and dropdown
    updateNotificationBadge(notifications.length);
    populateNotificationDropdown(notifications);
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Set empty notifications as fallback
    updateNotificationBadge(0);
    populateNotificationDropdown([]);
    return [];
  }
}

// Update notification badge
function updateNotificationBadge(count) {
  const badges = document.querySelectorAll('.notification-badge');
  badges.forEach(badge => {
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  });
}

// Populate notification dropdown
function populateNotificationDropdown(notifications) {
  const notificationList = document.getElementById('notification-list');
  if (!notificationList) return;

  notificationList.innerHTML = '';

  if (!notifications || notifications.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'notification-item';
    emptyItem.textContent = 'No new notifications';
    notificationList.appendChild(emptyItem);
    return;
  }

  notifications.forEach(notification => {
    const item = document.createElement('li');
    item.className = 'notification-item';
    item.textContent = notification.message || 'New notification';
    notificationList.appendChild(item);
  });
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('cart');
  window.location.href = 'login.html';
}

// Handle delete profile
async function handleDeleteProfile() {
  if (confirm("Are you sure you want to delete your profile? This action cannot be undone.")) {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');

      if (!token || !userId) {
        alert('You must be logged in to delete your profile.');
        return;
      }

      const response = await fetch(`${API_URL}/auth/delete-profile/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }

      alert('Your profile has been deleted successfully.');
      logout();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete profile. Please try again later.');
    }
  }
}

// Initialize Home Page
function initHomePage() {
  console.log('Initializing home page...');
}

// Initialize Marketplace Page
function initMarketplace() {
  console.log('Initializing marketplace page...');
  
  // Fetch spare parts from the API
  fetchSpareParts();
  
  // Set up search functionality
  const searchInput = document.getElementById('search');
  const categorySelect = document.getElementById('category');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      searchParts();
    });
  }
  
  if (categorySelect) {
    categorySelect.addEventListener('change', function() {
      searchParts();
    });
  }
}

// Fetch spare parts from the API
async function fetchSpareParts() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token available. Cannot fetch spare parts.');
      // For demo purposes, load sample data
      loadSampleSpareParts();
      return;
    }

    const response = await fetch(`${API_URL}/spare-parts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch spare parts');
    }

    const data = await response.json();
    displaySpareParts(data);
  } catch (error) {
    console.error('Error fetching spare parts:', error);
    // Load sample data as fallback
    loadSampleSpareParts();
  }
}

// Load sample spare parts data for demonstration
function loadSampleSpareParts() {
  const sampleParts = [
    {
      id: 1,
      name: 'Brake Pads',
      description: 'High-quality brake pads for optimal stopping power.',
      price: 2500.00,
      quantity: 20,
      imageUrl: 'https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/8cc6cdb0-32d0-4ad6-106f-32a406d20f00/public',
      category: 'brakes'
    },
    {
      id: 2,
      name: 'Oil Filter',
      description: 'Premium oil filter for clean engine operation.',
      price: 800.00,
      quantity: 50,
      imageUrl: 'https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/d17d5008-1094-4c79-8f14-6e73d2527700/public',
      category: 'engine'
    },
    {
      id: 3,
      name: 'Spark Plugs (Set of 4)',
      description: 'High-performance spark plugs for improved fuel efficiency.',
      price: 1200.00,
      quantity: 30,
      imageUrl: 'https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/b9438390-0e28-480a-1ec3-d5bb10bf0800/public',
      category: 'electrical'
    },
    {
      id: 4,
      name: 'Shock Absorbers (Pair)',
      description: 'Heavy-duty shock absorbers for a smooth ride.',
      price: 5000.00,
      quantity: 10,
      imageUrl: 'https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/a02d849e-bb5d-47c7-7863-a811f186a800/publicContain',
      category: 'suspension'
    },
    {
      id: 5,
      name: 'Side Mirror',
      description: 'Replacement side mirror with adjustable angle.',
      price: 3500.00,
      quantity: 15,
      imageUrl: 'https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/c480e728-b1c4-4311-b662-a896537eec00/public',
      category: 'body'
    },
    {
      id: 6,
      name: 'Air Filter',
      description: 'High-flow air filter for better engine performance.',
      price: 1000.00,
      quantity: 40,
      imageUrl: 'https://imagedelivery.net/xaKlCos5cTg_1RWzIu_h-A/66600c81-50d2-4ead-e35f-66c3be444b00/public',
      category: 'engine'
    }
  ];
  
  displaySpareParts(sampleParts);
}

// Display spare parts in the UI
function displaySpareParts(parts) {
  const container = document.getElementById('parts-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!parts || parts.length === 0) {
    container.innerHTML = '<p class="text-center">No spare parts found.</p>';
    return;
  }
  
  parts.forEach(part => {
    const partCard = document.createElement('div');
    partCard.className = 'col-md-4';
    partCard.innerHTML = `
      <div class="card">
        <img src="${part.imageUrl || 'default-part.jpg'}" class="card-img-top" alt="${part.name}">
        <div class="card-body" data-category="${part.category || ''}">
          <h5 class="card-title">${part.name}</h5>
          <p class="card-text">${part.description}</p>
          <p class="card-text"><strong>Price: Ksh ${part.price.toFixed(2)}</strong></p>
          <p class="card-text">Available: ${part.quantity} in stock</p>
          <button class="btn btn-primary add-to-cart" data-id="${part.id}" data-name="${part.name}" data-price="${part.price}" data-image="${part.imageUrl || 'default-part.jpg'}">Add to Cart</button>
        </div>
      </div>
    `;
    container.appendChild(partCard);
  });
  
  // Add event listeners to "Add to Cart" buttons
  const addToCartButtons = document.querySelectorAll('.add-to-cart');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const name = this.getAttribute('data-name');
      const price = parseFloat(this.getAttribute('data-price'));
      const image = this.getAttribute('data-image');
      
      addToCart({ id, name, price, image, quantity: 1 });
      
      // Show confirmation
      alert(`${name} added to cart!`);
    });
  });
}

// Search parts based on search input and category
function searchParts() {
  const searchInput = document.getElementById('search');
  const categorySelect = document.getElementById('category');
  
  if (!searchInput || !categorySelect) return;
  
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = categorySelect.value.toLowerCase();
  
  // Get all part cards
  const partCards = document.querySelectorAll('.col-md-4');
  
  partCards.forEach(card => {
    const cardBody = card.querySelector('.card-body');
    const title = card.querySelector('.card-title').textContent.toLowerCase();
    const description = card.querySelector('.card-text').textContent.toLowerCase();
    const category = cardBody.getAttribute('data-category') || '';
    
    const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
    const matchesCategory = selectedCategory === '' || category === selectedCategory;
    
    if (matchesSearch && matchesCategory) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// Cart functionality
function addToCart(item) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  // Check if item already exists in cart
  const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
  
  if (existingItemIndex !== -1) {
    // Increment quantity if item already exists
    cart[existingItemIndex].quantity += 1;
  } else {
    // Add new item to cart
    cart.push(item);
  }
  
  // Save updated cart to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Update cart count in UI if element exists
  updateCartCount();
}

// Update cart count in UI
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  
  const cartCountElement = document.getElementById('cart-count');
  if (cartCountElement) {
    cartCountElement.textContent = cartCount;
    cartCountElement.style.display = cartCount > 0 ? 'inline-block' : 'none';
  }
}

// Initialize Cart Page
function initCart() {
  console.log('Initializing cart page...');
  
  // Display cart items
  displayCartItems();
  
  // Update total amount
  updateCartTotal();
}

// Display cart items in the cart page
function displayCartItems() {
  const cartItemsContainer = document.getElementById('cart-items');
  if (!cartItemsContainer) return;
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  cartItemsContainer.innerHTML = '';
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-center">Your cart is empty.</p>';
    return;
  }
  
  cart.forEach((item, index) => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <span class="item-name">${item.name}</span>
      <span class="item-quantity">Quantity: ${item.quantity}</span>
      <span class="item-price">Ksh ${(item.price * item.quantity).toFixed(2)}</span>
      <button class="btn btn-remove" onclick="removeItem(${index})">Remove</button>
    `;
    cartItemsContainer.appendChild(cartItem);
  });
}

// Remove item from cart - global function to be called from HTML
window.removeItem = function(index) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update UI
    displayCartItems();
    updateCartTotal();
    updateCartCount();
  }
};

// Update cart total amount
function updateCartTotal() {
  const totalAmountElement = document.getElementById('total-amount');
  if (!totalAmountElement) return;
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  totalAmountElement.textContent = total.toFixed(2);
}

// Initialize Checkout Page
function initCheckout() {
  console.log('Initializing checkout page...');
  
  // Display order summary
  displayOrderSummary();
  
  // Set up payment method selection
  const paymentMethodSelect = document.getElementById('payment-method');
  if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener('change', function() {
      const selectedMethod = this.value;
      
      // Hide all payment details sections
      const paymentDetails = document.querySelectorAll('.payment-details');
      paymentDetails.forEach(section => {
        section.style.display = 'none';
      });
      
      // Show selected payment method details
      const selectedSection = document.getElementById(`${selectedMethod}-info`);
      if (selectedSection) {
        selectedSection.style.display = 'block';
      }
    });
  }
  
  // Set up checkout form submission
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const paymentMethod = document.getElementById('payment-method').value;
      
      if (paymentMethod === 'mpesa') {
        processMpesaPayment();
      } else {
        // Handle other payment methods
        alert('Payment processing is currently only available for M-Pesa.');
      }
    });
  }
}

// Display order summary in checkout page
function displayOrderSummary() {
  const cartItemsContainer = document.getElementById('cart-items');
  const totalAmountElement = document.getElementById('total-amount');
  
  if (!cartItemsContainer || !totalAmountElement) return;
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  cartItemsContainer.innerHTML = '';
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-center">Your cart is empty.</p>';
    totalAmountElement.textContent = '0.00';
    return;
  }
  
  cart.forEach(item => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <span class="item-name">${item.name}</span>
      <span class="item-quantity">Quantity: ${item.quantity}</span>
      <span class="item-price">Ksh ${(item.price * item.quantity).toFixed(2)}</span>
    `;
    cartItemsContainer.appendChild(cartItem);
  });
  
  // Update total amount
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  totalAmountElement.textContent = total.toFixed(2);
}

// Process M-Pesa payment
async function processMpesaPayment() {
  const mpesaNumber = document.getElementById('mpesa-number').value;
  
  if (!mpesaNumber) {
    alert('Please enter your M-Pesa phone number.');
    return;
  }
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  try {
    // Show loading state
    const submitButton = document.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    // Format phone number (remove leading 0 and add country code if needed)
    let formattedPhone = mpesaNumber;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    
    // Make API call to initiate M-Pesa payment
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/payments/mpesa/stkpush`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        amount: total,
        accountReference: 'Auto-Mobile Parts',
        transactionDesc: 'Purchase of spare parts'
      })
    });
    
    // Reset button state
    submitButton.textContent = originalText;
    submitButton.disabled = false;
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to initiate M-Pesa payment');
    }
    
    const result = await response.json();
    
    // Show success message
    alert('M-Pesa payment request sent. Please check your phone to complete the transaction.');
    
    // Poll for payment status
    checkPaymentStatus(result.checkoutRequestID);
  } catch (error) {
    console.error('Error processing M-Pesa payment:', error);
    alert(`Payment failed: ${error.message || 'Unknown error'}`);
  }
}

// Check M-Pesa payment status
async function checkPaymentStatus(checkoutRequestID) {
  try {
    // Poll for payment status every 5 seconds
    const pollInterval = setInterval(async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/payments/mpesa/status/${checkoutRequestID}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        clearInterval(pollInterval);
        console.error('Failed to check payment status');
        return;
      }
      
      const result = await response.json();
      
      if (result.status === 'COMPLETED') {
        clearInterval(pollInterval);
        alert('Payment successful! Thank you for your purchase.');
        
        // Clear cart
        localStorage.removeItem('cart');
        
        // Redirect to home page
        window.location.href = 'home.html';
      } else if (result.status === 'FAILED') {
        clearInterval(pollInterval);
        alert('Payment failed. Please try again.');
      }
      // Continue polling for 'PENDING' status
      
    }, 5000); // Check every 5 seconds
    
    // Stop polling after 2 minutes (24 attempts)
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 120000);
  } catch (error) {
    console.error('Error checking payment status:', error);
  }
}

// Initialize Mechanic Locator Page
function initMechanicLocator() {
  console.log('Initializing mechanic locator page...');
  
  // Set up event listeners
  setupMechanicLocatorEventListeners();

  // Initialize map and load mechanics
  initializeMap();
}

// Set up event listeners for mechanic locator
function setupMechanicLocatorEventListeners() {
  // Close popup buttons
  const closePopupBtn = document.querySelector(".close-popup");
  if (closePopupBtn) {
    closePopupBtn.addEventListener("click", closePopup);
  }

  const cancelPopupBtn = document.getElementById("close-popup");
  if (cancelPopupBtn) {
    cancelPopupBtn.addEventListener("click", closePopup);
  }

  // Request service button
  const requestServiceBtn = document.getElementById("request-service");
  if (requestServiceBtn) {
    requestServiceBtn.addEventListener("click", handleRequestService);
  }
}

// Function to close the popup
function closePopup() {
  console.log("Closing popup");
  const popup = document.getElementById("mechanic-popup");
  if (popup) {
    popup.style.display = "none";
  }
}

// Handle request service
async function handleRequestService() {
  const problemDescription = document.getElementById("popup-problem-description").value;
  const mechanicId = document.getElementById("mechanic-name").dataset.mechanicId;

  if (!problemDescription) {
    alert("Please describe your issue.");
    return;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to request service.');
      return;
    }

    // Show loading state
    const requestBtn = document.getElementById("request-service");
    const originalText = requestBtn.textContent;
    requestBtn.textContent = "Sending...";
    requestBtn.disabled = true;

    const response = await fetch(`${API_URL}/mechanics/user-service-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mechanicId: mechanicId,
        problemDescription: problemDescription,
      }),
    });

    // Reset button state
    requestBtn.textContent = originalText;
    requestBtn.disabled = false;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to send service request");
    }

    const result = await response.json();
    
    // Close the popup
    closePopup();
    
    // Show success message
    alert(result.message || "Service request sent successfully!");
    
    // Clear the problem description field
    document.getElementById("popup-problem-description").value = "";
  } catch (error) {
    console.error("Error sending service request:", error);
    alert("Failed to send service request. Please try again later.");
  }
}

// Initialize map and load mechanics
function initializeMap() {
  // Check if we're on the mechanic locator page
  if (!document.getElementById('map')) return;
  
  // Loading indicator
  const loadingIndicator = document.getElementById("loading-indicator");
  if (loadingIndicator) {
    // Show loading indicator
    loadingIndicator.style.display = "block";
  }

  // Initialize the map
  const map = L.map("map").setView([0, 0], 13); // Default view, will be updated with user's location

  // OpenStreetMap tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  // Marker cluster group
  const markers = L.markerClusterGroup().addTo(map);

  // Get user's location and fetch nearby mechanics
  fetchNearbyMechanics(map, markers, loadingIndicator);
}

// Function to fetch nearby mechanics
async function fetchNearbyMechanics(map, markers, loadingIndicator) {
  try {
    const token = localStorage.getItem("token"); // Use the token directly from localStorage
    if (!token) {
      console.error("No token available for fetching mechanics");
      hideLoading(loadingIndicator);
      return;
    }

    navigator.geolocation.watchPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        // Store user position globally
        window.userCurrentLat = userLat;
        window.userCurrentLng = userLng;

        // Ensure userLat and userLng are valid
        if (userLat === null || userLng === null) {
          console.error("User location is not valid");
          hideLoading(loadingIndicator);
          return;
        }

        map.setView([userLat, userLng], 13);
        const ownerMarker = L.marker([userLat, userLng]).addTo(map).bindPopup("You are here");

        // Fetch nearby mechanics
        fetch(`${API_URL}/mechanics/fetch?lat=${userLat}&lng=${userLng}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              // If token is expired, try to refresh it
              if (response.status === 401) {
                return window.authUtils && window.authUtils.fetchCurrentToken().then(newToken => {
                  if (newToken) {
                    // Retry with new token
                    return fetch(`${API_URL}/mechanics/fetch?lat=${userLat}&lng=${userLng}`, {
                      headers: {
                        Authorization: `Bearer ${newToken}`,
                      },
                    });
                  } else {
                    throw new Error("Failed to refresh token");
                  }
                });
              } else {
                throw new Error("Failed to fetch mechanics");
              }
            }
            return response.json();
          })
          .then((data) => {
            markers.clearLayers();
            markers.addLayer(ownerMarker); // Add user marker to the cluster

            data.forEach((mechanic) => {
              // Ensure mechanic's coordinates are valid
              if (mechanic.latitude && mechanic.longitude) {
                const marker = L.marker([mechanic.latitude, mechanic.longitude])
                  .bindPopup(
                    `<b>${mechanic.full_name}</b><br>${mechanic.specialization || 'General'}<br><button class="select-mechanic-btn" onclick="window.selectMechanic(${JSON.stringify(mechanic).replace(/"/g, "&quot;")})">Select</button><br><small>Contact: ${mechanic.contact_phone || "N/A"}</small>`,
                  );
                markers.addLayer(marker);
              } else {
                console.warn(`Invalid coordinates for mechanic: ${mechanic.full_name}`);
              }
            });
          })
          .catch((error) => {
            console.error("Error fetching mechanics:", error);
            alert("Failed to fetch nearby mechanics. Please try again later.");
          })
          .finally(() => {
            hideLoading(loadingIndicator);
          });
      },
      (error) => {
        console.error("Error obtaining location:", error);
        alert("Please enable location services to use this feature.");
        hideLoading(loadingIndicator);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );
  } catch (error) {
    console.error("Error in fetchNearbyMechanics:", error);
    hideLoading(loadingIndicator);
  }
}

// Function to hide loading indicator
function hideLoading(loadingIndicator) {
  if (loadingIndicator) {
    loadingIndicator.style.display = "none";
  }
}

// Function to calculate distance using the Haversine formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Function to select a mechanic and show the pop-up
window.selectMechanic = function(mechanic) {
  console.log("Mechanic selected:", mechanic);
  
  // Get user's current location
  const userLat = window.userCurrentLat || 0;
  const userLng = window.userCurrentLng || 0;

  // Set mechanic ID in a data attribute for later use
  const nameElement = document.getElementById("mechanic-name");
  if (nameElement) {
    nameElement.dataset.mechanicId = mechanic.id;
    nameElement.innerText = mechanic.full_name || "Unknown Mechanic";
  }

  // Set other mechanic details
  const specializationElement = document.getElementById("mechanic-specialization");
  if (specializationElement) {
    specializationElement.innerText = mechanic.specialization || "General";
  }

  const availabilityElement = document.getElementById("mechanic-availability");
  if (availabilityElement) {
    availabilityElement.innerText = mechanic.availability || "Available";
  }

  const priceElement = document.getElementById("mechanic-price");
  if (priceElement) {
    priceElement.innerText = mechanic.estimated_charges || "Varies";
  }

  // Calculate distance from user's location to mechanic's location
  const distance = haversineDistance(userLat, userLng, mechanic.latitude, mechanic.longitude);
  const distanceElement = document.getElementById("mechanic-distance");
  if (distanceElement) {
    distanceElement.innerText = `${distance.toFixed(2)} km`;
  }

  // Clear any previous problem description
  const problemDescriptionElement = document.getElementById("popup-problem-description");
  if (problemDescriptionElement) {
    problemDescriptionElement.value = "";
  }

  // Show the pop-up
  const popupElement = document.getElementById("mechanic-popup");
  if (popupElement) {
    popupElement.style.display = "block";
  }
};

// Global variables to store current user position
window.userCurrentLat = null;
window.userCurrentLng = null;

// Make sure L is defined
if (typeof L === 'undefined' && typeof window.L !== 'undefined') {
  const L = window.L;
}