// reporting.js
function logError(error) {
    console.error("An error occurred:", error);
}

// Global error handler for uncaught errors
window.onerror = function(message, source, lineno, colno, error) {
    logError({
        message: message,
        source: source,
        lineno: lineno,
        colno: colno,
        error: error
    });
};

// Global unhandled promise rejection handler
window.onunhandledrejection = function(event) {
    logError({
        message: "Unhandled promise rejection",
        reason: event.reason
    });
};

// Example of an event handler with error logging
document.addEventListener('mousedown', function(event) {
    try {
        getContextHTML(event);
    } catch (error) {
        logError({
            message: "Error in mousedown handler",
            event: event,
            error: error
        });
    }
});

function getContextHTML(event) {
    let target = event.target;

    // Log the target for debugging
    console.log("Event target:", target);

    // Ensure the event target is valid
    if (!target || !(target instanceof HTMLElement)) {
        throw new Error("Invalid target element");
    }
    try {
        // Check if target has a parent before accessing parent properties
        if (target.parentElement) {
            let contextHTML = target.innerHTML;
            console.log("Context HTML:", contextHTML);
        } else {
            throw new Error("Target has no parent element");
        }
    } catch (error) {
        // Log the error if something goes wrong
        logError({
            message: "Error while getting context HTML",
            event: event,
            error: error
        });
    }

    // Example of a loop that might need correction
    let elements = document.querySelectorAll('.some-class'); 
    for (let i = 0; i < elements.length; i++) {
        // Ensure that the element exists before accessing it
        if (elements[i]) {
            console.log("Element:", elements[i].innerHTML);
        }
    }

    // Example of refactoring indexOf calls
    let someArray = ['item1', 'item2', 'item3'];
    let itemToFind = 'item2';
    let index = someArray.indexOf(itemToFind);

    if (index !== -1) {
        console.log(`Found ${itemToFind} at index ${index}`);
    } else {
        console.log(`${itemToFind} not found in the array`);
    }
}
