// Global variables to store state
let restrictedVendors = [];
let vendorTimers = {};

// Function to parse CSV content
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    const vendorName = lines[i].trim();
    result.push(vendorName);
  }
  
  return result;
}

// Load vendors from CSV file
function loadVendorsFromCSV() {
  console.log("BudgetBuddy: Loading vendors from CSV file");
  
  fetch(chrome.runtime.getURL('blocked_vendors.csv'))
    .then(response => response.text())
    .then(csvContent => {
      const vendors = parseCSV(csvContent);
      console.log("BudgetBuddy: Loaded vendors from CSV:", vendors);
      
      // Merge with existing vendors (avoid duplicates)
      vendors.forEach(vendor => {
        if (!restrictedVendors.includes(vendor)) {
          restrictedVendors.push(vendor);
        }
      });
      
      // Save the updated list to storage
      saveToStorage("restrictedVendors", restrictedVendors);
    })
    .catch(error => {
      console.error("BudgetBuddy: Error loading CSV file:", error);
    });
}

// Initialize data from storage
function initializeFromStorage() {
  console.log("BudgetBuddy: Initializing from storage");
  
  try {
    // Check if storage API is available
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["restrictedVendors", "vendorTimers"], function(result) {
        if (chrome.runtime.lastError) {
          console.error("BudgetBuddy: Storage error:", chrome.runtime.lastError);
          return;
        }
        
        if (result.restrictedVendors) {
          restrictedVendors = result.restrictedVendors;
        }
        if (result.vendorTimers) {
          vendorTimers = result.vendorTimers;
        }
        console.log("BudgetBuddy initialized with:", { 
          restrictedVendors, 
          vendorTimers 
        });
        
        // After loading from storage, also load from CSV
        loadVendorsFromCSV();
      });
    } else {
      console.warn("BudgetBuddy: Storage API not available, using in-memory storage only");
      // Still try to load from CSV
      loadVendorsFromCSV();
    }
  } catch (err) {
    console.error("BudgetBuddy: Error initializing storage:", err);
  }
}

// Run when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("BudgetBuddy: Extension installed or updated");
  initializeFromStorage();
});

// Run when extension is started
initializeFromStorage();

// Helper function to save to storage safely
function saveToStorage(key, data) {
  try {
    if (chrome.storage && chrome.storage.local) {
      const saveObj = {};
      saveObj[key] = data;
      chrome.storage.local.set(saveObj, function() {
        if (chrome.runtime.lastError) {
          console.error("BudgetBuddy: Error saving to storage:", chrome.runtime.lastError);
        } else {
          console.log("BudgetBuddy: Saved to storage:", key, data);
        }
      });
    }
  } catch (err) {
    console.error("BudgetBuddy: Error saving to storage:", err);
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("BudgetBuddy: Message received:", message);
  
  try {
    switch(message.type) {
      case "getRestrictedVendors":
        console.log("BudgetBuddy: Sending vendors:", restrictedVendors);
        sendResponse({ vendors: restrictedVendors });
        break;
        
      case "addVendor":
        if (message.vendor && !restrictedVendors.includes(message.vendor)) {
          restrictedVendors.push(message.vendor);
          saveToStorage("restrictedVendors", restrictedVendors);
          console.log("BudgetBuddy: Vendor added:", message.vendor);
        }
        sendResponse({ success: true, vendors: restrictedVendors });
        break;
        
      case "removeVendor":
        if (message.vendor) {
          restrictedVendors = restrictedVendors.filter(vendor => vendor !== message.vendor);
          saveToStorage("restrictedVendors", restrictedVendors);
          console.log("BudgetBuddy: Vendor removed:", message.vendor);
        }
        sendResponse({ success: true, vendors: restrictedVendors });
        break;
        
      case "clearVendors":
        restrictedVendors = [];
        saveToStorage("restrictedVendors", []);
        console.log("BudgetBuddy: All vendors cleared");
        sendResponse({ success: true, vendors: [] });
        break;
        
      case "getVendorTimer":
        const timer = message.vendor && vendorTimers[message.vendor] ? 
          vendorTimers[message.vendor] : 1; // default to 30 seconds
        console.log("BudgetBuddy: Timer for vendor:", message.vendor, timer);
        sendResponse({ timer: timer });
        break;
        
      case "incrementVendorTimer":
        if (message.vendor) {
          if (vendorTimers[message.vendor]) {
            vendorTimers[message.vendor] += 1;
          } else {
            vendorTimers[message.vendor] = 1; // Start with 60 seconds
          }
          saveToStorage("vendorTimers", vendorTimers);
          console.log("BudgetBuddy: Timer incremented for vendor:", message.vendor, vendorTimers[message.vendor]);
          sendResponse({ success: true, newTimer: vendorTimers[message.vendor] });
        } else {
          sendResponse({ success: false, error: "No vendor specified" });
        }
        break;
        
      case "reloadVendorsFromCSV":
        loadVendorsFromCSV();
        sendResponse({ success: true });
        break;
        
      default:
        console.log("BudgetBuddy: Unknown message type:", message.type);
        sendResponse({ success: false, error: "Unknown message type" });
    }
  } catch (err) {
    console.error("BudgetBuddy: Error processing message:", err);
    sendResponse({ success: false, error: err.message });
  }
  
  // Return true to indicate you wish to send a response asynchronously
  return true;
});

// Log when background script is loaded
console.log("BudgetBuddy: Background script loaded");