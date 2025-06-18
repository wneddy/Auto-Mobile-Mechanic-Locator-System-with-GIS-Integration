// Global variables
const API_URL = "http://localhost:5501/api";

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Order confirmation page loaded");
    
    // Get order ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("orderId");
    
    if (!orderId) {
        showAlert("Order ID not found", "warning");
        setTimeout(() => {
            window.location.href = "marketplace.html";
        }, 2000);
        return;
    }
    
    // Load order details
    loadOrderDetails(orderId);
    
    // Set up event listeners
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Download invoice button
    const downloadInvoiceBtn = document.getElementById("download-invoice");
    if (downloadInvoiceBtn) {
        downloadInvoiceBtn.addEventListener("click", () => {
            const orderId = downloadInvoiceBtn.dataset.orderId;
            if (orderId) {
                generateInvoice(orderId);
            }
        });
    }
    
    // Continue shopping button
    const continueShoppingBtn = document.getElementById("continue-shopping");
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener("click", () => {
            window.location.href = "marketplace.html";
        });
    }
}

// Load order details
async function loadOrderDetails(orderId) {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No authentication token found");
        }
        
        // Try to fetch order details from API
        let orderData;
        try {
            const response = await fetch(`${API_URL}/orders/${orderId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error("Failed to fetch order details");
            }
            
            orderData = await response.json();
        } catch (error) {
            console.error("Error fetching order details:", error);
            // Use mock order data
            orderData = generateMockOrderData(orderId);
        }
        
        // Display order details
        displayOrderDetails(orderData);
        
    } catch (error) {
        console.error("Error loading order details:", error);
        showAlert("Failed to load order details", "danger");
    }
}

// Generate mock order data
function generateMockOrderData(orderId) {
    const mockItems = [
        { id: 1, name: "Brake Pads", price: 45.99, quantity: 1 },
        { id: 2, name: "Oil Filter", price: 12.99, quantity: 2 }
    ];
    
    const total = mockItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    return {
        id: orderId,
        date: new Date().toISOString(),
        status: "Completed",
        items: mockItems,
        total: total,
        paymentMethod: "mpesa",
        paymentDetails: {
            phoneNumber: "0712345678",
            transactionId: "MPE" + Math.floor(Math.random() * 1000000)
        }
    };
}

// Display order details
function displayOrderDetails(order) {
    const orderIdElement = document.getElementById("order-id");
    const orderDateElement = document.getElementById("order-date");
    const orderStatusElement = document.getElementById("order-status");
    const orderItemsElement = document.getElementById("order-items");
    const orderTotalElement = document.getElementById("order-total");
    const paymentMethodElement = document.getElementById("payment-method");
    const downloadInvoiceBtn = document.getElementById("download-invoice");
    
    if (orderIdElement) {
        orderIdElement.textContent = order.id;
    }
    
    if (orderDateElement) {
        const date = new Date(order.date);
        orderDateElement.textContent = date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }
    
    if (orderStatusElement) {
        orderStatusElement.textContent = order.status;
    }
    
    if (orderItemsElement) {
        orderItemsElement.innerHTML = "";
        
        order.items.forEach(item => {
            const itemElement = document.createElement("div");
            itemElement.className = "order-item";
            
            itemElement.innerHTML = `
                <span class="item-name">${item.name} (x${item.quantity})</span>
                <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
            `;
            
            orderItemsElement.appendChild(itemElement);
        });
    }
    
    if (orderTotalElement) {
        orderTotalElement.textContent = `$${order.total.toFixed(2)}`;
    }
    
    if (paymentMethodElement) {
        let paymentMethodText = "Unknown";
        
        switch (order.paymentMethod) {
            case "credit-card":
                paymentMethodText = "Credit/Debit Card";
                break;
            case "paypal":
                paymentMethodText = "PayPal";
                break;
            case "mpesa":
                paymentMethodText = "M-Pesa";
                break;
            case "google-pay":
                paymentMethodText = "Google Pay";
                break;
            case "apple-pay":
                paymentMethodText = "Apple Pay";
                break;
        }
        
        paymentMethodElement.textContent = paymentMethodText;
        
        // Add transaction ID for M-Pesa
        if (order.paymentMethod === "mpesa" && order.paymentDetails && order.paymentDetails.transactionId) {
            const transactionElement = document.createElement("p");
            transactionElement.textContent = `Transaction ID: ${order.paymentDetails.transactionId}`;
            paymentMethodElement.parentNode.appendChild(transactionElement);
        }
    }
    
    if (downloadInvoiceBtn) {
        downloadInvoiceBtn.dataset.orderId = order.id;
    }
}

// Generate and download invoice
function generateInvoice(orderId) {
    // Get user details
    const userId = localStorage.getItem("user_id");
    const token = localStorage.getItem("token");
    
    // Fetch user profile for invoice details
    fetch(`${API_URL}/vehicle-owners/profile/${userId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to fetch user profile");
        }
        return response.json();
    })
    .catch(error => {
        console.error("Error fetching user profile:", error);
        // Use mock user data
        return {
            full_name: "John Doe",
            email: "john.doe@example.com",
            phone: "0712345678",
            address: "123 Main St, Nairobi"
        };
    })
    .then(userProfile => {
        // Fetch order details
        fetch(`${API_URL}/orders/${orderId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch order details");
            }
            return response.json();
        })
        .catch(error => {
            console.error("Error fetching order details:", error);
            // Use mock order data
            return generateMockOrderData(orderId);
        })
        .then(orderData => {
            // Generate invoice HTML
            const invoiceHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Invoice #${orderId}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            color: #333;
                        }
                        .invoice-box {
                            max-width: 800px;
                            margin: auto;
                            padding: 30px;
                            border: 1px solid #eee;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
                            font-size: 16px;
                            line-height: 24px;
                        }
                        .invoice-box table {
                            width: 100%;
                            line-height: inherit;
                            text-align: left;
                            border-collapse: collapse;
                        }
                        .invoice-box table td {
                            padding: 5px;
                            vertical-align: top;
                        }
                        .invoice-box table tr.top table td {
                            padding-bottom: 20px;
                        }
                        .invoice-box table tr.top table td.title {
                            font-size: 45px;
                            line-height: 45px;
                            color: #333;
                        }
                        .invoice-box table tr.information table td {
                            padding-bottom: 40px;
                        }
                        .invoice-box table tr.heading td {
                            background: #eee;
                            border-bottom: 1px solid #ddd;
                            font-weight: bold;
                        }
                        .invoice-box table tr.details td {
                            padding-bottom: 20px;
                        }
                        .invoice-box table tr.item td {
                            border-bottom: 1px solid #eee;
                        }
                        .invoice-box table tr.item.last td {
                            border-bottom: none;
                        }
                        .invoice-box table tr.total td:nth-child(4) {
                            border-top: 2px solid #eee;
                            font-weight: bold;
                        }
                        @media only screen and (max-width: 600px) {
                            .invoice-box table tr.top table td {
                                width: 100%;
                                display: block;
                                text-align: center;
                            }
                            .invoice-box table tr.information table td {
                                width: 100%;
                                display: block;
                                text-align: center;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="invoice-box">
                        <table>
                            <tr class="top">
                                <td colspan="4">
                                    <table>
                                        <tr>
                                            <td class="title">
                                                Auto-Mobile Mechanic Locator System
                                            </td>
                                            <td style="text-align: right;">
                                                Invoice #: ${orderId}<br>
                                                Created: ${new Date().toLocaleDateString()}<br>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr class="information">
                                <td colspan="4">
                                    <table>
                                        <tr>
                                            <td>
                                                Auto-Mobile Mechanic Locator System<br>
                                                123 Mechanic Ave<br>
                                                Nairobi, Kenya
                                            </td>
                                            <td style="text-align: right;">
                                                ${userProfile.full_name}<br>
                                                ${userProfile.email}<br>
                                                ${userProfile.phone}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr class="heading">
                                <td>Item</td>
                                <td>Price</td>
                                <td>Quantity</td>
                                <td>Total</td>
                            </tr>
                            ${orderData.items.map(item => `
                                <tr class="item">
                                    <td>${item.name}</td>
                                    <td>$${item.price.toFixed(2)}</td>
                                    <td>${item.quantity}</td>
                                    <td>$${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total">
                                <td colspan="3"></td>
                                <td>Total: $${orderData.total.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                </body>
                </html>
            `;
            
            // Create a Blob from the HTML
            const blob = new Blob([invoiceHtml], { type: 'text/html' });
            
            // Create a download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `invoice-${orderId}.html`;
            
            // Append to the document, click it, and remove it
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });
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