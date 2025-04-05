// Display feedback message
function showFeedback(message, isError = false) {
  const feedbackDiv = document.createElement('div');
  feedbackDiv.textContent = message;
  feedbackDiv.style.padding = '8px';
  feedbackDiv.style.marginTop = '10px';
  feedbackDiv.style.borderRadius = '4px';
  feedbackDiv.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
  feedbackDiv.style.color = isError ? '#721c24' : '#155724';
  
  const container = document.querySelector('body');
  container.insertBefore(feedbackDiv, document.getElementById('vendorList'));
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (container.contains(feedbackDiv)) {
      container.removeChild(feedbackDiv);
    }
  }, 3000);
}

// Load the list of restricted vendors
function loadVendors() {
  chrome.runtime.sendMessage({ type: "getRestrictedVendors" }, (response) => {
    if (!response || !response.vendors) {
      showFeedback("Failed to load vendors", true);
      return;
    }
    
    const vendorList = document.getElementById("vendorList");
    vendorList.innerHTML = "";
    
    if (response.vendors.length === 0) {
      const emptyMessage = document.createElement("li");
      emptyMessage.textContent = "No restricted vendors added";
      emptyMessage.style.fontStyle = "italic";
      emptyMessage.style.color = "#666";
      emptyMessage.style.padding = "10px 0";
      vendorList.appendChild(emptyMessage);
    } else {
      response.vendors.forEach(vendor => {
        // Create list item for each vendor
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.padding = "8px 0";
        li.style.borderBottom = "1px solid #eee";
        
        // Vendor UPI text
        const vendorText = document.createElement("span");
        vendorText.textContent = vendor;
        li.appendChild(vendorText);
        
        // Remove button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "×";
        deleteButton.title = "Remove vendor";
        deleteButton.style.backgroundColor = "#dc3545";
        deleteButton.style.color = "white";
        deleteButton.style.border = "none";
        deleteButton.style.borderRadius = "50%";
        deleteButton.style.width = "24px";
        deleteButton.style.height = "24px";
        deleteButton.style.cursor = "pointer";
        deleteButton.style.display = "flex";
        deleteButton.style.justifyContent = "center";
        deleteButton.style.alignItems = "center";
        deleteButton.style.fontSize = "18px";
        deleteButton.style.lineHeight = "1";
        
        deleteButton.addEventListener("click", () => {
          chrome.runtime.sendMessage({ type: "removeVendor", vendor: vendor }, (response) => {
            if (response && response.success) {
              loadVendors();
              showFeedback(`Removed ${vendor}`);
            } else {
              showFeedback("Failed to remove vendor", true);
            }
          });
        });
        
        li.appendChild(deleteButton);
        vendorList.appendChild(li);
      });
    }
  });
}

// Handle add vendor button click
document.getElementById("addVendor").addEventListener("click", () => {
  const vendorUPI = document.getElementById("newVendorUPI").value.trim();
  if (!vendorUPI) {
    showFeedback("Please enter a UPI ID", true);
    return;
  }
  
  chrome.runtime.sendMessage({ type: "addVendor", vendor: vendorUPI }, (response) => {
    if (response && response.success) {
      document.getElementById("newVendorUPI").value = ""; // Clear the input
      loadVendors();
      showFeedback(`Added ${vendorUPI}`);
    } else {
      showFeedback("Failed to add vendor", true);
    }
  });
});

// Handle clear vendors button click
document.getElementById("clearVendors").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all restricted vendors?")) {
    chrome.runtime.sendMessage({ type: "clearVendors" }, (response) => {
      if (response && response.success) {
        loadVendors();
        showFeedback("All vendors cleared");
      } else {
        showFeedback("Failed to clear vendors", true);
      }
    });
  }
});

// Initial load of vendors
loadVendors();