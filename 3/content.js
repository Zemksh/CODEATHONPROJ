// Payment Timer Extension - Content Script with improved debugging
console.log("Payment Timer Extension content script loaded");

// Default configuration (fallback if storage access fails)
const DEFAULT_CONFIG = {
  restrictedVendors: ["amazon", "flipkart", "shopping", "checkout", "pay", "upi"],
  waitTime: 15
};

// Track if we're on a payment page
let isPaymentPage = false;
let config = DEFAULT_CONFIG;

// Load configuration from storage
function loadConfiguration() {
  try {
    chrome.storage.local.get(['restrictedVendors', 'waitTime'], function(data) {
      if (data.restrictedVendors) {
        config.restrictedVendors = data.restrictedVendors;
        console.log("Loaded restricted vendors:", config.restrictedVendors);
      }
      
      if (data.waitTime) {
        config.waitTime = data.waitTime;
        console.log("Loaded wait time:", config.waitTime);
      }
      
      // After loading config, scan the page
      scanPage();
    });
  } catch (error) {
    console.error("Failed to load configuration, using defaults:", error);
    scanPage();
  }
}

// Scan the page for payment indicators
function scanPage() {
  // Check if the URL suggests a payment page
  const url = window.location.href.toLowerCase();
  const urlIndicators = ['checkout', 'payment', 'pay', 'cart', 'order'];
  
  if (urlIndicators.some(indicator => url.includes(indicator))) {
    console.log("URL suggests payment page");
    isPaymentPage = true;
  }
  
  // Check page content for payment indicators
  const pageContent = document.body.innerText.toLowerCase();
  const contentIndicators = ['payment', 'credit card', 'debit card', 'checkout', 'pay now', 'upi'];
  
  if (contentIndicators.some(indicator => pageContent.includes(indicator))) {
    console.log("Page content suggests payment functionality");
    isPaymentPage = true;
  }
  
  // Check for vendor restrictions
  const currentDomain = window.location.hostname.toLowerCase();
  console.log("Current domain:", currentDomain);
  
  // Look for UPI IDs on the page
  const upiElements = document.querySelectorAll("[id*='upi'], [name*='upi'], [id*='vpa'], [name*='vpa']");
  if (upiElements.length > 0) {
    console.log("Found potential UPI elements:", upiElements.length);
    isPaymentPage = true;
  }
  
  // After scanning, find and attach to payment buttons
  findPaymentButtons();
}

// Find payment buttons - more aggressive version
function findPaymentButtons() {
  console.log("Searching for payment buttons...");
  
  // Common payment button selectors - expanded list
  const buttonSelectors = [
    "#payButton", 
    "button[type='submit']",
    "input[type='submit']",
    ".payment-button",
    ".pay-button",
    "[aria-label*='pay']",
    "[data-testid*='pay']",
    "button:contains('Pay')",
    "button:contains('Checkout')",
    "button:contains('Buy')",
    "a:contains('Pay')",
    "a:contains('Checkout')",
    "a:contains('Buy')",
    "form button",
    "form input[type='submit']"
  ];
  
  // Create a combined selector
  const combinedSelector = buttonSelectors.join(", ");
  
  try {
    // First try querySelector with combined selector
    const buttons = document.querySelectorAll(combinedSelector);
    console.log(`Found ${buttons.length} potential payment buttons with combined selector`);
    
    buttons.forEach((button, index) => {
      console.log(`Button ${index + 1}:`, button.outerHTML);
      attachClickListener(button);
    });
  } catch (error) {
    console.error("Error with combined selector:", error);
  }
  
  // Fallback: Find ALL buttons and links on the page
  console.log("Checking all buttons and links on page...");
  document.querySelectorAll("button, input[type='submit'], a").forEach(element => {
    const text = (element.textContent || element.value || "").toLowerCase();
    const id = (element.id || "").toLowerCase();
    const classes = Array.from(element.classList).join(" ").toLowerCase();
    
    // Check if this element looks payment-related
    if (text.includes("pay") || 
        text.includes("checkout") ||
        text.includes("buy") ||
        text.includes("order") ||
        id.includes("pay") ||
        id.includes("checkout") ||
        id.includes("buy") ||
        id.includes("order") ||
        classes.includes("pay") ||
        classes.includes("checkout") ||
        element.type === "submit" && isPaymentPage) {
      
      console.log("Found potential payment element:", element.outerHTML);
      attachClickListener(element);
    }
  });
  
  // Special case for forms
  document.querySelectorAll("form").forEach(form => {
    console.log("Adding submit listener to form:", form);
    form.addEventListener("submit", handleFormSubmit, true);
  });
}

// Handle form submissions
function handleFormSubmit(event) {
  console.log("Form submit intercepted", event);
  
  // Check if this form is likely for payments
  const formHtml = event.target.outerHTML.toLowerCase();
  const paymentIndicators = ['payment', 'checkout', 'pay', 'order', 'buy', 'credit', 'debit', 'upi'];
  
  if (paymentIndicators.some(indicator => formHtml.includes(indicator))) {
    console.log("Payment form detected!");
    
    // Get current domain
    const currentVendor = window.location.hostname.toLowerCase();
    
    // Look for UPI field
    const upiField = event.target.querySelector("[id*='upi'], [name*='upi'], [id*='vpa'], [name*='vpa']");
    let vendorId = currentVendor;
    
    if (upiField && upiField.value) {
      vendorId = upiField.value.toLowerCase();
      console.log("Found UPI ID:", vendorId);
    }
    
    // Check if vendor is restricted - directly check against our default config
    if (shouldDelayPayment(vendorId, currentVendor)) {
      console.log("Payment should be delayed!");
      event.preventDefault();
      event.stopPropagation();
      
      // Show timer
      showTimerOverlay(config.waitTime, vendorId, event.target);
      return false;
    }
  }
}

