Yesss. Now that both extensions are in the same repo, the README should reflect **both projects**, not just the original Meesho extension.

Since your current README is already in the repo, I’d structure it like this:

````markdown
# E-Commerce Review Analyzer

A collection of browser extensions that analyze e-commerce product reviews and provide users with insights into review quality, sentiment, and product trustworthiness.

---

## Projects

### 1. E-Commerce Review Analyzer — Meesho

A browser extension that analyzes visible product reviews on Meesho and evaluates review sentiment to estimate product trust.

**Features**
- Extracts visible product reviews
- Performs sentiment analysis
- Supports English and Hinglish reviews
- Calculates negative-review ratio
- Uses aggregate rating and review count
- Generates a confidence score
- Provides a final product verdict
![Extension reads the two reviews in the screen](MeeshoReview.png.png)
![Extension reads all the reviews on the screen](MeeshoReview1.png)

**Tech Stack**

`JavaScript` `Chrome Extension` `HTML` `CSS`

---

### 2. TrustLens — Multi-Platform Review Analyzer

TrustLens is a browser extension designed to analyze product reviews across multiple e-commerce platforms, including Flipkart, Amazon, Myntra, and AJIO.

It analyzes review patterns and provides a quick trust assessment directly while browsing a product.

**Features**
- Analyzes visible product reviews
- Detects positive and negative sentiment
- Supports English and Hinglish reviews
- Identifies suspiciously short reviews
- Detects reviews lacking product-specific details
- Calculates a risk score
- Provides a trust verdict such as:
  - Safe to Buy
  - Mixed Reviews
  - Risky Product
- Shows per-review analysis
- Displays positive signals and red flags
- Provides review statistics and confidence indicators

**Tech Stack**

`JavaScript` `Chrome Extension` `HTML` `CSS`

---

## TrustLens Demo

### Flipkart

![TrustLens on Flipkart](image-1.png)

### Myntra

![TrustLens on Flipkart](image-2.png)

> TrustLens analyzes review patterns directly on supported e-commerce product pages and presents the results through an in-browser panel.

---

## Project Structure

```text
Ecommerce-Review-Analyzer/
│
├── TrustLens/
│   ├── icons/
│   ├── content.js
│   ├── manifest.json
│   ├── panel.css
│   ├── popup.html
│   └── popup.js
│
├── content.js
├── manifest.json
├── popup.html
├── popup.js
├── background.js
│
└── README.md
````

The root-level files contain the original Meesho extension, while the `TrustLens/` directory contains the multi-platform TrustLens extension.

---

## How It Works

### Review Extraction

The extension extracts reviews visible on the current product page.

### Sentiment Analysis

Reviews are analyzed using predefined positive and negative vocabulary, including English and Hinglish terms, along with emoji-based sentiment signals.

### Review Quality Signals

TrustLens looks for patterns such as:

* Product-specific details
* Review length
* Sentiment
* Language diversity
* Suspiciously short feedback

### Trust Assessment

The extracted signals are aggregated to generate:

**Risk Score → Review Statistics → Positive Signals / Red Flags → Final Verdict**

---

## Installation

1. Clone this repository:

```bash
git clone https://github.com/nethrashivani/Ecommerce-Review-Analyzer.git
```

2. Open Chrome and navigate to:

```text
chrome://extensions
```

3. Enable **Developer mode**.

4. Click **Load unpacked**.

5. For the original Meesho extension, select the repository folder.

6. For TrustLens, select:

```text
TrustLens/
```

7. Open a supported e-commerce product page and launch the extension.

---

## Technologies Used

* JavaScript
* HTML
* CSS
* Chrome Extension APIs
* DOM Parsing
* Rule-based Sentiment Analysis
* Review Pattern Analysis

---

## Future Improvements

* Machine-learning-based review classification
* Improved multilingual sentiment analysis
* Fake-review detection using behavioral patterns
* Support for additional e-commerce platforms
* More advanced review quality scoring
* Historical product trust tracking

---

## Author

**Nethra Shivani**

GitHub:
[https://github.com/nethrashivani](https://github.com/nethrashivani)


