chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    if (tab.url && tab.url.includes("linkedin.com")) {
      chrome.action.setPopup({ tabId: tabId, popup: "popup.html" });
      chrome.action.enable(tabId);
    } else {
      chrome.action.setPopup({ tabId: tabId, popup: "" });
      chrome.action.disable(tabId);
    }
  }
});
