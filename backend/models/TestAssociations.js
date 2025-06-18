const { User, VehicleOwnerPersonalProfile, ServiceHistory, VehicleDetails } = require("./index");
const testAssociations = async () => {
    try {
        const user = await User.findOne({
            where: { email: "wnedward23@gmail.com" },
            include: [
                { model: VehicleOwnerPersonalProfile, as: "vehicleOwnerProfile", include: [
                    { model: ServiceHistory, as: "serviceHistories" },
                    { model: VehicleDetails, as: "vehicleDetails" }
                ]}
            ]
        });

        console.log(JSON.stringify(user, null, 2));
    } catch (error) {
        console.error("❌ Error fetching associations:", error);
    }
};

testAssociations();
