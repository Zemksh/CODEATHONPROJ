// Popup script for Payment Timer Extension

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', function() {
  // Get references to form elements
  const waitTimeInput = document.getElementById('wait-time');
  const vendorsTextarea = document.getElementById('vendors');
  const saveButton = document.getElementById('save-button');
  const statusDiv = document.getElementById('status');
  
  // Load current settings
  chrome.storage.local.get(['waitTime', 'restrictedVendors'], function(data) {
    if (data.waitTime) {
      waitTimeInput.value = data.waitTime;
    }
    
    if (data.restrictedVendors && Array.isArray(data.restrictedVendors)) {
      vendorsTextarea.value = data.restrictedVendors.join('\n');
    }
  });
  
  // Save settings when button is clicked
  saveButton.addEventListener('click', function() {
    // Get values from form
    const waitTime = parseInt(waitTimeInput.value) || 15;
    const vendorsText = vendorsTextarea.value;
    
    // Convert vendors text to array
    const restrictedVendors = vendorsText
      .split('\n')
      .map(vendor => vendor.trim())
      .filter(vendor => vendor.length > 0);
    
    // Save to storage
    chrome.storage.local.set({
      waitTime: waitTime,
      restrictedVendors: restrictedVendors
    }, function() {
      // Show success message
      statusDiv.textContent = 'Settings saved!';
      
      // Clear status message after 2 seconds
      setTimeout(function() {
        statusDiv.textContent = '';
      }, 2000);
    });
  });
});