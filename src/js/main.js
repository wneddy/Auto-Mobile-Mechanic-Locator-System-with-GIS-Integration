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
        const userId = 1; 
        const user = await fetchUser (userId); 
        console.log('User  data:', user); 
    } catch (error) {
        logError(error); 
    }

    // Fetch counties and populate the county dropdown
    try {
        const response = await fetch('/counties.json'); 
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        const data = await response.json();
        const countySelect = document.getElementById('county');
        data.forEach(county => {
            const option = document.createElement('option');
            option.value = county.code; 
            option.textContent = county.name; 
            countySelect.appendChild(option);
        });
    } catch (error) {
        logError('Error fetching counties: ' + error); 
    }

    // Fetch sub-counties based on selected county
    document.getElementById('county').addEventListener('change', function () {
        const selectedCountyCode = this.value; 
        const selectedCounty = data.find(county => county.code == selectedCountyCode); 

        const subCountySelect = document.getElementById('sub-county');
        subCountySelect.innerHTML = '<option value="" disabled selected>Select your sub-county</option>'; 

        if (selectedCounty) {
            selectedCounty.sub_counties.forEach(subCounty => {
                const option = document.createElement('option');
                option.value = subCounty; 
                option.textContent = subCounty; 
                subCountySelect.appendChild(option);
            });
        }
    });
}

main();
