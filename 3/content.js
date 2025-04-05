// Function to create and insert the confirmation modal
function createConfirmationModal(vendorUPI, timer, onProceed, onCancel) {
  // Check if modal already exists and remove it
  const existingModal = document.getElementById('budget-buddy-modal');
  if (existingModal) {
    document.body.removeChild(existingModal);
  }
  
  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'budget-buddy-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
  modal.style.zIndex = '10000';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.padding = '20px';
  modalContent.style.borderRadius = '5px';
  modalContent.style.maxWidth = '400px';
  modalContent.style.width = '80%';
  
  // Add heading
  const heading = document.createElement('h2');
  heading.textContent = 'Restricted Transaction Alert';
  heading.style.color = '#d9534f';
  heading.style.margin = '0 0 15px 0';
  
  // Add message
  const message = document.createElement('p');
  message.innerHTML = `Transaction to <strong>${vendorUPI}</strong> has been restricted!`;
  
  // Add timer display
  const timerDisplay = document.createElement('div');
  timerDisplay.id = 'timer-display';
  timerDisplay.style.fontSize = '24px';
  timerDisplay.style.fontWeight = 'bold';
  timerDisplay.style.textAlign = 'center';
  timerDisplay.style.margin = '15px 0';
  timerDisplay.textContent = `${timer} seconds`;
  
  // Add button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'space-between';
  buttonContainer.style.marginTop = '20px';
  
  // Add cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel Transaction';
  cancelButton.style.padding = '10px 15px';
  cancelButton.style.backgroundColor = '#d9534f';
  cancelButton.style.color = 'white';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.cursor = 'pointer';
  cancelButton.style.width = '48%';
  
  // Add proceed button
  const proceedButton = document.createElement('button');
  proceedButton.textContent = 'Proceed Anyway';
  proceedButton.style.padding = '10px 15px';
  proceedButton.style.backgroundColor = '#5cb85c';
  proceedButton.style.color = 'white';
  proceedButton.style.border = 'none';
  proceedButton.style.borderRadius = '4px';
  proceedButton.style.cursor = 'pointer';
  proceedButton.style.width = '48%';
  
  // Assemble modal
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(proceedButton);
  modalContent.appendChild(heading);
  modalContent.appendChild(message);
  modalContent.appendChild(timerDisplay);
  modalContent.appendChild(buttonContainer);
  modal.appendChild(modalContent);
  
  // Add to body
  document.body.appendChild(modal);
  
  // Set up countdown
  let countdown = timer;
  const interval = setInterval(() => {
    countdown--;
    timerDisplay.textContent = `${countdown} seconds`;
    if (countdown <= 0) {
      clearInterval(interval);
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
        onCancel();
      }
    }
  }, 1000);
  
  // Button event listeners
  cancelButton.addEventListener('click', function() {
    clearInterval(interval);
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
    onCancel();
  });
  
  proceedButton.addEventListener('click', function() {
    clearInterval(interval);
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
    onProceed();
  });
  
  return modal;
}

// Function to show success notification
function showSuccessNotification(vendorUPI) {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#5cb85c';
  notification.style.color = 'white';
  notification.style.padding = '15px';
  notification.style.borderRadius = '5px';
  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  notification.style.zIndex = '10001';
  notification.style.minWidth = '250px';
  notification.style.textAlign = 'center';
  
  const title = document.createElement('div');
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '5px';
  title.textContent = 'Payment Processed';
  
  const message = document.createElement('div');
  message.textContent = `Transaction to ${vendorUPI} completed successfully.`;
  
  notification.appendChild(title);
  notification.appendChild(message);
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 3000);
}

// Function to check if a vendor is restricted and show modal if needed
function checkAndHandleRestrictedVendor(vendorUPI, onProceed, onCancel) {
  if (!vendorUPI) return false;
  
  chrome.runtime.sendMessage({ type: "getRestrictedVendors" }, (response) => {
    console.log("Checking restricted vendors for:", vendorUPI, response);
    
    if (response && response.vendors && response.vendors.includes(vendorUPI)) {
      // Get the timer for this vendor
      chrome.runtime.sendMessage({ type: "getVendorTimer", vendor: vendorUPI }, (response) => {
        if (!response || !response.timer) return;
        
        const timer = response.timer;
        console.log("Creating modal for vendor:", vendorUPI, "with timer:", timer);
        
        // Create confirmation modal
        createConfirmationModal(
          vendorUPI, 
          timer,
          // onProceed callback
          function() {
            // Increment vendor timer for future transactions
            chrome.runtime.sendMessage({ 
              type: "incrementVendorTimer", 
              vendor: vendorUPI 
            });
            
            // Show success notification
            showSuccessNotification(vendorUPI);
            
            // Proceed with action
            onProceed();
          },
          // onCancel callback
          function() {
            alert("Transaction cancelled!");
            onCancel();
          }
        );
      });
      return true;
    }
    return false;
  });
}

// Utility function to find UPI fields
function findUPIField(container) {
  // Extended selector list to catch more UPI field variations
  const selectors = [
    '#vendorUPI', 
    '[name="vendorUPI"]', 
    '[name="upi"]', 
    '[name="vpa"]',
    '[id*="upi"]',
    '[name*="upi"]',
    '[id*="vpa"]',
    '[name*="vpa"]',
    'input[placeholder*="UPI"]',
    'input[placeholder*="VPA"]'
  ];
  
  let field = null;
  
  // Try each selector
  for (const selector of selectors) {
    field = container.querySelector(selector);
    if (field) break;
  }
  
  return field;
}

