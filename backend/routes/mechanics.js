const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/validateToken');
//const Notification = require('../models/Notification');
//const MechanicProfiles = require('../models/MechanicProfiles'); // Ensure this path is correct
//const ServiceRequest = require('../models/ServiceRequest');
//const MechEarnings = require('../models/MechEarnings');
//const Booking = require('../models/Booking');
const { User, Booking, Notification, ServiceRequest, MechEarnings, MechanicProfiles, VehicleOwnerProfiles } = require('../models');
//const { sequelize } = require('../../src/config/db'); // Adjust the path as necessary
const sequelize = require('../../src/config/db'); // Adjust the path as necessary
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const geolib = require('geolib');
const db = require('../models/index'); 
const {
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile,
} = require("../controllers/mechanicProfileController");

router.use(validateToken);

// User routes
router.post("/profile", validateToken, createProfile); // Create a new profile
router.get("/profile", validateToken, getProfile); // Get the logged-in mechanic's profile
router.put("/profile", validateToken, updateProfile); // Update the logged-in mechanic's profile
router.delete("/profile", validateToken, deleteProfile); // Delete the logged-in mechanic's profile
/*
// Admin routes
router.get("/profiles", validateToken, getAllMechanicProfiles); // Admin can view all profiles
router.delete("/profiles/:userId", validateToken, adminDeleteMechanicProfile); // Admin can delete any mechanic's profile
*/
// Route to fetch mechanic profile by user ID
router.get('/getMechanicProfile/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const profile = await MechanicProfiles.findOne({ where: { user_id: userId } });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching mechanic profile:', error);
        res.status(500).json({ message: 'An error occurred while fetching the profile' });
    }
});

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Profile submission with validation
router.post('/submit-profile', validateToken, upload.single('profile_picture'), [
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('gender').notEmpty().withMessage('Gender is required'),
    body('national_id_passport').notEmpty().withMessage('National ID or Passport is required'),
    body('specialization').notEmpty().withMessage('Specialization is required'),
    body('skills_services').notEmpty().withMessage('Skills & Services Offered are required'),
    body('years_of_experience').isInt().withMessage('Years of Experience must be an integer'),
    body('certification_number').notEmpty().withMessage('Mechanic Certification Number is required'),
    body('availability').notEmpty().withMessage('Availability is required'),
    body('workshop_address').notEmpty().withMessage('Workshop Address is required'),
    body('county').notEmpty().withMessage('County is required'),
    body('sub_county').notEmpty().withMessage('Sub-county is required'),
    body('latitude').notEmpty().withMessage('Latitude is required'),
    body('longitude').notEmpty().withMessage('Longitude is required'),
    body('vehicle_types').notEmpty().withMessage('Vehicle Types are required'),
    body('preferred_brands').notEmpty().withMessage('Preferred Brands are required'),
    body('estimated_charges').notEmpty().withMessage('Estimated Charges are required'),
    body('payment_methods').notEmpty().withMessage('Payment Methods are required'),
], async (req, res) => {
    console.log('Incoming request body:', req.body);
    console.log('Uploaded file:', req.file);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    
    try {
        const profileData = {
            ...req.body,
            user_id: req.userId,
            profile_picture: req.file ? req.file.path : null
        };
        console.log('Profile Data:', profileData);
        const profile = await MechanicProfiles.create(profileData);
        res.status(201).json({ message: 'Profile created successfully', profile });
    } catch (error) {
        console.error('Error creating profile:', error);
        res.status(500).json({ message: 'An error occurred while creating the profile' });
    }
});

// Example data (replace this with your actual data source)
const mechanics = [
    { id: 1, name: 'John Doe', latitude: 37.7749, longitude: -122.4194, specialization: 'Brakes', contact: '123-456-7890' },
    { id: 2, name: 'Jane Smith', latitude: 37.7849, longitude: -122.4094, specialization: 'Engine', contact: '987-654-3210' },
];

