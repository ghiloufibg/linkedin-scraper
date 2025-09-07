/* ---------------------- Constants & Selectors ---------------------- */

const DATE_LABELS = ["past month", "dernier mois", "le mois dernier"];

const SELECTORS = {
  searchBox: "input.search-global-typeahead__input",
  posts: ".feed-shared-update-v2",
  actorTitle: ".update-components-actor__title span[class='visually-hidden']",
  description: ".update-components-text",
  jobLink: ".update-components-entity__content-wrapper a",
  dateFilterBtn:
    "#searchFilter_datePosted, [aria-label*='Date de publication'], [aria-label*='Date posted']",
  pastMonthLabel: 'label[for="datePosted-past-month"]',
};

/* ---------------------- Utility Functions ---------------------- */

/**
 * Sleep for given milliseconds.
 * @param {number} ms
 */
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Normalize string for consistent comparisons.
 * @param {string} str
 */
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Wait until element exists in DOM.
 * @param {string} selector
 * @param {{timeout?:number, visible?:boolean}} opts
 */
async function waitFor(selector, { timeout = 10000, visible = false } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el && (!visible || el.offsetParent !== null)) return el;
    await delay(100);
  }
  throw new Error(`Timeout: ${selector}`);
}

/**
 * Wait until URL contains substring.
 * @param {string} part
 * @param {number} timeout
 */
async function waitForUrlPart(part, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (location.href.includes(part)) return true;
    await delay(100);
  }
  throw new Error(`Timeout URL: ${part}`);
}

/**
 * Programmatically set input value and dispatch events.
 * @param {HTMLInputElement} el
 * @param {string} value
 */
function setNativeValue(el, value) {
  const { set } =
    Object.getOwnPropertyDescriptor(el.__proto__, "value") || {};
  set ? set.call(el, value) : (el.value = value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Clean text from extra whitespace.
 * @param {string} text
 */
function cleanText(text) {
  return text ? text.replace(/\s+/g, " ").trim() : "N/A";
}

/* ---------------------- Core Logic ---------------------- */

/**
 * Perform search by keywords.
 * @param {string} keywords
 */
async function performSearch(keywords) {
  const searchBox = await waitFor(SELECTORS.searchBox, { visible: true });
  searchBox.focus();
  setNativeValue(searchBox, keywords);
  await delay(200);

  searchBox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
  searchBox.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));

  await waitForUrlPart("/search/results/");
  await delay(500);

  const postsTab = [...document.querySelectorAll("a, button")].find((el) => {
    const t = normalize(el.innerText);
    const aria = normalize(el.getAttribute("aria-label") || "");
    return ["publications", "posts"].some((w) => t === w || aria.includes(w));
  });
  if (postsTab) {
    postsTab.click();
    await waitForUrlPart("/search/results/content/");
  }
  await delay(1000);
}

/**
 * Apply "Past Month" filter.
 */
async function applyPastMonthFilter() {
  const dateFilterBtn = document.querySelector(SELECTORS.dateFilterBtn);
  if (!dateFilterBtn) throw new Error("Date filter button not found");
  dateFilterBtn.click();
  await delay(400);

  const pastMonthLabel =
    document.querySelector(SELECTORS.pastMonthLabel) ||
    [...document.querySelectorAll("label")].find((l) =>
      DATE_LABELS.some((w) => normalize(l.innerText).includes(normalize(w)))
    );

  if (!pastMonthLabel) throw new Error("Past month label not found");
  pastMonthLabel.click();
  await delay(200);

  const applyBtn =
    pastMonthLabel.closest("form")?.querySelector('button[aria-label*="Apply"], button[aria-label*="Appliquer"]') ||
    [...document.querySelectorAll("button")].find((b) => {
      const t = normalize(b.innerText);
      return (
        t.includes("afficher les resultats") ||
        t.includes("show results") ||
        t.includes("appliquer")
      );
    });

  if (!applyBtn) throw new Error("Apply button not found");
  applyBtn.click();
  await delay(800);
}

/**
 * Extract structured post info.
 * @param {Element} post
 */
function extractPost(post) {
  const auteur = cleanText(post.querySelector(SELECTORS.actorTitle)?.innerText);
  const lien = post.getAttribute("data-urn")
    ? `https://www.linkedin.com/feed/update/${post.getAttribute("data-urn")}`
    : "N/A";
  const description = cleanText(post.querySelector(SELECTORS.description)?.innerText);
  const jobUrl = post.querySelector(SELECTORS.jobLink)?.getAttribute("href") || "N/A";

  const salaireMatch = description.match(/(\d{1,3}(?:[\\s.,]\\d{3})*|\\d+)(?:\\s?(€|euros?|k|K|m|M))/);
  const salaire = salaireMatch ? salaireMatch[0] : "N/A";

  const mails =
    Array.from(post.querySelectorAll("a[href^='mailto:']"))
      .map((a) => a.getAttribute("href").replace("mailto:", "").trim())
      .filter(Boolean)
      .join(" | ") || "N/A";

  return { auteur, description, salaire, mails, lien, jobUrl };
}

/**
 * Convert posts data to CSV string.
 * @param {Array<Object>} data
 */
function toCSV(data) {
  const header = "Auteur,Description,Salaire,Mails,Lien,Linkedin lien";
  const rows = data.map(
    (row) =>
      `"${row.auteur.replace(/"/g, '""')}","${row.description.replace(/"/g, '""')}","${row.salaire}","${row.mails}","${row.lien}","${row.jobUrl}"`
  );
  return [header, ...rows].join("\\n");
}

/**
 * Trigger download of CSV file.
 * @param {string} content
 * @param {string} filename
 */
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

/**
 * Scroll and scrape posts until reaching maxPosts.
 * @param {number} maxPosts
 */
async function scrapePosts(maxPosts) {
  const postsData = [];
  const seen = new Set();
  const scrollDelay = 2000;
  const randomExtra = 1500;

  function scrollPage() {
    window.scrollTo(0, document.body.scrollHeight);
  }
  function waitWithRandom(base, extra) {
    const rand = Math.floor(Math.random() * extra);
    return delay(base + rand);
  }

  while (postsData.length < maxPosts) {
    const posts = document.querySelectorAll(SELECTORS.posts);
    posts.forEach((post) => {
      const urn = post.getAttribute("data-urn");
      if (!seen.has(urn) && postsData.length < maxPosts) {
        seen.add(urn);
        postsData.push(extractPost(post));
      }
    });

    if (postsData.length >= maxPosts) break;

    scrollPage();
    await waitWithRandom(scrollDelay, randomExtra);
  }

  return postsData;
}

/* ---------------------- Public Entry ---------------------- */

/**
 * Run LinkedIn search and scrape posts.
 * @param {string} keywords
 * @param {number} maxPosts
 */
window.runLinkedinSearchAndScrape = async function (keywords, maxPosts) {
  // Ensure we are on feed page
  if (!location.pathname.startsWith("/feed/")) {
    const homeLink = document.querySelector('a[href="https://www.linkedin.com/feed/?nis=true"]');
    if (homeLink) {
      homeLink.click();
      await delay(2000);
    }
  }

  await performSearch(keywords);
  await applyPastMonthFilter();
  const postsData = await scrapePosts(maxPosts);

  const csvContent = toCSV(postsData);
  downloadCSV(csvContent);
};