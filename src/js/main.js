// Function to log errors
function logError(error) {
    console.error('An error occurred:', error);
}

// Function to fetch user data by ID
async function fetchUser (userId) {
    try {
        const response = await fetch(`/api/user/${userId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        logError('Error fetching user: ' + error);
    }
}

// Main function to execute the script
async function main() {
    try {
        const userId = 1; // Replace with the actual user ID you want to fetch
        const user = await fetchUser (userId); // Correctly calling fetchUser  with a valid user ID
        console.log('User  data:', user); // Log the user data
    } catch (error) {
        logError(error); // Log the error if it occurs
    }

    // Fetch counties and populate the county dropdown
    try {
        const response = await fetch('/counties.json'); // Ensure this path is correct
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        const data = await response.json();
        const countySelect = document.getElementById('county');
        data.forEach(county => {
            const option = document.createElement('option');
            option.value = county.code; // Use the county code as the value
            option.textContent = county.name; // Use the county name as the display text
            countySelect.appendChild(option);
        });
    } catch (error) {
        logError('Error fetching counties: ' + error); // Log the error if it occurs
    }

    // Fetch sub-counties based on selected county
    document.getElementById('county').addEventListener('change', function () {
        const selectedCountyCode = this.value; // Get the selected county code
        const selectedCounty = data.find(county => county.code == selectedCountyCode); // Find the selected county object

        const subCountySelect = document.getElementById('sub-county');
        subCountySelect.innerHTML = '<option value="" disabled selected>Select your sub-county</option>'; // Reset sub-county options

        if (selectedCounty) {
            selectedCounty.sub_counties.forEach(subCounty => {
                const option = document.createElement('option');
                option.value = subCounty; // Use the sub-county name as the value
                option.textContent = subCounty; // Use the sub-county name as the display text
                subCountySelect.appendChild(option);
            });
        }
    });
}

// Call the main function
main();