//mechanic dashboard
// Route to get mechanic profile details using user_id
router.get('/profile', validateToken, async (req, res) => {
    const userId = req.userId; // Get user_id from the validated token

    try {
        const profile = await MechanicProfiles.findOne({
            where: { user_id: userId } // Fetch using user_id from the token
        });

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Mechanic profile not found' });
        }

        res.json({ success: true, profile });
    } catch (error) {
        console.error('Error fetching mechanic profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Route to get dashboard data
router.get('/dashboard', validateToken, async (req, res) => {
    try {
        const mechanicId = req.userId; // Use req.userId
        if (!mechanicId) {
            return res.status(400).json({ message: 'User  ID is required' });
        }

        const totalBookings = await Booking.count({
            where: { mechanicId }
        });

        const totalRevenue = await MechEarnings.sum('amount', {
            where: { user_id: mechanicId }
        });

        const averageRating = await ServiceRequest.findOne({
            where: { mechanic_id: mechanicId },
            attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'averageRating']]
        });

        res.json({
            totalBookings,
            totalRevenue,
            averageRating: averageRating ? averageRating.get('averageRating') : 0
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// GET pending service requests for a mechanic
// Route to get pending service requests
router.get('/pending-requests', validateToken, async (req, res) => {
    try {
        const mechanicId = req.userId; // Use req.userId from the validated token
        if (!mechanicId) {
            return res.status(400).json({ message: 'User  ID is required' });
        }

        const pendingRequests = await ServiceRequest.findAll({
            where: {
                mechanic_id: mechanicId,
                status: 'pending'
            },
            include: [
                {
                    model: MechanicProfiles,
                    as: 'mechanic',
                    attributes: ['full_name']
                },
                {
                    model: VehicleOwnerProfiles,
                    as: 'vehicleOwner',
                    attributes: ['full_name']
                }
            ]
        });

        res.json(pendingRequests);
        console.log(pendingRequests);
    } catch (error) {
        console.error('Error fetching pending service requests:', error);
        res.status(500).json({ message: 'Error fetching pending service requests' });
    }
});

// Route to accept a service request
router.post('/accept-request', validateToken, async (req, res) => {
    try {
        const { requestId } = req.body; // Get requestId from the request body

        if (!requestId) {
            return res.status(400).json({ message: 'Request ID is required' });
        }

        // Update the status of the service request to 'accepted'
        await ServiceRequest.update(
            { status: 'accepted' },
            { where: { id: requestId } }
        );

        // Fetch the service request to get the vehicle owner's ID
        const serviceRequest = await ServiceRequest.findByPk(requestId);
        
        // Check if the service request exists
        if (!serviceRequest) {
            return res.status(404).json({ message: 'Service request not found' });
        }

        const vehicleOwnerId = serviceRequest.user_id; // Use user_id to get the vehicle owner's ID

        // Debugging: Log the vehicle owner ID
        console.log('Vehicle Owner ID:', vehicleOwnerId);

        if (!vehicleOwnerId) {
            return res.status(400).json({ message: 'Vehicle owner ID is required' });
        }

        // Create a notification for the vehicle owner
        await Notification.create({
            user_id: vehicleOwnerId,
            message: `Your service request #${requestId} has been accepted.`,
            service_request_id: requestId // Associate the notification with the service request
        });

        res.json({ message: 'Service request accepted' });
    } catch (error) {
        console.error('Error accepting service request:', error);
        res.status(500).json({ message: 'Error accepting service request' });
    }
});

// Route to decline a service request
router.post('/decline-request', validateToken, async (req, res) => {
    try {
        const { requestId } = req.body; // Get requestId from the request body

        if (!requestId) {
            return res.status(400).json({ message: 'Request ID is required' });
        }

        // Update the status of the service request to 'declined'
        await ServiceRequest.update(
            { status: 'declined' },
            { where: { id: requestId } }
        );

        // Fetch the service request to get the vehicle owner's ID
        const serviceRequest = await ServiceRequest.findByPk(requestId);
        
        // Check if the service request exists
        if (!serviceRequest) {
            return res.status(404).json({ message: 'Service request not found' });
        }

        const vehicleOwnerId = serviceRequest.user_id; // Use user_id to get the vehicle owner's ID

        // Create a notification for the vehicle owner
        await Notification.create({
            user_id: vehicleOwnerId,
            message: `Your service request #${requestId} has been declined.`,
            service_request_id: requestId // Associate the notification with the service request
        });

        res.json({ message: 'Service request declined' });
    } catch (error) {
        console.error('Error declining service request:', error);
        res.status(500).json({ message: 'Error declining service request' });
    }
});

// Route to create a notification for a vehicle owner
router.post('/notifications', validateToken, async (req, res) => {
    try {
        const { user_id, message, service_request_id } = req.body; // Get user_id, message, and service_request_id from the request body

        if (!user_id) {
            return res.status(400).json({ message: 'User  ID is required' });
        }

        if (!service_request_id) {
            return res.status(400).json({ message: 'Service request ID is required' });
        }

        // Create the notification
        const notification = await Notification.create({
            user_id: user_id,
            message: message,
            service_request_id: service_request_id // Include the service_request_id
        });

        res.status(201).json(notification); // Respond with the created notification
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ message: 'Error creating notification' });
    }
});
/*
// Route to fetch notifications for a specific user
router.get('/get-notifications', async (req, res) => {
    try {
        const userId = req.user.id; // Assuming you set the user ID in the request after validating the token
        const notifications = await Notification.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']] // Optional: Order by creation date
        });
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});
*/
// Route to fetch earnings
router.get('/earnings', validateToken, async (req, res) => {
    const userId = req.userId; // Get user_id from the validated token

    try {
        // Fetch earnings history
        const earningsHistory = await MechEarnings.findAll({
            where: { user_id: userId },
            order: [['date', 'DESC']] // Order by date descending
        });

        // Calculate total earnings and pending payments
        const totalEarnings = earningsHistory.reduce((acc, earning) => acc + parseFloat(earning.amount), 0);
        const pendingPayments = earningsHistory.filter(earning => earning.status === 'Pending').reduce((acc, earning) => acc + parseFloat(earning.amount), 0);
        const completedJobs = earningsHistory.filter(earning => earning.status === 'Completed').length;

        res.json({
            success: true,
            totalEarnings,
            pendingPayments,
            completedJobs,
            earningsHistory
        });
    } catch (error) {
        console.error('Error fetching earnings data:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get mechanic notifications (Unread Only)
router.get('/mechanic/notifications/:mechanicId', async (req, res) => {
    try {
        const { mechanicId } = req.params;

        const notifications = await Notification.findAll({
            where: { user_id: mechanicId, is_read: false },
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Mark notifications as read
router.post('/mechanic/mark-as-read/:mechanicId', async (req, res) => {
    try {
        const { mechanicId } = req.params;

        await Notification.update({ is_read: true }, { where: { user_id: mechanicId } });

        res.json({ success: true, message: 'Notifications marked as read' });
    } catch (error) {
        console.error('Error updating notifications:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Route to get all bookings for the logged-in mechanic
router.get('/bookings', async (req, res) => {
    try {
        const mechanicId = req.userId; // Use req.userId
        if (!mechanicId) {
            return res.status(400).json({ message: 'User  ID is required' });
        }

        const bookings = await Booking.findAll({
            where: { mechanicId }, // Ensure mechanicId is defined
            include: [
                {
                    model: ServiceRequest,
                    as: 'serviceRequest', // Use the alias defined in the association
                    attributes: ['status'] // Include the status from ServiceRequest
                }
            ]
        });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Route to update the status of a booking
router.post('/bookings/update-status/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { status } = req.body; // Expecting status to be sent in the request body

        // Update the booking status
        await Booking.update(
            { status: status },
            { where: { requestId: bookingId } }
        );

        res.json({ message: 'Booking status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating booking status' });
    }
});

// Route to get mechanic profile by user ID
router.get('/full/profile/:userId', async (req, res) => {
    const userId = req.params.userId; // Get user_id from the request parameters

    try {
        const profile = await MechanicProfiles.findOne({
            where: { id: userId } // Fetch using the mechanic's ID
        });

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Mechanic profile not found' });
        }

        res.json({
            success: true,
            profile: {
                full_name: profile.full_name,
                gender: profile.gender,
                specialization: profile.specialization,
                years_of_experience: profile.years_of_experience,
                county: profile.county,
                sub_county: profile.sub_county,
                skills_services: profile.skills_services,
                certification_number: profile.certification_number,
                availability: profile.availability,
                workshop_address: profile.workshop_address,
                work_radius: profile.work_radius,
                profile_picture: profile.profile_picture // Include profile picture if available
            }
        });
    } catch (error) {
        console.error('Error fetching mechanic profile:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Route to change mechanic password
router.post('/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body; // Get data from request body

    try {
        const profile = await MechanicProfiles.findOne({ where: { id: userId } });

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Mechanic profile not found' });
        }

        // Check if the current password is correct
        const isMatch = await bcrypt.compare(currentPassword, profile.password); // Assuming you have a password field

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database
        profile.password = hashedPassword;
        await profile.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

//users end
// Get all available mechanics
router.get('/mechanics', async (req, res) => {
    try {
        const mechanics = await MechanicProfiles.findAll({
            where: { available: true } // Assuming there's an 'available' field
        });
        res.json(mechanics);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching mechanics' });
    }
});

// Haversine formula to calculate distance
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Route to get mechanics based on latitude and longitude
router.get('/fetch', async (req, res) => {
    const { lat, lng } = req.query;

    // Validate latitude and longitude
    if (!lat || !lng) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Check if lat and lng are valid numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: 'Latitude and longitude must be valid numbers' });
    }

    try {
        const mechanics = await MechanicProfiles.findAll(); // Fetch all mechanics

        // Filter mechanics based on distance
        const nearbyMechanics = mechanics.filter(mechanic => {
            const distance = haversineDistance(latitude, longitude, mechanic.latitude, mechanic.longitude);
            return distance <= 100; // Return mechanics within 100 km
        });

        // Check if any nearby mechanics were found
        if (nearbyMechanics.length === 0) {
            return res.status(404).json({ message: 'No mechanics found within 100 km' });
        }

        return res.json(nearbyMechanics);
    } catch (error) {
        console.error('Error fetching mechanics:', error);
        return res.status(500).json({ message: 'An error occurred while fetching mechanics', error: error.message });
    }
});

// Create a service request
router.post('/user-service-request', validateToken, async (req, res) => {
    const { mechanicId, problemDescription } = req.body; // Extract mechanicId and problemDescription from request body
    const userId = req.userId; // Get userId from the validated token

    // Validate input
    if (!mechanicId || !problemDescription) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        // Check if userId exists in VehicleOwnerProfiles
        const userExists = await VehicleOwnerProfiles.findByPk(userId);
        if (!userExists) {
            return res.status(400).json({ message: 'User  does not exist' });
        }

        // Check if mechanicId exists in MechanicProfiles
        const mechanicExists = await MechanicProfiles.findByPk(mechanicId);
        if (!mechanicExists) {
            return res.status(400).json({ message: 'Mechanic does not exist' });
        }

        // Create the service request
        const serviceRequest = await ServiceRequest.create({
            user_id: userId,
            mechanic_id: mechanicId,
            description: problemDescription // Assuming you have a description field
        });

        res.status(201).json({ message: 'Service request sent', serviceRequest });
    } catch (error) {
        console.error('Error creating service request:', error);
        res.status(500).json({ message: 'Error sending service request' });
    }
});

// Calculate distance between vehicle owner and mechanic
router.get('/distance/:mechanicId', async (req, res) => {
    const { mechanicId } = req.params;
    const { userLat, userLng } = req.query; // Get user's latitude and longitude from query params

    try {
        const mechanic = await MechanicProfiles.findByPk(mechanicId);
        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic not found' });
        }

        const distance = geolib.getDistance(
            { latitude: userLat, longitude: userLng },
            { latitude: mechanic.latitude, longitude: mechanic.longitude } // Assuming these fields exist
        );

        res.json({ distance: distance / 1000 }); // Convert to kilometers
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error calculating distance' });
    }
});

// Add this new endpoint to fetch nearby service requests
router.get('/nearby-requests', validateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    const mechanicId = req.userId;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    // Find all pending service requests
    const serviceRequests = await ServiceRequest.findAll({
      where: {
        status: 'pending',
        mechanic_id: mechanicId // Only show requests assigned to this mechanic
      },
      include: [
        {
          model: VehicleOwnerProfiles,
          as: 'vehicleOwner',
          attributes: ['full_name']
        }
      ]
    });
    
    // Calculate distance for each request
    const requestsWithDistance = serviceRequests.map(request => {
      // If the request has location data
      if (request.latitude && request.longitude) {
        const distance = haversineDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(request.latitude),
          parseFloat(request.longitude)
        );
        
        return {
          ...request.toJSON(),
          distance
        };
      }
      
      return request.toJSON();
    });
    
    // Sort by distance
    requestsWithDistance.sort((a, b) => {
      if (a.distance && b.distance) {
        return a.distance - b.distance;
      }
      return 0;
    });
    
    res.json({ success: true, requests: requestsWithDistance });
  } catch (error) {
    console.error('Error fetching nearby service requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching nearby service requests' });
  }
});

//mechanics end
// Endpoint to update mechanic's location
router.post('/mechanic/location', async (req, res) => {
    const { userId, latitude, longitude } = req.body;

    try {
        // Update the mechanic's location in the database
        await MechanicProfiles.update(
            { latitude, longitude },
            { where: { user_id: userId } }
        );

        // Broadcast the new location to connected clients (using WebSocket)
        // Assuming you have a WebSocket server set up
        // io.emit('locationUpdate', { userId, latitude, longitude });

        res.status(200).json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ message: 'Error updating location' });
    }
});

// Endpoint to update availability status
router.post('/mechanic/availability', async (req, res) => {
    const { userId, availability } = req.body;

    try {
        // Update the mechanic's availability in the database
        await MechanicProfiles.update(
            { availability },
            { where: { user_id: userId } }
        );

        // Notify customers or other services about the availability change
        // io.emit('availabilityUpdate', { userId, availability });

        res.status(200).json({ message: 'Availability updated successfully' });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ message: 'Error updating availability' });
    }
});

// Endpoint to calculate distance to a service request
router.get('/mechanic/distance/:requestId', async (req, res) => {
    const { requestId } = req.params;

    // Fetch the service request location from the database
    // Assuming you have a ServiceRequests model
    const serviceRequest = await ServiceRequests.findByPk(requestId);
    if (!serviceRequest) {
        return res.status(404).json({ message: 'Service request not found' });
    }

    const { latitude: requestLat, longitude: requestLng } = serviceRequest;

    // Fetch the mechanic's current location
    const mechanicProfile = await MechanicProfiles.findOne({ where: { user_id: req.userId } });
    const { latitude: mechanicLat, longitude: mechanicLng } = mechanicProfile;

    // Calculate the distance
    const distance = geolib.getDistance(
        { latitude: mechanicLat, longitude: mechanicLng },
        { latitude: requestLat, longitude: requestLng }
    );

    // Convert distance from meters to kilometers
    const distanceInKm = distance / 1000;

    res.status(200).json({ distance: distanceInKm });
});

//dashboard routes
// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
      const user = await User.findByPk(req.userId)
  
      if (!user || user.user_type !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." })
      }
  
      next()
    } catch (error) {
      console.error("Admin check error:", error)
      res.status(500).json({ message: "Server error" })
    }
  }
  
  // Get all mechanics with pagination, search, and filtering
  router.get("/", validateToken, isAdmin, async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const offset = (page - 1) * limit
      const search = req.query.search || ""
      const status = req.query.status || ""
  
      // Build where clause
      const whereClause = {}
  
      if (search) {
        whereClause[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { specialization: { [Op.like]: `%${search}%` } },
        ]
      }
  
      if (status === "verified") {
        whereClause.isVerified = true
      } else if (status === "pending") {
        whereClause.isVerified = false
      }
  
      // Get total count for pagination
      const count = await MechanicProfiles.count({ where: whereClause })
  
      // Get mechanics with pagination
      const mechanics = await MechanicProfiles.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "email", "phone"],
          },
        ],
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      })
  
      res.json({
        mechanics,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalItems: count,
      })
    } catch (error) {
      console.error("Error fetching mechanics:", error)
      res.status(500).json({ message: "Server error" })
    }
  })
  
  // Get a single mechanic by ID
  router.get("/:id", validateToken, isAdmin, async (req, res) => {
    try {
      const mechanic = await MechanicProfiles.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "email", "phone"],
          },
        ],
      })
  
      if (!mechanic) {
        return res.status(404).json({ message: "Mechanic not found" })
      }
  
      res.json(mechanic)
    } catch (error) {
      console.error("Error fetching mechanic:", error)
      res.status(500).json({ message: "Server error" })
    }
  })
  
  // Verify a mechanic
  router.put("/:id/verify", validateToken, isAdmin, async (req, res) => {
    try {
      const mechanicId = req.params.id
      const { isVerified } = req.body
  
      // Find the mechanic
      const mechanic = await MechanicProfiles.findByPk(mechanicId)
  
      if (!mechanic) {
        return res.status(404).json({ message: "Mechanic not found" })
      }
  
      // Update verification status
      await mechanic.update({ isVerified })
  
      res.json({ message: "Mechanic verification status updated successfully" })
    } catch (error) {
      console.error("Error updating mechanic verification status:", error)
      res.status(500).json({ message: "Server error" })
    }
  })



/*
// Function to fetch nearby mechanics
async function getNearbyMechanics(latitude, longitude) {
    // Example query using a hypothetical database model
    return await MechanicProfiles.findAll({
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                },
                $maxDistance: 5000 // distance in meters
            }
        }
    });
}

// Define the route to fetch nearby mechanics
router.get('/', async (req, res) => {
    const { lat, lng } = req.query;

    // Validate the input
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    try {
        // Fetch nearby mechanics from the database
        const nearbyMechanics = await getNearbyMechanics(lat, lng);
        res.json(nearbyMechanics);
    } catch (error) {
        console.error('Error fetching nearby mechanics:', error);
        res.status(500).json({ error: 'Failed to fetch nearby mechanics. Please try again later.' });
    }
});
*/
module.exports = router; // Export the router