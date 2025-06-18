// Test Database Connection Route
router.get('/test-db', async (req, res) => {
    try {
        // Attempt to fetch a user (or any simple query)
        const users = await User.findAll(); // This assumes you have a User model defined
        res.status(200).json({ message: "Database connection is working!", users });
    } catch (error) {
        console.error("Database connection error:", error);
        res.status(500).json({ message: "Database connection failed.", error: error.message });
    }
});