// Attach click listener to potential payment element
function attachClickListener(element) {
  // Remove any existing listeners
  element.removeEventListener("click", handleButtonClick);
  
  // Add new listener - use capture phase to intercept early
  element.addEventListener("click", handleButtonClick, true);
  console.log("Attached click listener to:", element);
}

// Handle button clicks
function handleButtonClick(event) {
  console.log("Button click intercepted:", event.target);
  
  const currentVendor = window.location.hostname.toLowerCase();
  
  // Try to find UPI ID
  const upiField = document.querySelector("#vendorUPI, [id*='upi'], [name*='upi'], [id*='vpa'], [name*='vpa']");
  let vendorId = currentVendor;
  
  if (upiField && upiField.value) {
    vendorId = upiField.value.toLowerCase();
    console.log("Found UPI ID:", vendorId);
  }
  
  // Check if vendor is restricted
  if (shouldDelayPayment(vendorId, currentVendor)) {
    console.log("Payment should be delayed!");
    event.preventDefault();
    event.stopPropagation();
    
    // Show timer
    showTimerOverlay(config.waitTime, vendorId, event.target);
    return false;
  } else {
    console.log("Payment not restricted for vendor:", vendorId);
  }
}

// Check if payment should be delayed
function shouldDelayPayment(vendorId, domain) {
  // First check the vendor ID against restricted list
  if (config.restrictedVendors.some(restrictedVendor => 
      vendorId.includes(restrictedVendor) || restrictedVendor.includes(vendorId))) {
    return true;
  }
  
  // Then check domain against restricted list
  if (config.restrictedVendors.some(restrictedVendor => 
      domain.includes(restrictedVendor) || restrictedVendor.includes(domain))) {
    return true;
  }
  
  // For test page - always delay payments on local files
  if (window.location.protocol === 'file:') {
    console.log("Test page detected - enforcing delay");
    return true;
  }
  
  return false;
}

// Show timer overlay - simplified version
function showTimerOverlay(seconds, vendor, originalElement) {
  console.log(`Showing ${seconds} second timer for ${vendor}`);
  
  // Create overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 9999999;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: Arial, sans-serif;
  `;
  
  // Create timer container
  const container = document.createElement("div");
  container.style.cssText = `
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    max-width: 400px;
    width: 80%;
  `;
  
  // Add title
  const title = document.createElement("h2");
  title.textContent = "Payment Cooling Period";
  title.style.margin = "0 0 15px 0";
  
  // Add timer display
  const timerDisplay = document.createElement("div");
  timerDisplay.style.cssText = `
    font-size: 3rem;
    font-weight: bold;
    margin: 15px 0;
    color: #e74c3c;
  `;
  timerDisplay.textContent = seconds;
  
  // Add message
  const message = document.createElement("p");
  message.textContent = `Please wait ${seconds} seconds before proceeding with this payment.`;
  
  // Add buttons
  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
  `;
  
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  cancelButton.style.cssText = `
    padding: 8px 16px;
    background-color: #e74c3c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  const continueButton = document.createElement("button");
  continueButton.textContent = "Continue";
  continueButton.style.cssText = `
    padding: 8px 16px;
    background-color: #ccc;
    color: #666;
    border: none;
    border-radius: 4px;
    cursor: not-allowed;
  `;
  
  // Add elements to DOM
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(continueButton);
  
  container.appendChild(title);
  container.appendChild(message);
  container.appendChild(timerDisplay);
  container.appendChild(buttonContainer);
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // Timer logic
  let timeLeft = seconds;
  const countdown = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(countdown);
      continueButton.style.backgroundColor = "#2ecc71";
      continueButton.style.color = "white";
      continueButton.style.cursor = "pointer";
    }
  }, 1000);
  
  // Button handlers
  cancelButton.addEventListener("click", () => {
    clearInterval(countdown);
    document.body.removeChild(overlay);
    console.log("Payment cancelled");
  });
  
  continueButton.addEventListener("click", () => {
    if (timeLeft <= 0) {
      clearInterval(countdown);
      document.body.removeChild(overlay);
      console.log("Payment proceeding after wait period");
      
      // Try to trigger the original payment
      try {
        if (originalElement.tagName === 'FORM') {
          console.log("Submitting original form");
          originalElement.submit();
        } else {
          console.log("Clicking original element");
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          originalElement.dispatchEvent(clickEvent);
        }
      } catch (error) {
        console.error("Error triggering original action:", error);
        alert("You can now proceed with your payment.");
      }
    }
  });
}

// Set up mutation observer for dynamically added buttons
function setupObserver() {
  const observer = new MutationObserver(mutations => {
    let shouldRescan = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        shouldRescan = true;
      }
    });
    
    if (shouldRescan) {
      console.log("DOM changed, rescanning for payment buttons");
      findPaymentButtons();
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log("Mutation observer set up");
}

// Initialize extension
function initialize() {
  console.log("Initializing Payment Timer Extension");
  loadConfiguration();
  setupObserver();
}

// Start the extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

// Force scan after a short delay to catch late-loading elements
setTimeout(findPaymentButtons, 2000);
setTimeout(findPaymentButtons, 5000);