// Handle form submissions (both on load and dynamically added)
function attachFormHandlers() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    // Skip if we've already attached a handler
    if (form.dataset.budgetBuddyHandled) return;
    
    form.dataset.budgetBuddyHandled = 'true';
    form.addEventListener('submit', function(event) {
      // Look for vendor UPI field
      const vendorUPIField = findUPIField(form);
      if (!vendorUPIField) return; // Skip if no UPI field is found
      
      const vendorUPI = vendorUPIField.value;
      if (!vendorUPI) return; // Skip if UPI field is empty
      
      console.log("Form submit detected with UPI:", vendorUPI);
      
      // Prevent default action until we check if this is restricted
      event.preventDefault();
      event.stopPropagation();
      
      // Check if vendor is restricted
      checkAndHandleRestrictedVendor(
        vendorUPI,
        // onProceed
        () => {
          console.log("Proceeding with form submission");
          // Remove our handler temporarily to allow submission
          const originalSubmit = form.onsubmit;
          form.onsubmit = null;
          // Submit the form
          setTimeout(() => {
            form.submit();
            // Restore handler
            setTimeout(() => { form.onsubmit = originalSubmit; }, 100);
          }, 100);
        },
        // onCancel
        () => {
          console.log("Form submission cancelled");
        }
      );
    }, true); // Use capture phase
  });
}

// Handle payment buttons (both on load and dynamically added)
function attachButtonHandlers() {
  // Extended selector list for payment buttons
  const buttonSelectors = [
    '#payButton', 
    '[data-action="pay"]', 
    '.pay-button', 
    'button:contains("Pay")',
    'button[id*="pay"]',
    'button[class*="pay"]',
    'button[id*="checkout"]',
    'button[class*="checkout"]',
    'input[type="submit"][value*="Pay"]',
    'a[href*="payment"]'
  ];
  
  // Try each selector
  for (const selector of buttonSelectors) {
    try {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        // Skip if we've already attached a handler
        if (button.dataset.budgetBuddyHandled) return;
        
        button.dataset.budgetBuddyHandled = 'true';
        button.addEventListener('click', function(event) {
          // Find the closest container that might have a UPI field
          const container = button.closest('div, section, form') || document;
          const vendorUPIField = findUPIField(container);
          
          if (!vendorUPIField) return; // No UPI field found
          
          const vendorUPI = vendorUPIField.value;
          if (!vendorUPI) return; // UPI field is empty
          
          console.log("Payment button click detected with UPI:", vendorUPI);
          
          // Prevent the default click behavior
          event.preventDefault();
          event.stopPropagation();
          
          // Check if vendor is restricted
          checkAndHandleRestrictedVendor(
            vendorUPI,
            // onProceed
            () => {
              console.log("Proceeding with button click");
              // Simulate a clean click on the button
              const clickEvent = new MouseEvent('click', {
                bubbles: false,  // Don't bubble to avoid infinite loop
                cancelable: true,
                view: window
              });
              setTimeout(() => {
                button.dataset.budgetBuddyProcessed = 'true';
                button.dispatchEvent(clickEvent);
              }, 100);
            },
            // onCancel
            () => {
              console.log("Button click cancelled");
            }
          );
        }, true); // Use capture phase
      });
    } catch (error) {
      console.log("Error with selector:", selector, error);
    }
  }
}

// Function to handle MutationObserver to watch for dynamically added elements
function setupDynamicElementObserver() {
  // Create a MutationObserver to watch for dynamically added payment forms/buttons
  const observer = new MutationObserver((mutations) => {
    let shouldReattach = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldReattach = true;
      }
    });
    
    if (shouldReattach) {
      attachFormHandlers();
      attachButtonHandlers();
    }
  });
  
  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize everything when DOM is loaded
function initializeBudgetBuddy() {
  console.log("BudgetBuddy: Initializing on page");
  
  // Attach handlers to existing elements
  attachFormHandlers();
  attachButtonHandlers();
  
  // Set up observer for dynamically added elements
  setupDynamicElementObserver();
  
  // Add test button for debugging (remove in production)
  appendTestButton();
}

// Add a test button to manually trigger the modal (for debugging)
function appendTestButton() {
  const testButton = document.createElement('button');
  testButton.textContent = 'Test BudgetBuddy Modal';
  testButton.style.position = 'fixed';
  testButton.style.bottom = '10px';
  testButton.style.right = '10px';
  testButton.style.zIndex = '9999';
  testButton.style.padding = '10px';
  testButton.style.backgroundColor = '#007BFF';
  testButton.style.color = 'white';
  testButton.style.border = 'none';
  testButton.style.borderRadius = '4px';
  
  testButton.addEventListener('click', () => {
    // For testing, use a dummy UPI
    const testVendor = 'test@upi';
    createConfirmationModal(
      testVendor,
      30,
      () => {
        console.log('Test proceed clicked');
        showSuccessNotification(testVendor);
      },
      () => console.log('Test cancel clicked')
    );
  });
  
  document.body.appendChild(testButton);
}

// Run initialization when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBudgetBuddy);
} else {
  // DOM already loaded, run immediately
  initializeBudgetBuddy();
}