document.getElementById("startScraping").addEventListener("click", async () => {
  const maxPosts = parseInt(document.getElementById("maxPosts").value, 10);
  const keywords = document.getElementById("keywords").value.trim();
  document.getElementById("status").innerText = "Scraping en cours...";

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  }, () => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (kw, max) => window.runLinkedinSearchAndScrape(kw, max),
      args: [keywords, parseInt(maxPosts, 10)]
    });
  });
});

