// Initialize Socket.IO
var socket = io('http://localhost:5501');

// Initialize the map
var map = L.map('map').setView([0, 0], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Variables to track state
let trackingEnabled = false;
let currentMarker; // To store the current location marker
let serviceRequestLocation = { lat: 37.7749, lng: -122.4194 }; // Example service request location (replace with actual data)

// Function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Function to draw a route on the map
function drawRoute(start, end) {
    const route = L.polyline([start, end], { color: 'blue' }).addTo(map);
    map.fitBounds(route.getBounds()); // Adjust the map view to fit the route
}

// Toggle Tracking
document.getElementById('toggle-tracking').addEventListener('click', function() {
    if (trackingEnabled) {
        // Stop tracking
        if (currentMarker) {
            map.removeLayer(currentMarker); // Remove the current location marker
        }
        document.getElementById('tracking-status').innerHTML = "Status: <strong>Tracking OFF</strong>";
        this.textContent = "Enable Location"; // Change button text
        trackingEnabled = false; // Update tracking state
    } else {
        // Start tracking
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Update the map view and marker
                if (currentMarker) {
                    map.removeLayer(currentMarker); // Remove previous marker
                }
                currentMarker = L.marker([lat, lng]).addTo(map)
                    .bindPopup("Your Location").openPopup();
                map.setView([lat, lng], 13);

                // Calculate distance to service request
                const distance = calculateDistance(lat, lng, serviceRequestLocation.lat, serviceRequestLocation.lng);
                document.getElementById('distance-status').innerHTML = `Distance to Service Request: ${distance.toFixed(2)} km`;

                // Draw route to service request
                drawRoute([lat, lng], [serviceRequestLocation.lat, serviceRequestLocation.lng]);

                document.getElementById('tracking-status').innerHTML = "Status: <strong>Tracking ON</strong>";
            }, function(error) {
                console.error("Error getting location: ", error);
            });
        } else {
            alert("Geolocation is not supported by your browser.");
        }
        this.textContent = "Disable Location"; // Change button text
        trackingEnabled = true; // Update tracking state
    }
});

// Profile Dropdown
document.querySelector('.dropbtn').addEventListener('click', function() {
    const dropdownContent = document.querySelector('.dropdown-content');
    dropdownContent.style.display = (dropdownContent.style.display === 'block') ? 'none' : 'block';
});

// Close the dropdown if the user clicks outside of it
window.addEventListener('click', function(event) {
    const dropdownContent = document.querySelector('.dropdown-content');
    if (!event.target.matches('.dropbtn') && !dropdownContent.contains(event.target)) {
        dropdownContent.style.display = 'none';
    }
});

// Handle Logout
// Mechanic Dashboard Script - Session Handling

document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");
    
    if (!token || !userId) {
        alert("Session expired. Please log in again.");
        window.location.href = "login.html";
        return;
    }

    // Fetch and display mechanic details
    await fetchMechanicProfile(userId);

    // Logout event listener
    document.getElementById("logout-btn").addEventListener("click", logoutUser);
});

