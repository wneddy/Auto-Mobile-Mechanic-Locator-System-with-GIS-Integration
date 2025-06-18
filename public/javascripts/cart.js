// Global variables
const API_URL = "http://localhost:5501/api";

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Cart page loaded");
    
    // Check authentication
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");
    
    if (!token || !userId) {
        showAlert("Please log in to view your cart", "warning");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }
    
    // Load cart items
    loadCartItems();
    
    // Set up event listeners
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
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

// Handle logout
function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    window.location.href = "login.html";
}

// Handle delete profile
function handleDeleteProfile() {
    if (confirm("Are you sure you want to delete your profile? This action cannot be undone.")) {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("user_id");
        
        if (!token || !userId) {
            showAlert("You must be logged in to delete your profile", "danger");
            return;
        }
        
        fetch(`${API_URL}/vehicle-owners/profile`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to delete profile");
            }
            showAlert("Profile deleted successfully", "success");
            setTimeout(() => {
                handleLogout();
            }, 2000);
        })
        .catch(error => {
            console.error("Error deleting profile:", error);
            showAlert("Failed to delete profile", "danger");
        });
    }
}

// Load cart items from localStorage and fetch details from API
async function loadCartItems() {
    try {
        // Get cart from localStorage
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const cartItemsContainer = document.getElementById("cart-items");
        
        if (!cartItemsContainer) {
            console.error("Cart items container not found");
            return;
        }
        
        // Clear existing items
        cartItemsContainer.innerHTML = "";
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <p>Your cart is empty</p>
                    <a href="marketplace.html" class="btn btn-primary">Continue Shopping</a>
                </div>
            `;
            updateCartTotal(0);
            return;
        }
        
        // Show loading state
        cartItemsContainer.innerHTML = `
            <div class="loading">
                <p>Loading cart items...</p>
            </div>
        `;
        
        // Get token for API requests
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No authentication token found");
        }
        
        // Fetch details for each item in the cart
        let totalAmount = 0;
        const itemPromises = cart.map(async (item) => {
            try {
                // Try the marketplace endpoint first
                let response = await fetch(`${API_URL}/marketplace/spare-parts/${item.id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                
                // If not found, try the fallback endpoint
                if (!response.ok) {
                    response = await fetch(`${API_URL}/spare-parts/${item.id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                }
                
                if (!response.ok) {
                    // If both fail, use mock data
                    return getMockPartDetails(item.id, item.quantity);
                }
                
                const partDetails = await response.json();
                const itemTotal = partDetails.price * item.quantity;
                totalAmount += itemTotal;
                
                return {
                    id: item.id,
                    name: partDetails.name,
                    price: partDetails.price,
                    quantity: item.quantity,
                    total: itemTotal,
                    imageUrl: partDetails.imageUrl
                };
            } catch (error) {
                console.error(`Error fetching details for item ${item.id}:`, error);
                // Use mock data as fallback
                return getMockPartDetails(item.id, item.quantity);
            }
        });
        
        // Wait for all item details to be fetched
        const itemDetails = await Promise.all(itemPromises);
        
        // Clear loading state
        cartItemsContainer.innerHTML = "";
        
        // Render each item
        itemDetails.forEach(item => {
            const itemElement = document.createElement("div");
            itemElement.className = "cart-item";
            itemElement.dataset.id = item.id;
            
            itemElement.innerHTML = `
                <div class="item-image">
                    ${item.imageUrl ? 
                        `<img src="${item.imageUrl}" alt="${item.name}">` : 
                        `<div class="no-image">No Image</div>`
                    }
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <div class="item-price">ksh${item.price.toFixed(2)}</div>
                    <div class="item-quantity">
                        <button class="quantity-btn decrease">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn increase">+</button>
                    </div>
                    <div class="item-total">$${item.total.toFixed(2)}</div>
                </div>
                <button class="btn btn-remove">Remove</button>
            `;
            
            cartItemsContainer.appendChild(itemElement);
            
            // Add event listeners for quantity buttons and remove button
            const decreaseBtn = itemElement.querySelector(".decrease");
            const increaseBtn = itemElement.querySelector(".increase");
            const removeBtn = itemElement.querySelector(".btn-remove");
            
            decreaseBtn.addEventListener("click", () => updateItemQuantity(item.id, -1));
            increaseBtn.addEventListener("click", () => updateItemQuantity(item.id, 1));
            removeBtn.addEventListener("click", () => removeItem(item.id));
        });
        
        // Update total
        updateCartTotal(totalAmount);
        
    } catch (error) {
        console.error("Error loading cart items:", error);
        showAlert("Failed to load cart items", "danger");
    }
}

// Get mock part details when API fails
function getMockPartDetails(id, quantity) {
    // Mock data for different part IDs
    const mockParts = {
        1: { name: "Brake Pads", price: 45.99 },
        2: { name: "Oil Filter", price: 12.99 },
        3: { name: "Spark Plugs", price: 24.99 },
        4: { name: "Headlight Assembly", price: 89.99 },
        5: { name: "Shock Absorber", price: 65.50 },
        6: { name: "Side Mirror", price: 49.99 }
    };
    
    // Default part details if ID not found
    const defaultPart = { name: `Part #${id}`, price: 29.99 };
    const part = mockParts[id] || defaultPart;
    
    const itemTotal = part.price * quantity;
    
    return {
        id: id,
        name: part.name,
        price: part.price,
        quantity: quantity,
        total: itemTotal,
        imageUrl: `https://via.placeholder.com/100x100?text=${encodeURIComponent(part.name)}`
    };
}

// Update item quantity
function updateItemQuantity(itemId, change) {
    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    // Find the item
    const itemIndex = cart.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    // Update quantity
    cart[itemIndex].quantity += change;
    
    // Remove item if quantity is 0 or less
    if (cart[itemIndex].quantity <= 0) {
        cart.splice(itemIndex, 1);
    }
    
    // Save updated cart
    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Reload cart items
    loadCartItems();
    
    // Update cart count in header
    updateCartCount();
}

// Remove item from cart
function removeItem(itemId) {
    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    // Remove the item
    const updatedCart = cart.filter(item => item.id !== itemId);
    
    // Save updated cart
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    
    // Show alert
    showAlert("Item removed from cart", "success");
    
    // Reload cart items
    loadCartItems();
    
    // Update cart count in header
    updateCartCount();
}

// Update cart total
function updateCartTotal(total) {
    const totalElement = document.getElementById("total-amount");
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

// Update cart count in header
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    const cartCountElement = document.getElementById("cart-count");
    if (cartCountElement) {
        cartCountElement.textContent = cartCount;
    }
}

// Show alert message
function showAlert(message, type) {
    // Create alert element if it doesn't exist
    let alertElement = document.getElementById("alert-message");
    if (!alertElement) {
        alertElement = document.createElement("div");
        alertElement.id = "alert-message";
        alertElement.className = `alert alert-${type}`;
        alertElement.style.position = "fixed";
        alertElement.style.top = "20px";
        alertElement.style.right = "20px";
        alertElement.style.zIndex = "9999";
        document.body.appendChild(alertElement);
    } else {
        alertElement.className = `alert alert-${type}`;
    }
    
    // Set alert content
    alertElement.textContent = message;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertElement.remove();
    }, 5000);
}