window.startLinkedinScraper = async function(maxPosts) {
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

    console.log(`✅ ${postsData.length} posts collectés...`);
    if (postsData.length >= maxPosts) break;

    scrollPage();
    await waitWithRandom(scrollDelay, randomExtra);
  }

  const csvContent = toCSV(postsData);
  downloadCSV(csvContent);

  console.log("🎉 Scraping terminé. CSV téléchargé !");
};
