document.getElementById("addVendor").addEventListener("click", () => {
    const vendorUPI = document.getElementById("newVendorUPI").value;
    if (vendorUPI) {
      chrome.runtime.sendMessage({ type: "addVendor", vendor: vendorUPI });
      loadVendors();
    }
  });
  
  document.getElementById("clearVendors").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "clearVendors" });
    loadVendors();
  });
  
  function loadVendors() {
    chrome.runtime.sendMessage({ type: "getRestrictedVendors" }, (response) => {
      const vendorList = document.getElementById("vendorList");
      vendorList.innerHTML = "";
      response.vendors.forEach(vendor => {
        const li = document.createElement("li");
        li.textContent = vendor;
        vendorList.appendChild(li);
      });
    });
  }
  
  loadVendors();
  