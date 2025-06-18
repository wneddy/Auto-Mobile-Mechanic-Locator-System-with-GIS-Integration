document.querySelectorAll(".faq-question").forEach(button => {
    button.addEventListener("click", () => {
        const faqItem = button.parentElement;
        faqItem.classList.toggle("active");
    });
});
/*remove button for view cart page*/
function removeItem(button) {
    // Get the parent cart item element
    const cartItem = button.parentElement;
    
    // Remove the cart item from the DOM
    cartItem.remove();
    
    // Update the total amount
    updateTotal();
}

function updateTotal() {
    const cartItems = document.querySelectorAll('.cart-item');
    let total = 0;

    cartItems.forEach(item => {
        const priceText = item.querySelector('.item-price').textContent;
        const price = parseFloat(priceText.replace('$', ''));
        total += price;
    });

    document.getElementById('total-amount').textContent = total.toFixed(2);
}


// Show/hide payment details based on selected payment method
document.getElementById('payment-method').addEventListener('change', function() {
    const paymentDetails = document.querySelectorAll('.payment-details');
    paymentDetails.forEach(detail => detail.style.display = 'none'); // Hide all payment details

    const selectedMethod = this.value;
    if (selectedMethod) {
            document.getElementById(selectedMethod + '-info').style.display = 'block'; // Show selected payment details
    }
});
   