// Global variables// Global variables
if (typeof API_URL === 'undefined') {
    const API_URL = "http://localhost:5501/api"; // Base URL for API requests (empty for same domain)
}
let currentPage = 1
let totalPages = 1
const partsPerPage = 10
let currentSearchTerm = ""
let currentCategoryFilter = ""

// DOM elements
const partsTableBody = document.getElementById("partsTableBody")
const pagination = document.getElementById("pagination")
const searchInput = document.getElementById("searchInput")
const categoryFilter = document.getElementById("categoryFilter")
const searchBtn = document.getElementById("searchBtn")
const savePartBtn = document.getElementById("savePartBtn")
const updatePartBtn = document.getElementById("updatePartBtn")
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn")

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Admin spare parts page loaded")

  // Load auth handler script if not already loaded
  await loadAuthHandlerScript()

  // Initialize authentication
  const token = localStorage.getItem("token")
  if (!token) {
    console.error("No token found in localStorage")
    window.authHandler.redirectToLogin()
    return
  }

  // Load spare parts
  loadSpareParts()

  // Set up event listeners
  searchBtn.addEventListener("click", handleSearch)
  savePartBtn.addEventListener("click", handleAddPart)
  updatePartBtn.addEventListener("click", handleUpdatePart)
  confirmDeleteBtn.addEventListener("click", handleDeletePart)

  // File input preview for add modal
  document.getElementById("partImage").addEventListener("change", (e) => {
    previewImage(e.target, "imagePreview")
  })

  // File input preview for edit modal
  document.getElementById("editPartImage").addEventListener("change", (e) => {
    previewImage(e.target, "editImagePreview")
  })

  // Enter key for search
  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  })
})

// Load auth handler script
async function loadAuthHandlerScript() {
  return new Promise((resolve, reject) => {
    if (window.authHandler) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = "/public/javascripts/auth-handler.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load auth handler script"))
    document.head.appendChild(script)
  })
}

// Load spare parts with pagination, search, and filtering
async function loadSpareParts() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    // Build query parameters
    let queryParams = `?page=${currentPage}&limit=${partsPerPage}`
    if (currentSearchTerm) {
      queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`
    }
    if (currentCategoryFilter) {
      queryParams += `&category=${encodeURIComponent(currentCategoryFilter)}`
    }

    const response = await fetch(`${API_URL}/spare-parts${queryParams}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch spare parts")
    }

    const data = await response.json()
    renderPartsTable(data.parts)
    renderPagination(data.totalPages)
    totalPages = data.totalPages
  } catch (error) {
    console.error("Error loading spare parts:", error)
    alert("Failed to load spare parts. Please try again.")
  }
}

