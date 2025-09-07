# LinkedIn Post Scraper (Chrome Extension)

This is a **simple Chrome Extension** that allows you to search and scrape **LinkedIn posts** based on keywords and
export them as a **CSV file**.

## Features

- Automates LinkedIn search with the provided keywords
- Applies a "Past Month" filter to results
- Scrolls through posts and extracts:
    - Author
    - Post description
    - Salary mentions (if any)
    - Email addresses
    - Post link
    - Job link (if present)
- Exports the collected data into a downloadable **CSV file**

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to: `chrome://extensions/`
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this project folder.
5. The extension is now ready to use.

## Usage

- Open LinkedIn and go to your feed.
- Run the content script function:
  ```js
  window.runLinkedinSearchAndScrape("your keywords", 50);