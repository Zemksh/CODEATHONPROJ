// Function to create and insert the confirmation modal
function createConfirmationModal(vendorUPI, timer, onProceed, onCancel) {
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
      document.body.removeChild(modal);
      onCancel();
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

// Listen for DOM content loaded to ensure we can find all elements
document.addEventListener('DOMContentLoaded', function() {
  // Find payment forms and buttons
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(event) {
      // Look for vendor UPI field
      const vendorUPIField = form.querySelector('#vendorUPI, [name="vendorUPI"], [name="upi"], [name="vpa"]');
      if (!vendorUPIField) return; // Skip if no UPI field is found
      
      const vendorUPI = vendorUPIField.value;
      if (!vendorUPI) return; // Skip if UPI field is empty
      
      // Check if this vendor is restricted
      chrome.runtime.sendMessage({ type: "getRestrictedVendors" }, (response) => {
        if (response && response.vendors && response.vendors.includes(vendorUPI)) {
          // Prevent the default form submission
          event.preventDefault();
          event.stopPropagation();
          
          // Get the timer for this vendor
          chrome.runtime.sendMessage({ type: "getVendorTimer", vendor: vendorUPI }, (response) => {
            if (!response || !response.timer) return;
            
            const timer = response.timer;
            
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
                
                // Submit the form to proceed with payment
                form.submit();
              },
              // onCancel callback
              function() {
                alert("Transaction cancelled!");
              }
            );
          });
        }
      });
    });
  });
  
  // Also look for standalone payment buttons
  const payButtons = document.querySelectorAll('#payButton, [data-action="pay"], .pay-button, button:contains("Pay")');
  payButtons.forEach(button => {
    // Only add listener if it's not inside a form we've already handled
    if (!button.closest('form')) {
      button.addEventListener('click', function(event) {
        // Try to find a nearby UPI field
        const container = button.closest('div, section');
        const vendorUPIField = container ? 
          container.querySelector('#vendorUPI, [name="vendorUPI"], [name="upi"], [name="vpa"]') : 
          document.querySelector('#vendorUPI, [name="vendorUPI"], [name="upi"], [name="vpa"]');
        
        if (!vendorUPIField) return;
        const vendorUPI = vendorUPIField.value;
        if (!vendorUPI) return;
        
        // Check if this vendor is restricted
        chrome.runtime.sendMessage({ type: "getRestrictedVendors" }, (response) => {
          if (response && response.vendors && response.vendors.includes(vendorUPI)) {
            // Prevent the default click behavior
            event.preventDefault();
            event.stopPropagation();
            
            // Get the timer for this vendor
            chrome.runtime.sendMessage({ type: "getVendorTimer", vendor: vendorUPI }, (response) => {
              if (!response || !response.timer) return;
              
              const timer = response.timer;
              
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
                  
                  // Trigger the original button click
                  const clickEvent = new MouseEvent('click', {
                    bubbles: false,  // Don't bubble to avoid infinite loop
                    cancelable: true,
                    view: window
                  });
                  button.dispatchEvent(clickEvent);
                },
                // onCancel callback
                function() {
                  alert("Transaction cancelled!");
                }
              );
            });
          }
        });
      }, true); // Use capture phase to intercept early
    }
  });
});

// For cases where the page is already loaded when our script runs
if (document.readyState === 'complete') {
  const event = new Event('DOMContentLoaded');
  document.dispatchEvent(event);
}