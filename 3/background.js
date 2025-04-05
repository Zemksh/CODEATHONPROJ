// Fixed background.js
console.log("Payment Timer Extension background script loaded");

// Make sure we have the required permissions in manifest.json before accessing storage
try {
  // Use local storage if sync is not available
  const storage = chrome.storage.sync || chrome.storage.local;
  
  // Initialize default settings if they don't exist
  storage.get(['restrictedVendors', 'waitTime'], function(result) {
    if (!result.restrictedVendors) {
      storage.set({
        restrictedVendors: ['amazon', 'flipkart', 'shopping', 'checkout'],
        waitTime: 15 // default wait time in seconds
      }, function() {
        console.log("Default settings initialized");
      });
    } else {
      console.log("Settings already exist:", result);
    }
  });
} catch (error) {
  console.error("Error initializing storage:", error);
}

// Handle messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Received message:", request);
  
  if (request.type === "getRestrictedVendors") {
    // Return list of restricted vendors
    chrome.storage.local.get('restrictedVendors', function(data) {
      sendResponse({vendors: data.restrictedVendors || []});
    });
    return true; // Important: indicates we'll respond asynchronously
  }
  
  else if (request.type === "getVendorTimer") {
    // Return timer duration for specific vendor
    chrome.storage.local.get('waitTime', function(data) {
      sendResponse({timer: data.waitTime || 15});
    });
    return true;
  }
  
  else if (request.type === "incrementVendorTimer") {
    // Record transaction and possibly adjust wait time for vendor
    chrome.storage.local.get(['transactions', 'waitTime'], function(data) {
      const transactions = data.transactions || {};
      const vendor = request.vendor;
      
      if (!transactions[vendor]) {
        transactions[vendor] = {
          count: 1,
          lastTransaction: Date.now()
        };
      } else {
        transactions[vendor].count++;
        transactions[vendor].lastTransaction = Date.now();
      }
      
      chrome.storage.local.set({transactions: transactions}, function() {
        console.log("Transaction recorded for vendor:", vendor);
        sendResponse({success: true});
      });
    });
    return true;
  }
  
  else if (request.type === "logTransaction") {
    // Log a completed transaction
    const transaction = {
      vendor: request.vendor,
      amount: request.amount,
      timestamp: Date.now(),
      url: sender.url
    };
    
    chrome.storage.local.get('transactionHistory', function(data) {
      const history = data.transactionHistory || [];
      history.push(transaction);
      
      chrome.storage.local.set({transactionHistory: history}, function() {
        console.log("Transaction logged:", transaction);
        sendResponse({success: true});
      });
    });
    return true;
  }
});

// Optional: Add an alarm for syncing with your backend
chrome.alarms.create("syncTransactions", { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === "syncTransactions") {
    syncTransactionsWithBackend();
  }
});

function syncTransactionsWithBackend() {
  chrome.storage.local.get('transactionHistory', function(data) {
    const history = data.transactionHistory || [];
    
    if (history.length > 0) {
      console.log("Syncing transactions with backend...");
      
      // Send to your backend - adjust the URL as needed
      fetch("http://localhost:5000/api/sync-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(history)
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          // Clear synced transactions
          chrome.storage.local.set({transactionHistory: []});
          console.log("Transactions synced successfully");
        }
      })
      .catch(error => {
        console.error("Failed to sync transactions:", error);
      });
    }
  });
}