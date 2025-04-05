let restrictedVendors = [];
let vendorTimers = {};

// Initialize data from storage
function initializeFromStorage() {
  chrome.storage.sync.get(["restrictedVendors", "vendorTimers"], function(result) {
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
  });
}

// Run when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  initializeFromStorage();
});

// Run when extension is started
initializeFromStorage();

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);
  
  switch(message.type) {
    case "getRestrictedVendors":
      sendResponse({ vendors: restrictedVendors });
      break;
      
    case "addVendor":
      if (message.vendor && !restrictedVendors.includes(message.vendor)) {
        restrictedVendors.push(message.vendor);
        chrome.storage.sync.set({ restrictedVendors: restrictedVendors });
        console.log("Vendor added:", message.vendor);
      }
      sendResponse({ success: true, vendors: restrictedVendors });
      break;
      
    case "removeVendor":
      if (message.vendor) {
        restrictedVendors = restrictedVendors.filter(vendor => vendor !== message.vendor);
        chrome.storage.sync.set({ restrictedVendors: restrictedVendors });
        console.log("Vendor removed:", message.vendor);
      }
      sendResponse({ success: true, vendors: restrictedVendors });
      break;
      
    case "clearVendors":
      restrictedVendors = [];
      chrome.storage.sync.set({ restrictedVendors: [] });
      console.log("All vendors cleared");
      sendResponse({ success: true, vendors: [] });
      break;
      
    case "getVendorTimer":
      const timer = message.vendor && vendorTimers[message.vendor] ? 
        vendorTimers[message.vendor] : 30; // default to 30 seconds
      console.log("Timer for vendor:", message.vendor, timer);
      sendResponse({ timer: timer });
      break;
      
    case "incrementVendorTimer":
      if (message.vendor) {
        if (vendorTimers[message.vendor]) {
          vendorTimers[message.vendor] += 30;
        } else {
          vendorTimers[message.vendor] = 60; // Start with 60 seconds
        }
        chrome.storage.sync.set({ vendorTimers: vendorTimers });
        console.log("Timer incremented for vendor:", message.vendor, vendorTimers[message.vendor]);
        sendResponse({ success: true, newTimer: vendorTimers[message.vendor] });
      } else {
        sendResponse({ success: false, error: "No vendor specified" });
      }
      break;
      
    default:
      console.log("Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }
  
  // Return true to indicate you wish to send a response asynchronously
  return true;
});