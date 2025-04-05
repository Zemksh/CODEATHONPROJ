// Assuming UPI transaction is attempted when the user clicks a "pay" button or similar
const payButton = document.querySelector("#payButton"); // Change this selector as necessary

if (payButton) {
  payButton.addEventListener("click", () => {
    const vendorUPI = document.querySelector("#vendorUPI").value; // Capture the vendor UPI from the form/input
    chrome.runtime.sendMessage({ type: "getRestrictedVendors" }, (response) => {
      if (response.vendors.includes(vendorUPI)) {
        chrome.runtime.sendMessage({ type: "getVendorTimer", vendor: vendorUPI }, (response) => {
          const timer = response.timer;
          alert(`This transaction is restricted! You have ${timer} seconds to confirm or cancel.`);
          
          // Start timer countdown
          let countdown = timer;
          const interval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
              clearInterval(interval);
              alert("Transaction timed out!");
            }
          }, 1000);
          
          // Wait for the user to confirm the transaction within the timer (this can be expanded with UI interactions)
        });
        
        // Increase the timer for future transactions from the same vendor
        chrome.runtime.sendMessage({ type: "incrementVendorTimer", vendor: vendorUPI });
      }
    });
  });
}