// Render parts table
function renderPartsTable(parts) {
  partsTableBody.innerHTML = ""

  if (parts.length === 0) {
    partsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No spare parts found</td>
            </tr>
        `
    return
  }

  parts.forEach((part) => {
    const stockStatus = getStockStatusBadge(part.quantity)

    partsTableBody.innerHTML += `
            <tr>
                <td>${part.id}</td>
                <td>
                    ${
                      part.imageUrl
                        ? `<img src="${part.imageUrl}" alt="${part.name}" class="table-img">`
                        : '<span class="badge badge-secondary">No Image</span>'
                    }
                </td>
                <td>${part.name}</td>
                <td>${part.category || "Uncategorized"}</td>
                <td>$${Number.parseFloat(part.price).toFixed(2)}</td>
                <td>
                    ${part.quantity} 
                    <span class="badge ${stockStatus.class}">${stockStatus.text}</span>
                </td>
                <td>${new Date(part.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-info action-btn" onclick="openEditModal(${part.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger action-btn" onclick="openDeleteModal(${part.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `
  })
}

// Get stock status badge
function getStockStatusBadge(quantity) {
  if (quantity <= 0) {
    return { class: "badge-out-of-stock", text: "Out of Stock" }
  } else if (quantity < 5) {
    return { class: "badge-low-stock", text: "Low Stock" }
  } else {
    return { class: "badge-in-stock", text: "In Stock" }
  }
}

// Render pagination
function renderPagination(totalPages) {
  pagination.innerHTML = ""

  // Previous button
  pagination.innerHTML += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
        </li>
    `

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    pagination.innerHTML += `
            <li class="page-item ${currentPage === i ? "active" : ""}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `
  }

  // Next button
  pagination.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
        </li>
    `
}

// Change page
window.changePage = (page) => {
  if (page < 1 || page > totalPages) {
    return
  }
  currentPage = page
  loadSpareParts()
}

// Handle search
function handleSearch() {
  currentSearchTerm = searchInput.value.trim()
  currentCategoryFilter = categoryFilter.value
  currentPage = 1 // Reset to first page
  loadSpareParts()
}

// Preview image
function previewImage(input, previewElementId) {
  const previewElement = document.getElementById(previewElementId)
  previewElement.innerHTML = ""

  if (input.files && input.files[0]) {
    const reader = new FileReader()

    reader.onload = (e) => {
      previewElement.innerHTML = `<img src="${e.target.result}" alt="Preview">`
    }

    reader.readAsDataURL(input.files[0])
  }
}

// Open edit modal
window.openEditModal = async (partId) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const response = await fetch(`${API_URL}/spare-parts/${partId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch part details")
    }

    const part = await response.json()

    // Populate form fields
    document.getElementById("editPartId").value = part.id
    document.getElementById("editPartName").value = part.name
    document.getElementById("editPartDescription").value = part.description || ""
    document.getElementById("editPartPrice").value = part.price
    document.getElementById("editPartQuantity").value = part.quantity
    document.getElementById("editPartCategory").value = part.category || ""

    // Show current image if exists
    const currentImagePreview = document.getElementById("currentImagePreview")
    if (part.imageUrl) {
      currentImagePreview.innerHTML = `
                <p>Current Image:</p>
                <img src="${part.imageUrl}" alt="${part.name}">
            `
    } else {
      currentImagePreview.innerHTML = "<p>No current image</p>"
    }

    // Clear new image preview
    document.getElementById("editImagePreview").innerHTML = ""

    // Show modal
    $("#editPartModal").modal("show")
  } catch (error) {
    console.error("Error fetching part details:", error)
    alert("Failed to load part details")
  }
}

// Open delete confirmation modal
window.openDeleteModal = (partId) => {
  document.getElementById("deletePartId").value = partId
  $("#deleteConfirmModal").modal("show")
}

// Handle add part
async function handleAddPart() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const form = document.getElementById("addPartForm")
    const formData = new FormData(form)

    // Remove adminId from formData if it exists
    formData.delete("adminId")

    // The server will determine the adminId based on the authenticated user

    const response = await fetch(`${API_URL}/spare-parts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to add spare part")
    }

    // Reset form and close modal
    form.reset()
    document.getElementById("imagePreview").innerHTML = ""
    $("#addPartModal").modal("hide")

    // Reload parts
    loadSpareParts()
    alert("Spare part added successfully")
  } catch (error) {
    console.error("Error adding spare part:", error)
    alert("Failed to add spare part: " + error.message)
  }
}

// Handle update part
async function handleUpdatePart() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const form = document.getElementById("editPartForm")
    const formData = new FormData(form)
    const partId = document.getElementById("editPartId").value

    const response = await fetch(`${API_URL}/spare-parts/${partId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to update spare part")
    }

    // Close modal
    $("#editPartModal").modal("hide")

    // Reload parts
    loadSpareParts()
    alert("Spare part updated successfully")
  } catch (error) {
    console.error("Error updating spare part:", error)
    alert("Failed to update spare part")
  }
}

// Handle delete part
async function handleDeletePart() {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No token found in localStorage")
    }

    const partId = document.getElementById("deletePartId").value

    const response = await fetch(`${API_URL}/spare-parts/${partId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to delete spare part")
    }

    // Close modal
    $("#deleteConfirmModal").modal("hide")

    // Reload parts
    loadSpareParts()
    alert("Spare part deleted successfully")
  } catch (error) {
    console.error("Error deleting spare part:", error)
    alert("Failed to delete spare part")
  }
}

// Import jQuery
const script = document.createElement("script")
script.src = "https://code.jquery.com/jquery-3.6.0.min.js"
script.onload = () => {
  // jQuery is now loaded, you can use $
  console.log("jQuery has been loaded")
  window.jQuery = jQuery
  window.$ = jQuery

  // Now that jQuery is loaded, initialize any components that depend on it.
  // Ensure that jQuery is fully loaded before using it
  $(document).ready(() => {
    console.log("jQuery is ready!")
  })
}
document.head.appendChild(script)



