document.getElementById("startScraping").addEventListener("click", async () => {
  const maxPosts = parseInt(document.getElementById("maxPosts").value, 10);
  const keywords = document.getElementById("keywords").value.trim();
  document.getElementById("status").innerText = "Scraping en cours...";

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ["content.js"],
    },
    () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (kw, max) => window.runLinkedinSearchAndScrape(kw, max),
        args: [keywords, parseInt(maxPosts, 10)],
      });
    },
  );
});

const modeSelect = document.getElementById("modeSelect");
const postForm = document.getElementById("postForm");
const jobNotice = document.getElementById("jobNotice");

modeSelect.addEventListener("change", () => {
  if (modeSelect.value === "post") {
    postForm.style.display = "block";
    jobNotice.style.display = "none";
  } else {
    postForm.style.display = "none";
    jobNotice.style.display = "block";
  }
});


