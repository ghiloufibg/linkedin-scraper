document.getElementById("startScraping").addEventListener("click", async () => {
  const maxPosts = document.getElementById("maxPosts").value;
  document.getElementById("status").innerText = "Scraping en cours...";

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  }, () => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (max) => window.startLinkedinScraper(max),
      args: [parseInt(maxPosts, 10)]
    });
  });
});
