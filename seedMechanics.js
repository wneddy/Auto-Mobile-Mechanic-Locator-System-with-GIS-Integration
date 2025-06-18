const sequelize = require('./src/config/db'); // Path to your database configuration
const MechanicProfiles = require('./backend/models/MechanicProfiles'); // Path to your MechanicProfiles model

const seedMechanics = async () => {
    try {
        // Sync the database (create table if it doesn't exist)
        await sequelize.sync({ force: true }); // Use { force: true } only for development to drop existing tables

        // Create dummy data
        const mechanics = [
            {
                user_id: 6,
                full_name: "John Doe",
                gender: "Male",
                national_id_passport: "123456789",
                specialization: "Engine Repair",
                skills_services: "Engine diagnostics, Engine rebuilding",
                years_of_experience: 5,
                availability: "Full-Time",
                workshop_address: "123 Main St, Anytown",
                county: "Anytown",
                sub_county: "Central",
                latitude: 34.0522,
                longitude: -118.2437,
                vehicle_types: "Sedans",
                preferred_brands: "Toyota",
                estimated_charges: JSON.stringify({ "engine_repair": 200, "oil_change": 50 }),
                payment_methods: "Cash",
            },
            {
                user_id: 7,
                full_name: "Jane Smith",
                gender: "Female",
                national_id_passport: "987654321",
                specialization: "Brake System",
                skills_services: "Brake pad replacement, Brake fluid change",
                years_of_experience: 3,
                availability: "Part-Time",
                workshop_address: "456 Elm St, Othertown",
                county: "Othertown",
                sub_county: "North",
                latitude: 34.0525,
                longitude: -118.2430,
                vehicle_types: "SUVs",
                preferred_brands: "Honda",
                estimated_charges: JSON.stringify({ "brake_repair": 150 }),
                payment_methods: "Mobile Payment",
            },
            // Add more dummy mechanics as needed
        ];

        // Insert dummy data into the database
        await MechanicProfiles.bulkCreate(mechanics);
        console.log("Dummy data inserted successfully!");
    } catch (error) {
        console.error("Error inserting dummy data:", error);
    } finally {
        // Close the database connection
        await sequelize.close();
    }
};

// Run the seed function
seedMechanics();