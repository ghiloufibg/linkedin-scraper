window.runLinkedinSearchAndScrape = async function (keywords, maxPosts) {

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  if (!location.pathname.startsWith("/feed/")) {
    const homeLink = document.querySelector('a[href="https://www.linkedin.com/feed/?doFeedRefresh=true&nis=true"]');
    if (homeLink) {
      homeLink.click();
      await delay(2000);
    }
  }

  const waitFor = async (selector, { timeout = 10000, visible = false } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el && (!visible || el.offsetParent !== null)) return el;
      await delay(100);
    }
    throw new Error(`Timeout: ${selector}`);
  };

  const waitForUrlPart = async (part, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (location.href.includes(part)) return true;
      await delay(100);
    }
    throw new Error(`Timeout URL: ${part}`);
  };

  const setNativeValue = (el, value) => {
    const { set } = Object.getOwnPropertyDescriptor(el.__proto__, "value") || {};
    set ? set.call(el, value) : (el.value = value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const searchBox = await waitFor('input.search-global-typeahead__input', { visible: true });
  searchBox.focus();
  setNativeValue(searchBox, keywords);
  await delay(200);
  searchBox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
  searchBox.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));

  await waitForUrlPart("/search/results/");
  await delay(500);

  const postsTab = [...document.querySelectorAll('a, button')].find((el) => {
    const t = (el.innerText || "").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    return ["publications", "posts"].some((w) => t === w || aria.includes(w));
  });

  if (postsTab) {
    postsTab.click();
    await waitForUrlPart("/search/results/content/");
  }
  await delay(600);

  const dateFilterBtn = document.querySelector('#searchFilter_datePosted') ||
    document.querySelector('[aria-label*="Date de publication"]') ||
    document.querySelector('[aria-label*="Date posted"]');
  if (dateFilterBtn) {
    dateFilterBtn.click();
    await delay(500);
    const pastMonthLabel = document.querySelector('label[for="datePosted-past-month"]') ||
      [...document.querySelectorAll("label")].find((l) => {
        const t = (l.innerText || "").toLowerCase();
        return t.includes("mois dernier") || t.includes("past month");
      });
    if (pastMonthLabel) {
      pastMonthLabel.click();
      await delay(300);
      const applyBtn = pastMonthLabel.closest('form')
        ?.querySelector('button[aria-label="Apply current filter to show results"]');
      applyBtn?.click();
    }
  }
  await delay(800);

  const scrollDelay = 2000;
  const randomExtra = 1500;

  function scrollPage() { window.scrollTo(0, document.body.scrollHeight); }
  function waitWithRandom(base, extra) {
    const rand = Math.floor(Math.random() * extra);
    return new Promise(resolve => setTimeout(resolve, base + rand));
  }
  function cleanText(text) {
    return text ? text.replace(/\s+/g, " ").trim() : "N/A";
  }

  function extractPost(post) {
    let auteur = cleanText(post.querySelector(".update-components-actor__title span[class='visually-hidden']")?.innerText);
    let lien = post.getAttribute("data-urn")
      ? `https://www.linkedin.com/feed/update/${post.getAttribute("data-urn")}`
      : "N/A";
    let description = cleanText(post.querySelector(".update-components-text")?.innerText);
    let jobUrl = post.querySelector(".update-components-entity__content-wrapper a")?.getAttribute("href") || "N/A";
    let salaireMatch = description.match(/(\d{1,3}(?:[\s.,]\d{3})*|\d+)(?:\s?(€|euros?|k|K|m|M))/);
    let salaire = salaireMatch ? salaireMatch[0] : "N/A";
    let mails = Array.from(post.querySelectorAll("a[href^='mailto:']"))
      .map(a => a.getAttribute("href").replace("mailto:", "").trim())
      .filter(Boolean)
      .join(" | ") || "N/A";

    return { auteur, description, salaire, mails, lien, jobUrl };
  }

    function toCSV(data) {
      const header = "Auteur,Description,Salaire,Mails,Lien,Linkedin lien";
      const rows = data.map(row =>
        `"${row.auteur.replace(/"/g, '""')}","${row.description.replace(/"/g, '""')}","${row.salaire}","${row.mails}","${row.lien}","${row.jobUrl}"`
      );
      return [header, ...rows].join("\n");
    }

    function downloadCSV(content, filename = "linkedin_posts.csv") {
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

      let postsData = [];
      let seen = new Set();

      while (postsData.length < maxPosts) {
        let posts = document.querySelectorAll(".feed-shared-update-v2");
        posts.forEach(post => {
          let urn = post.getAttribute("data-urn");
          if (!seen.has(urn) && postsData.length < maxPosts) {
            seen.add(urn);
            postsData.push(extractPost(post));
          }
        });

        if (postsData.length >= maxPosts) break;

        scrollPage();
        await waitWithRandom(scrollDelay, randomExtra);
      }

      const csvContent = toCSV(postsData);
      downloadCSV(csvContent);
};