// Fetch Mechanic Profile Details
async function fetchMechanicProfile(userId) {
    try {
        const response = await fetch(`http://localhost:5501/api/mechanics/${userId}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        if (response.ok) {
            const mechanicData = await response.json();
            document.getElementById("mechanic-name").textContent = mechanicData.fullName;
            document.getElementById("mechanic-specialization").textContent = mechanicData.specialization;
        } else {
            console.error("Error fetching mechanic profile:", await response.json());
        }
    } catch (error) {
        console.error("Error fetching mechanic details:", error);
    }
}

// Logout Function
async function logoutUser() {
    try {
        const response = await fetch("http://localhost:5501/api/auth/logout", {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        if (response.ok) {
            localStorage.removeItem("token");
            localStorage.removeItem("user_id");
            alert("Logged out successfully.");
            window.location.href = "login.html";
        } else {
            console.error("Logout failed:", await response.json());
        }
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// Handle Notifications Click
document.querySelector('.notification-icon').addEventListener('click', async function() {
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';

    if (dropdown.style.display === 'block') {
        const userId = localStorage.getItem('userId'); // Retrieve user ID

        try {
            const response = await fetch(`http://localhost:5501/api/mechanics/${userId}`);
            const result = await response.json();

            if (result.success) {
                dropdown.innerHTML = result.notifications.length > 0
                    ? result.notifications.map(n => `<p>${n.message}</p>`).join('')
                    : '<p>No new notifications</p>';

                // Mark notifications as read
                await fetch(`http://localhost:5501/api/mechanic/mark-as-read/${userId}`, { method: 'POST' });
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }
});


// Close notifications dropdown if clicked outside
window.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notifications-dropdown');
    if (!event.target.matches('.notification-icon') && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Dashboard Stats
function updateDashboardStats(totalBookings, revenue, ratings) {
    document.querySelector('.stat-card span:nth-child(2)').textContent = totalBookings;
    document.querySelector('.stat-card span:nth-child(4)').textContent = `$${revenue}`;
    document.querySelector('.stat-card span:nth-child(6)').textContent = ratings;
}

// Pending Service Requests
document.querySelectorAll('.btn-accept').forEach(button => {
    button.addEventListener('click', async function() {
        const requestItem = this.closest('.request-item');
        const requestId = requestItem.textContent.match(/Request #(\d+)/)[1];
        const mechanicId = localStorage.getItem('userId'); // Mechanic's ID stored in local storage

        try {
            const response = await fetch(`http://localhost:5501/api/mechanics/accept/${requestId}/${mechanicId}`, {
                method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
                requestItem.innerHTML = `Request #${requestId} Accepted`;
                requestItem.classList.add('accepted');
                this.parentElement.querySelectorAll('button').forEach(btn => btn.style.display = 'none');

                // Emit socket event to notify the user
                socket.emit('acceptRequest', { requestId, mechanicId });
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    });
});

// Handle real-time update when a request is accepted
socket.on('serviceRequestAccepted', (data) => {
    console.log(`Service Request #${data.requestId} accepted by Mechanic #${data.mechanicId}`);
});


document.querySelectorAll('.btn-decline').forEach(button => {
    button.addEventListener('click', async function() {
        const requestItem = this.closest('.request-item');
        const requestId = requestItem.textContent.match(/Request #(\d+)/)[1];
        const mechanicId = localStorage.getItem('userId'); // Mechanic's ID stored in local storage

        try {
            const response = await fetch(`http://localhost:5501/api/mechanics/decline/${requestId}/${mechanicId}`, {
                method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
                requestItem.innerHTML = `Request #${requestId} Declined`;
                requestItem.classList.add('declined');
                this.parentElement.querySelectorAll('button').forEach(btn => btn.style.display = 'none');

                // Emit socket event to notify the user
                socket.emit('declineRequest', { requestId, mechanicId });
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error declining request:', error);
        }
    });
});

// Handle real-time update when a request is declined
socket.on('serviceRequestDeclined', (data) => {
    console.log(`Service Request #${data.requestId} declined by Mechanic #${data.mechanicId}`);
});


document.getElementById('send-btn').addEventListener('click', async function() {
    const message = document.getElementById('chat-input').value;
    const sender_id = localStorage.getItem('userId'); // Sender ID from storage
    const receiver_id = document.getElementById('receiver-id').value; // Receiver ID from UI

    if (message) {
        try {
            const response = await fetch('http://localhost:5501/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender_id, receiver_id, content: message })
            });

            const result = await response.json();

            if (result.success) {
                socket.emit('chatMessage', { sender_id, receiver_id, content: message });
                document.getElementById('chat-input').value = ''; // Clear input
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
});

// Listen for incoming chat messages
socket.on('chatMessage', function(msg) {
    const chatBox = document.getElementById('chat-box');
    const newMessage = document.createElement('div');
    newMessage.textContent = `${msg.sender_id}: ${msg.content}`;
    chatBox.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
});

document.querySelectorAll('.btn-update').forEach(button => {
    button.addEventListener('click', async function() {
        const requestItem = this.closest('tr'); // Get the parent table row
        const requestId = requestItem.cells[0].textContent; // Get Request ID
        const currentStatus = requestItem.cells[1].textContent; // Get current status

        const newStatus = prompt(`Current Status: ${currentStatus}\nEnter new status for Request ID ${requestId}:`);

        if (newStatus) {
            try {
                const response = await fetch('http://localhost:5501/api/mechanics/update-status', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId, status: newStatus })
                });

                const result = await response.json();

                if (result.success) {
                    socket.emit('updateRequestStatus', { requestId, status: newStatus });
                    requestItem.cells[1].textContent = newStatus; // Update UI
                    alert(`Status Updated to: ${newStatus}`);
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error('Error updating status:', error);
            }
        } else {
            alert('Status update canceled.');
        }
    });
});

// Listen for real-time status updates
socket.on('updateRequestStatus', function(data) {
    document.querySelectorAll('tr').forEach(row => {
        if (row.cells[0].textContent === data.requestId) {
            row.cells[1].textContent = data.status;
        }
    });
});


// Earnings page
// Initialize earnings data
async function fetchEarningsData() {
    const mechanicId = localStorage.getItem('mechanicId'); // Retrieve mechanic ID
    if (!mechanicId) return;

    try {
        const response = await fetch(`http://localhost:5501/api/mechanic/${mechanicId}`);
        const result = await response.json();

        if (result.success) {
            renderEarningsHistory(result.earnings);
            updateEarningsStats(result.stats);
        } else {
            console.error('Failed to fetch earnings:', result.message);
        }
    } catch (error) {
        console.error('Error fetching earnings data:', error);
    }
}

// Function to update earnings statistics
function updateEarningsStats(stats) {
    document.querySelector('.stat-card span:nth-child(2)').textContent = `$${stats.totalEarnings}`;
    document.querySelector('.stat-card span:nth-child(4)').textContent = `$${stats.pendingPayments}`;
    document.querySelector('.stat-card span:nth-child(6)').textContent = stats.completedJobs;
}

// Function to render earnings history in the table
function renderEarningsHistory(earnings) {
    const tbody = document.querySelector('.earnings-table tbody');
    tbody.innerHTML = ''; // Clear existing rows

    earnings.forEach(job => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${job.date}</td>
            <td>${job.description}</td>
            <td>$${job.amount}</td>
            <td>${job.status}</td>
        `;
        tbody.appendChild(row);
    });
}

// Listen for real-time earnings updates
socket.on('updateEarningsStatus', function(data) {
    fetchEarningsData(); // Refresh earnings data
});

// Initialize earnings data on page load
document.addEventListener('DOMContentLoaded', fetchEarningsData);

/*
// Profile page
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('user_id'); // Get the user ID from localStorage
    const token = localStorage.getItem('token'); // Get the token from localStorage

    if (!userId || !token) {
        alert('You must be logged in to view your profile.');
        window.location.href = 'login.html'; // Redirect to login page if not logged in
        return;
    }

    // Fetch the profile data from the backend
    fetch(`http://localhost:5500/api/auth/profile/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch profile data');
        }
        return response.json();
    })
    .then(data => {
        // Populate the profile information in the UI
        document.getElementById('full-name').textContent = data.full_name;
        document.getElementById('gender').textContent = data.gender;
        document.getElementById('specialization').textContent = data.specialization;
        document.getElementById('years-of-experience').textContent = data.years_of_experience;
        document.getElementById('county').textContent = data.county;
        document.getElementById('sub-county').textContent = data.sub_county;
        document.getElementById('skills-services').textContent = data.skills_services;
        document.getElementById('certification-number').textContent = data.certification_number;
        document.getElementById('availability').textContent = data.availability;
        document.getElementById('workshop-address').textContent = data.workshop_address;
        document.getElementById('work-radius').textContent = data.work_radius_km;
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });

    // Change Password Functionality
    document.getElementById('change-password').addEventListener('click', function() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            document.getElementById('password-change-message').textContent = "New passwords do not match.";
            return;
        }

        // Assuming you have a function to handle the password change
        changePassword(newPassword);
    });

    function changePassword(newPassword) {
        fetch(`http://localhost:5500/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                newPassword: newPassword
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to change password');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('password-change-message').textContent = "Password changed successfully.";
        })
        .catch(error => {
            document.getElementById('password-change-message').textContent = error.message;
        });
    }

    // Edit Profile Functionality
    document.getElementById('edit-profile').addEventListener('click', function() {
        // Redirect to the edit profile page
        window.location.href = 'edit-profile.html'; // Change to your actual edit profile page
    });

    // Delete Profile Functionality
    document.getElementById('delete-profile').addEventListener('click', function() {
        if (confirm("Are you sure you want to delete your profile? This action cannot be undone.")) {
            fetch(`http://localhost:5500/api/auth/delete-profile/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete profile');
                }
                alert("Profile deleted successfully.");
                localStorage.removeItem('user_id'); // Clear user ID from localStorage
                localStorage.removeItem('token'); // Clear token from localStorage
                window.location.href = 'login.html'; // Redirect to login page
            })
            .catch(error => {
                alert(error.message);
            });
        }
    });
});
*/