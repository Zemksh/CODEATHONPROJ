let restrictedVendors = [];
let vendorTimers = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["restrictedVendors"], function(result) {
    if (result.restrictedVendors) {
      restrictedVendors = result.restrictedVendors;
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getRestrictedVendors") {
    sendResponse({ vendors: restrictedVendors });
  } else if (message.type === "addVendor") {
    restrictedVendors.push(message.vendor);
    chrome.storage.sync.set({ restrictedVendors: restrictedVendors });
  } else if (message.type === "removeVendor") {
    restrictedVendors = restrictedVendors.filter(vendor => vendor !== message.vendor);
    chrome.storage.sync.set({ restrictedVendors: restrictedVendors });
  } else if (message.type === "getVendorTimer") {
    const timer = vendorTimers[message.vendor] || 30; // default to 30 seconds
    sendResponse({ timer });
  } else if (message.type === "incrementVendorTimer") {
    if (vendorTimers[message.vendor]) {
      vendorTimers[message.vendor] += 30;
    } else {
      vendorTimers[message.vendor] = 30;
    }
    sendResponse({ newTimer: vendorTimers[message.vendor] });
  }
});
