/**
 * TrustLens AI v5 — DOM-Aware Review Analyzer
 * Scrapes full review metadata (rating, verified, date, votes)
 * and analyzes each review individually with a richer panel.
 */

(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────
  // PATTERN DICTIONARIES
  // ─────────────────────────────────────────────────────────

  const FAKE_PHRASES_EN = [
    "best product ever", "best purchase ever", "best product",
    "highly recommend", "must buy", "must have", "do not hesitate",
    "without hesitation", "changed my life", "life changing",
    "absolutely perfect", "absolutely amazing", "absolutely love",
    "blown away", "mind blowing", "outstanding quality",
    "exceeded expectations", "exceeded my expectations",
    "five stars", "5 stars", "100% satisfied", "totally satisfied",
    "no complaints", "nothing to complain", "cannot fault",
    "worth every penny", "value for money", "great value",
    "fast delivery", "quick delivery", "excellent packaging",
    "will buy again", "would buy again", "already ordered",
    "love love love", "amazing amazing", "great great great",
    "perfect product", "no issues", "zero complaints",
    "superb product", "awesome product", "excellent product"
  ];

  const FAKE_PHRASES_HI = [
    "bahut accha", "bahut acha", "bahut achha", "bhut acha",
    "best hai", "ekdum best", "ekdum sahi", "ekdum mast",
    "paisa vasool", "paisa wasool", "bilkul sahi",
    "superb hai", "zabardast", "mast product", "shandar",
    "bahut badiya", "bahut badhiya", "bahut sundar",
    "kharidna chahiye", "jaroor kharidein", "sabko lena chahiye",
    "ek dum", "ekdum", "top class", "no complaint",
    "best quality", "too good", "very good product",
    "sahi mein", "sach mein bahut", "trust karo"
  ];

  const FAKE_PHRASES_TA = [
    "romba nalla", "super product", "nalla iruku",
    "best ah iruku", "worth ah iruku", "buy pannunga",
    "romba usefulah", "nalla quality", "super quality",
    "satisfied ah irukken", "happy ah irukken",
    "all the best", "must buy pannunga"
  ];

  const GENUINE_SIGNALS_EN = [
    "however", "but", "although", "except", "unfortunately",
    "disappointed", "returned", "broke", "stopped working",
    "not as described", "different from", "size issue",
    "color different", "took longer", "late delivery",
    "customer service", "contacted seller", "refund",
    "after", "days", "weeks", "months", "hours",
    "stitching", "material", "fabric", "battery", "camera",
    "screen", "sound", "quality could be better", "average",
    "could be better", "not worth", "waste of money",
    "poor quality", "bad quality", "broke after", "stopped after"
  ];

  const GENUINE_SIGNALS_HI = [
    "lekin", "par", "magar", "thoda", "thodi",
    "kuch", "problem", "dikkat", "issue", "complaint",
    "wapas kiya", "return kiya", "quality thodi",
    "packaging kharab", "late aaya", "der se"
  ];

  const POSITIVE_EMOJIS = ["😍","❤️","🥰","😊","👍","🔥","✨","💯","🤩","😃","😄","🎉","💪","👌","🙌"];
  const NEGATIVE_EMOJIS = ["👎","😡","😠","😤","💔","😞","😢","😭","🤬","😒","😑"];

  // ─────────────────────────────────────────────────────────
  // SINGLE REVIEW ANALYZER
  // Input: review object { text, rating, verified, date, helpfulVotes, reviewerName }
  // Output: { fakeScore, isFake, flags, genuineSignals, lang, reasons }
  // ─────────────────────────────────────────────────────────

  function analyzeReview(review) {
    const text = review.text || "";
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    const wordCount = words.length;
    const rating = review.rating || 0;
    const verified = review.verified || false;
    const helpfulVotes = review.helpfulVotes || 0;

    let fakeScore = 0;
    let flags = [];
    let positives = [];
    let genuineSignals = 0;

    // ── 1. English fake phrases ──
    let fakePhrasesFound = 0;
    for (const phrase of FAKE_PHRASES_EN) {
      if (lower.includes(phrase)) fakePhrasesFound++;
    }
    if (fakePhrasesFound >= 3) { fakeScore += 35; flags.push("Excessive generic praise"); }
    else if (fakePhrasesFound >= 1) fakeScore += 15;

    // ── 2. Hindi/Hinglish fake phrases ──
    let hindiFakeFound = 0;
    for (const phrase of FAKE_PHRASES_HI) {
      if (lower.includes(phrase)) hindiFakeFound++;
    }
    if (hindiFakeFound >= 3) { fakeScore += 30; flags.push("Scripted Hindi praise"); }
    else if (hindiFakeFound >= 1) fakeScore += 10;

    // ── 3. Tamil fake phrases ──
    let tamilFakeFound = 0;
    for (const phrase of FAKE_PHRASES_TA) {
      if (lower.includes(phrase)) tamilFakeFound++;
    }
    if (tamilFakeFound >= 2) { fakeScore += 20; flags.push("Scripted Tamil praise"); }
    else if (tamilFakeFound >= 1) fakeScore += 8;

    // ── 4. Exclamation spam ──
    const exclCount = (text.match(/!/g) || []).length;
    if (exclCount >= 5) { fakeScore += 20; flags.push(`Exclamation spam (${exclCount}!)`); }
    else if (exclCount >= 3) fakeScore += 10;

    // ── 5. ALL CAPS words ──
    const capsWords = text.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
    if (capsWords.length >= 3) { fakeScore += 15; flags.push("Excessive caps"); }

    // ── 6. Too short ──
    if (wordCount < 5) { fakeScore += 25; flags.push("Suspiciously short"); }
    else if (wordCount < 10) { fakeScore += 10; }

    // ── 7. Word repetition ──
    const wordFreq = {};
    words.forEach(w => { if (w.length > 3) wordFreq[w] = (wordFreq[w] || 0) + 1; });
    const repeated = Object.entries(wordFreq).filter(([, c]) => c >= 3);
    if (repeated.length >= 2) { fakeScore += 15; flags.push("Repetitive wording"); }

    // ── 8. No product-specific details ──
    const hasSpecifics =
      /\d+(cm|mm|kg|gb|mb|inch|ml|days|weeks|months|hrs|hours|rs|rupee|\$)/i.test(text) ||
      /(size|color|colour|battery|camera|screen|fabric|material|stitching|delivery|packaging|box|brand|fit|quality|smell|taste|texture|weight|finish)/i.test(text);
    if (!hasSpecifics && wordCount < 20) {
      fakeScore += 15;
      flags.push("No product-specific details");
    }

    // ── 9. Emoji analysis ──
    let posEmoji = 0, negEmoji = 0;
    POSITIVE_EMOJIS.forEach(e => { if (text.includes(e)) posEmoji++; });
    NEGATIVE_EMOJIS.forEach(e => { if (text.includes(e)) negEmoji++; });
    if (posEmoji >= 4 && negEmoji === 0) { fakeScore += 10; flags.push("Only positive emojis"); }
    if (negEmoji > 0) { fakeScore -= 10; positives.push("Contains critical emoji"); }

    // ── 10. Rating vs text mismatch ──
    // High star + negative words = suspicious padding OR real conflicted review
    const hasNegativeWords = /(bad|poor|terrible|awful|worst|horrible|disappointed|broken|defective|fake|useless)/i.test(text);
    const hasPositiveWords = /(good|great|excellent|perfect|amazing|love|best|awesome|superb)/i.test(text);
    if (rating >= 4 && hasNegativeWords && !hasPositiveWords) {
      fakeScore += 20;
      flags.push("Rating conflicts with review text");
    }
    // 5-star + no negative words at all + short = suspicious
    if (rating === 5 && !hasNegativeWords && wordCount < 15) {
      fakeScore += 10;
      flags.push("5-star with no critical detail");
    }

    // ── 11. Unverified purchase + 5 stars ──
    if (!verified && rating === 5) {
      fakeScore += 12;
      flags.push("Unverified 5-star purchase");
    }
    if (verified) {
      fakeScore -= 8;
      positives.push("Verified purchase");
    }

    // ── 12. Helpful votes signal (many votes = likely genuine) ──
    if (helpfulVotes >= 10) {
      fakeScore -= 15;
      positives.push(`${helpfulVotes} people found helpful`);
    } else if (helpfulVotes >= 3) {
      fakeScore -= 8;
      positives.push(`${helpfulVotes} helpful votes`);
    }

    // ── 13. Genuine signals (reduce fake score) ──
    for (const signal of GENUINE_SIGNALS_EN) {
      if (lower.includes(signal)) genuineSignals++;
    }
    for (const signal of GENUINE_SIGNALS_HI) {
      if (lower.includes(signal)) genuineSignals++;
    }
    if (genuineSignals >= 3) { fakeScore -= 30; positives.push("Detailed, specific feedback"); }
    else if (genuineSignals >= 2) { fakeScore -= 20; positives.push("Mentions specific details"); }
    else if (genuineSignals >= 1) { fakeScore -= 10; }

    // ── 14. Language detection ──
    const hasHindi = /[\u0900-\u097F]/.test(text) || hindiFakeFound > 0 ||
      /(hai|hain|tha|thi|mein|ka|ki|ke|aur|bahut|accha|nahi)/i.test(lower);
    const hasTamil = /[\u0B80-\u0BFF]/.test(text) ||
      /(nalla|romba|iruku|pannunga|irukken)/i.test(lower);
    const lang = hasTamil ? "Tamil/English" : hasHindi ? "Hindi/Hinglish" : "English";

    fakeScore = Math.max(0, Math.min(100, fakeScore));

    return {
      text: text.slice(0, 180) + (text.length > 180 ? "…" : ""),
      fullText: text,
      rating,
      verified,
      reviewerName: review.reviewerName || "Anonymous",
      date: review.date || "",
      helpfulVotes,
      fakeScore,
      isFake: fakeScore >= 45,
      flags,
      positives,
      genuineSignals,
      lang
    };
  }

  // ─────────────────────────────────────────────────────────
  // AGGREGATE ANALYZER
  // ─────────────────────────────────────────────────────────

  function analyzeAll(reviews) {
    const results = reviews.map(r => analyzeReview(r));
    const fakeCount = results.filter(r => r.isFake).length;
    const realCount = results.length - fakeCount;
    const fakeRatio = fakeCount / results.length;
    const avgScore = results.reduce((s, r) => s + r.fakeScore, 0) / results.length;

    // Risk score: 60% from fake ratio, 40% from average per-review score
    const riskScore = Math.round((fakeRatio * 60) + (avgScore * 0.4));

    // Rating distribution analysis
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    results.forEach(r => { if (r.rating >= 1 && r.rating <= 5) ratingCounts[r.rating]++; });
    const totalRated = results.filter(r => r.rating > 0).length;
    const fiveStarRatio = totalRated > 0 ? ratingCounts[5] / totalRated : 0;
    const lowStarCount = ratingCounts[1] + ratingCounts[2] + ratingCounts[3];

    // Rating bomb detection: >85% five-stars with almost no low ratings
    let ratingBomb = false;
    if (totalRated >= 5 && fiveStarRatio > 0.85 && lowStarCount === 0) {
      ratingBomb = true;
    }

    // Burst detection: multiple reviews on the same date
    const dateCounts = {};
    results.forEach(r => {
      if (r.date) dateCounts[r.date] = (dateCounts[r.date] || 0) + 1;
    });
    const burstDates = Object.entries(dateCounts).filter(([, c]) => c >= 3);
    const hasBurst = burstDates.length > 0;

    // Top flags across all reviews
    const flagCount = {};
    results.forEach(r => r.flags.forEach(f => { flagCount[f] = (flagCount[f] || 0) + 1; }));
    const topFlags = Object.entries(flagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flag, count]) => ({ flag, count }));

    // Language breakdown
    const langCount = {};
    results.forEach(r => { langCount[r.lang] = (langCount[r.lang] || 0) + 1; });
    const langBreakdown = Object.entries(langCount)
      .map(([l, c]) => `${Math.round(c / results.length * 100)}% ${l}`)
      .join(" · ");

    // Positive signals summary
    const positiveSignals = [];
    const genuineCount = results.filter(r => r.genuineSignals >= 1).length;
    if (genuineCount > 0) positiveSignals.push(`${genuineCount} reviews mention specific details`);
    const verifiedCount = results.filter(r => r.verified).length;
    if (verifiedCount > 0) positiveSignals.push(`${verifiedCount} verified purchases`);
    if (results.some(r => r.lang.includes("Tamil") || r.lang.includes("Hindi")))
      positiveSignals.push("Reviews in multiple languages");
    if (results.some(r => r.fullText && /return|refund|complaint|issue|problem/i.test(r.fullText)))
      positiveSignals.push("Some reviews mention issues (authenticity signal)");

    // Extra risk signals
    if (ratingBomb) topFlags.unshift({ flag: "Rating bomb: 85%+ five-stars, zero low ratings", count: 1 });
    if (hasBurst) topFlags.unshift({ flag: `Review burst: ${burstDates[0][1]}+ reviews on same date`, count: 1 });

    // Verdict
    let verdict, verdictColor, summary, recommendation;
    const adjustedRisk = ratingBomb ? Math.min(100, riskScore + 15) : riskScore;

    if (adjustedRisk < 25) {
      verdict = "SAFE TO BUY"; verdictColor = "green";
      summary = "Reviews appear genuine with specific, varied feedback.";
      recommendation = "This product looks trustworthy based on review patterns.";
    } else if (adjustedRisk < 45) {
      verdict = "PROCEED WITH CAUTION"; verdictColor = "yellow";
      summary = "Some suspicious patterns. Mix of genuine and questionable reviews.";
      recommendation = "Read carefully and look for specific complaints before buying.";
    } else if (adjustedRisk < 70) {
      verdict = "HIGH RISK"; verdictColor = "orange";
      summary = "Significant fake review activity. Many reviews lack genuine detail.";
      recommendation = "Check other sources or look for alternative products.";
    } else {
      verdict = "DO NOT BUY"; verdictColor = "red";
      summary = "Overwhelming fake review evidence. Ratings likely artificially inflated.";
      recommendation = "Avoid this product — reviews appear mostly fake or paid.";
    }

    return {
      riskScore: adjustedRisk,
      verdict, verdictColor,
      fakeCount, realCount,
      totalAnalyzed: results.length,
      summary, recommendation,
      topFlags, langBreakdown, positiveSignals,
      ratingBomb, hasBurst,
      ratingCounts, totalRated,
      perReview: results  // ALL reviews for per-review panel
    };
  }

  // ─────────────────────────────────────────────────────────
  // SITE CONFIGS — selectors for text, rating, verified, date,
  // helpful votes, reviewer name
  // ─────────────────────────────────────────────────────────

  const SITES = {
    amazon: {
      detect: () => location.hostname.includes("amazon"),
      name: "Amazon", color: "#FF9900",
      pageMatch: () => location.href.includes("/dp/") || location.href.includes("product-reviews"),
      productSelector: "#productTitle",
      reviewContainerSelector: '[data-hook="review"]',
      fields: {
        text: el => el.querySelector('[data-hook="review-body"] span')?.innerText?.trim() || "",
        rating: el => {
          const s = el.querySelector('[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"]')?.className || "";
          const m = s.match(/a-star-(\d)/);
          return m ? parseInt(m[1]) : 0;
        },
        verified: el => !!el.querySelector('[data-hook="avp-badge"]'),
        date: el => {
          const t = el.querySelector('[data-hook="review-date"]')?.innerText || "";
          const m = t.match(/(\w+ \d+, \d{4})/);
          return m ? m[1] : "";
        },
        helpfulVotes: el => {
          const t = el.querySelector('[data-hook="helpful-vote-statement"]')?.innerText || "";
          const m = t.match(/(\d+)/);
          return m ? parseInt(m[1]) : 0;
        },
        reviewerName: el => el.querySelector('.a-profile-name')?.innerText?.trim() || "Anonymous",
      },
      // fallback text-only selectors
      fallbackSelectors: ['[data-hook="review-body"] span', '.review-text-content span'],
    },

    flipkart: {
      detect: () => location.hostname.includes("flipkart"),
      name: "Flipkart", color: "#2874F0",
      pageMatch: () => location.href.includes("/p/") || location.href.includes("product-reviews") || location.href.includes("pid="),
      productSelector: ".B_NuCI, ._35KyD6, h1",
      // Flipkart review containers
      reviewContainerSelector: "._27M-vq, .col-9-12._2nlXSV, [class*='_27M-vq'], ._1AtVbE .col",
      fields: {
        text: el => {
          const candidates = [".t-ZTKy", "._6K-7Co", ".ZmyHeo", "span.css-1jxf684", "._2-N8zT", "p[class*='_']"];
          for (const sel of candidates) {
            const t = el.querySelector(sel)?.innerText?.trim();
            if (t && t.length > 10) return t;
          }
          // fallback: longest span inside
          const spans = [...el.querySelectorAll("span")];
          const longest = spans.sort((a, b) => (b.innerText?.length || 0) - (a.innerText?.length || 0))[0];
          return longest?.innerText?.trim() || "";
        },
        rating: el => {
          const r = el.querySelector("._3LWZlK, [class*='_3LWZlK']")?.innerText?.trim();
          return r ? parseFloat(r) : 0;
        },
        verified: el => {
          return el.innerText?.toLowerCase().includes("certified buyer") || false;
        },
        date: el => {
          const spans = [...el.querySelectorAll("span, p")];
          for (const s of spans) {
            if (/\w+ \d{4}/.test(s.innerText)) return s.innerText.trim().slice(0, 20);
          }
          return "";
        },
        helpfulVotes: el => {
          const t = el.innerText || "";
          const m = t.match(/(\d+)\s*(people|found|helpful)/i);
          return m ? parseInt(m[1]) : 0;
        },
        reviewerName: el => {
          const candidates = ["._2V5EHH", "p._2sc7ZR", "._2NsDsn"];
          for (const sel of candidates) {
            const t = el.querySelector(sel)?.innerText?.trim();
            if (t) return t;
          }
          return "Anonymous";
        },
      },
      fallbackSelectors: ["span.css-1jxf684", "._6K-7Co", ".ZmyHeo", ".qwjRop", "._2-N8zT"],
    },

    meesho: {
      detect: () => location.hostname.includes("meesho"),
      name: "Meesho", color: "#F43397",
      pageMatch: () => location.href.includes("/p/") || location.href.includes("product"),
      productSelector: '[class*="pdp-name"], h1',
      reviewContainerSelector: '[class*="ReviewCard"], [class*="review-card"], [class*="Comment__"]',
      fields: {
        text: el => {
          const candidates = ['[class*="CommentText"]', '[class*="reviewText"]', 'p', 'span'];
          for (const sel of candidates) {
            const t = el.querySelector(sel)?.innerText?.trim();
            if (t && t.length > 10) return t;
          }
          return el.innerText?.trim() || "";
        },
        rating: el => {
          const t = el.querySelector('[class*="Rating"], [class*="rating"], [class*="star"]')?.innerText?.trim();
          return t ? parseFloat(t) : 0;
        },
        verified: () => false,
        date: el => {
          const spans = [...el.querySelectorAll("span, p")];
          for (const s of spans) {
            if (/\d{4}/.test(s.innerText)) return s.innerText.trim().slice(0, 20);
          }
          return "";
        },
        helpfulVotes: () => 0,
        reviewerName: el => el.querySelector('[class*="UserName"], [class*="username"], [class*="Name"]')?.innerText?.trim() || "Anonymous",
      },
      fallbackSelectors: ['span[class*="Comment__CommentText"]', 'div[class*="Comment__CommentText"]', '[class*="ReviewCard"]'],
    },

    myntra: {
      detect: () => location.hostname.includes("myntra"),
      name: "Myntra", color: "#FF3F6C",
      pageMatch: () => location.href.includes("/p/") || location.href.includes("reviews") || location.href.includes("buy"),
      productSelector: "h1.pdp-title, .pdp-name, h1",
      reviewContainerSelector: ".user-review-main, .detailed-reviews-userReviewWrapper, [class*='user-review-main']",
      fields: {
        text: el => {
          const candidates = [".user-review-reviewTextWrapper p", ".review-description", "p[class*='review']", "p"];
          for (const sel of candidates) {
            const t = el.querySelector(sel)?.innerText?.trim();
            if (t && t.length > 10) return t;
          }
          return "";
        },
        rating: el => {
          const r = el.querySelector(".user-review-starRating, [class*='starRating']")?.innerText?.trim();
          return r ? parseFloat(r) : 0;
        },
        verified: () => false,
        date: el => {
          const t = el.querySelector(".user-review-date, [class*='date']")?.innerText?.trim() || "";
          return t.slice(0, 20);
        },
        helpfulVotes: el => {
          const t = el.querySelector("[class*='helpful']")?.innerText || "";
          const m = t.match(/(\d+)/);
          return m ? parseInt(m[1]) : 0;
        },
        reviewerName: el => el.querySelector(".user-review-left-userInfo, [class*='userInfo']")?.innerText?.trim().split("\n")[0] || "Anonymous",
      },
      fallbackSelectors: [".user-review-reviewTextWrapper p", "[class*='reviewText']", ".review-description"],
    },

    ajio: {
      detect: () => location.hostname.includes("ajio"),
      name: "Ajio", color: "#F7622A",
      pageMatch: () => location.href.includes("/p/") || location.href.includes("product"),
      productSelector: ".prod-name, h1, [class*='prod-name']",
      reviewContainerSelector: ".review-container, [class*='review-container'], .prod-review-wrap",
      fields: {
        text: el => {
          const candidates = [".review-desc", ".prod-review-desc", "[class*='review-desc']", "p"];
          for (const sel of candidates) {
            const t = el.querySelector(sel)?.innerText?.trim();
            if (t && t.length > 10) return t;
          }
          return "";
        },
        rating: el => {
          const r = el.querySelector("[class*='rating-count'], [class*='ratingCount']")?.innerText?.trim();
          return r ? parseFloat(r) : 0;
        },
        verified: () => false,
        date: el => {
          const t = el.querySelector("[class*='review-date'], [class*='reviewDate']")?.innerText?.trim() || "";
          return t.slice(0, 20);
        },
        helpfulVotes: () => 0,
        reviewerName: el => el.querySelector("[class*='reviewer-name'], [class*='reviewerName']")?.innerText?.trim() || "Anonymous",
      },
      fallbackSelectors: [".review-desc", "[class*='review-desc']", ".review-comment", "[class*='review-comment']"],
    },
  };

  // ─────────────────────────────────────────────────────────
  // SITE DETECTION
  // ─────────────────────────────────────────────────────────

  function detectSite() {
    for (const [key, cfg] of Object.entries(SITES)) {
      if (cfg.detect()) return { key, ...cfg };
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // DOM SCRAPER — returns array of review objects
  // ─────────────────────────────────────────────────────────

  function scrapeReviews(site) {
    const reviews = [];
    const seen = new Set();

    // ── Strategy 1: structured container scraping ──
    if (site.reviewContainerSelector && site.fields) {
      const containers = document.querySelectorAll(site.reviewContainerSelector);
      containers.forEach(container => {
        try {
          const text = site.fields.text(container);
          if (!text || text.length < 15 || text.length > 3000 || seen.has(text)) return;
          seen.add(text);

          reviews.push({
            text,
            rating: site.fields.rating(container),
            verified: site.fields.verified(container),
            date: site.fields.date(container),
            helpfulVotes: site.fields.helpfulVotes(container),
            reviewerName: site.fields.reviewerName(container),
          });
        } catch (e) { /* skip bad container */ }
      });
    }

    // ── Strategy 2: fallback text-only selectors ──
    if (reviews.length < 3 && site.fallbackSelectors) {
      for (const sel of site.fallbackSelectors) {
        document.querySelectorAll(sel).forEach(el => {
          const text = el.innerText?.trim();
          if (!text || text.length < 15 || text.length > 3000 || seen.has(text)) return;
          if (text.split(" ").length < 3) return;
          seen.add(text);
          reviews.push({ text, rating: 0, verified: false, date: "", helpfulVotes: 0, reviewerName: "Unknown" });
        });
        if (reviews.length >= 5) break;
      }
    }

    // ── Strategy 3: broad DOM fallback ──
    if (reviews.length < 3) {
      document.querySelectorAll("[class*='review'],[class*='Review'],[class*='Comment'],[class*='comment'],[class*='feedback']")
        .forEach(container => {
          container.querySelectorAll("span, p").forEach(el => {
            const text = el.innerText?.trim();
            if (!text || text.length < 20 || text.length > 2000 || seen.has(text)) return;
            if (text.split(" ").length < 3) return;
            if (el.querySelectorAll("span,p").length > 2) return;
            seen.add(text);
            reviews.push({ text, rating: 0, verified: false, date: "", helpfulVotes: 0, reviewerName: "Unknown" });
          });
        });
    }

    return reviews.slice(0, 50);
  }

  function scrapeProductName(site) {
    return document.querySelector(site.productSelector)?.innerText?.trim()?.slice(0, 120) || "this product";
  }

  // ─────────────────────────────────────────────────────────
  // PANEL INJECTION
  // ─────────────────────────────────────────────────────────

  function injectPanel(site) {
    document.getElementById("tl-panel")?.remove();
    const panel = document.createElement("div");
    panel.id = "tl-panel";
    panel.innerHTML = `
      <div class="tl-header" id="tl-drag">
        <div class="tl-header-left">
          <div class="tl-dot"></div>
          <span class="tl-brand">TrustLens</span>
          <span class="tl-badge" style="background:${site.color}20;color:${site.color};border-color:${site.color}50">${site.name}</span>
        </div>
        <button class="tl-close" id="tl-close">✕</button>
      </div>
      <div id="tl-body">
        <div class="tl-loading">
          <div class="tl-dots">
            <div class="tl-pulse"></div>
            <div class="tl-pulse" style="animation-delay:.15s"></div>
            <div class="tl-pulse" style="animation-delay:.3s"></div>
          </div>
          <p class="tl-load-text">Reading reviews from page…</p>
          <p class="tl-load-sub">Extracting ratings · dates · verified status</p>
        </div>
      </div>`;
    document.body.appendChild(panel);
    document.getElementById("tl-close").onclick = () => panel.remove();
    makeDraggable(panel, document.getElementById("tl-drag"));
    return panel;
  }

  // ─────────────────────────────────────────────────────────
  // RENDER RESULTS
  // ─────────────────────────────────────────────────────────

  function showResult(result, productName) {
    const body = document.getElementById("tl-body");
    if (!body) return;

    const C = {
      green:  { accent: "#16a34a", bg: "#f0fdf4", glow: "#16a34a20", border: "#bbf7d0" },
      yellow: { accent: "#d97706", bg: "#fffbeb", glow: "#d9770620", border: "#fde68a" },
      orange: { accent: "#ea580c", bg: "#fff7ed", glow: "#ea580c20", border: "#fed7aa" },
      red:    { accent: "#dc2626", bg: "#fef2f2", glow: "#dc262620", border: "#fecaca" },
    }[result.verdictColor] || { accent: "#d97706", bg: "#fffbeb", glow: "#d9770620", border: "#fde68a" };

    const risk = result.riskScore;
    const circ = Math.PI * 38;
    const offset = circ - (risk / 100) * circ;

    // Top flags
    const flagsHTML = result.topFlags?.length
      ? result.topFlags.map(f =>
          `<div class="tl-flag"><span>⚠</span><span>${f.flag}${f.count > 1 ? ` <em>(${f.count}x)</em>` : ""}</span></div>`
        ).join("")
      : `<div class="tl-flag ok"><span>✓</span><span>No major red flags found</span></div>`;

    // Positive signals
    const posHTML = result.positiveSignals?.length
      ? result.positiveSignals.map(s => `<div class="tl-flag pos"><span>✓</span><span>${s}</span></div>`).join("")
      : "";

    // Rating distribution bar
    const ratingBarHTML = result.totalRated > 0 ? `
      <div class="tl-card">
        <div class="tl-card-t">Rating Distribution</div>
        ${[5,4,3,2,1].map(star => {
          const count = result.ratingCounts[star] || 0;
          const pct = result.totalRated > 0 ? Math.round(count / result.totalRated * 100) : 0;
          const color = star >= 4 ? "#22c55e" : star === 3 ? "#f59e0b" : "#ef4444";
          return `<div class="tl-rating-row">
            <span class="tl-star-lbl">${star}★</span>
            <div class="tl-bar-bg"><div class="tl-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="tl-bar-pct">${pct}%</span>
          </div>`;
        }).join("")}
        ${result.ratingBomb ? `<div style="margin-top:6px;font-size:10px;color:#ef4444">⚠ Suspicious: overwhelmingly 5-star with no low ratings</div>` : ""}
      </div>` : "";

    // Per-review breakdown (show first 8)
    const perReviewHTML = result.perReview?.length ? `
      <div class="tl-card">
        <div class="tl-card-t">Per-Review Breakdown (${result.perReview.length} scanned)</div>
        <div id="tl-reviews-list">
          ${result.perReview.slice(0, 8).map((r, i) => renderReviewRow(r, i)).join("")}
        </div>
        ${result.perReview.length > 8
          ? `<button class="tl-show-more" id="tl-show-more">Show all ${result.perReview.length} reviews ▾</button>`
          : ""}
      </div>` : "";

    body.innerHTML = `
      <div class="tl-product" title="${productName}">${productName}</div>

      <div class="tl-gauge-wrap">
        <svg viewBox="0 0 100 52" class="tl-gauge-svg">
          <path d="M12,48 A38,38 0 0,1 88,48" fill="none" stroke="#e2e8f0" stroke-width="9" stroke-linecap="round"/>
          <path d="M12,48 A38,38 0 0,1 88,48" fill="none" stroke="${C.accent}" stroke-width="9"
            stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" id="tl-gauge-arc"/>
          <text x="50" y="45" text-anchor="middle" fill="${C.accent}"
            style="font-size:17px;font-weight:800;font-family:monospace">${risk}</text>
        </svg>
        <div class="tl-risk-lbl">RISK SCORE</div>
        <div class="tl-verdict" style="color:${C.accent};border-color:${C.border};background:${C.bg}">${result.verdict}</div>
      </div>

      <div class="tl-stats-row">
        <div class="tl-stat"><div class="tl-sn">${result.totalAnalyzed}</div><div class="tl-sl">Scanned</div></div>
        <div class="tl-stat"><div class="tl-sn" style="color:#ef4444">${result.fakeCount}</div><div class="tl-sl">Suspicious</div></div>
        <div class="tl-stat"><div class="tl-sn" style="color:#22c55e">${result.realCount}</div><div class="tl-sl">Genuine</div></div>
      </div>

      ${result.langBreakdown ? `<div class="tl-lang">🌐 ${result.langBreakdown}</div>` : ""}

      <div class="tl-card" style="background:${C.bg};border-color:${C.border}">
        <div class="tl-card-t" style="color:${C.accent}">Verdict</div>
        <p class="tl-summary">${result.summary}</p>
        <p class="tl-rec"><strong>→</strong> ${result.recommendation}</p>
      </div>

      ${result.topFlags?.length ? `<div class="tl-card"><div class="tl-card-t">Red Flags</div>${flagsHTML}</div>` : ""}
      ${posHTML ? `<div class="tl-card"><div class="tl-card-t">Positive Signals</div>${posHTML}</div>` : ""}

      ${ratingBarHTML}
      ${perReviewHTML}

      <div class="tl-footer">Reads DOM directly · No API · 100% private</div>
      <button class="tl-rescan" id="tl-rescan">↻ Re-scan</button>
    `;

    // Gauge animation
    setTimeout(() => {
      const arc = document.getElementById("tl-gauge-arc");
      if (arc) {
        arc.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)";
        arc.style.strokeDashoffset = offset;
      }
    }, 100);

    document.getElementById("tl-rescan")?.addEventListener("click", runAnalysis);

    // Show all reviews toggle
    document.getElementById("tl-show-more")?.addEventListener("click", function () {
      const list = document.getElementById("tl-reviews-list");
      if (list) {
        list.innerHTML = result.perReview.map((r, i) => renderReviewRow(r, i)).join("");
        this.remove();
        // Re-attach expand listeners
        attachExpandListeners(result.perReview);
      }
    });

    // Expand/collapse individual reviews
    attachExpandListeners(result.perReview);
  }

  function renderReviewRow(r, i) {
    const scoreColor = r.fakeScore >= 60 ? "#ef4444" : r.fakeScore >= 40 ? "#f97316" : "#22c55e";
    const label = r.fakeScore >= 45 ? "Suspicious" : "Genuine";
    const stars = r.rating > 0 ? "★".repeat(r.rating) + "☆".repeat(5 - r.rating) : "";
    const verifiedBadge = r.verified ? `<span class="tl-vbadge">✓ Verified</span>` : "";
    const shortText = r.text.length > 90 ? r.text.slice(0, 90) + "…" : r.text;

    return `
      <div class="tl-review-row" data-idx="${i}">
        <div class="tl-review-header">
          <div class="tl-review-meta">
            <span class="tl-reviewer">${r.reviewerName}</span>
            ${verifiedBadge}
            ${stars ? `<span class="tl-stars">${stars}</span>` : ""}
            ${r.date ? `<span class="tl-date">${r.date}</span>` : ""}
          </div>
          <div class="tl-score-badge" style="color:${scoreColor};border-color:${scoreColor}40;background:${scoreColor}12">
            ${r.fakeScore} · ${label}
          </div>
        </div>
        <div class="tl-review-text tl-short-text">${shortText}</div>
        ${r.flags.length || r.positives.length ? `<button class="tl-expand-btn" data-idx="${i}">Details ▾</button>` : ""}
        <div class="tl-review-detail" id="tl-detail-${i}" style="display:none">
          ${r.flags.length ? `<div class="tl-mini-flags">${r.flags.map(f => `<span class="tl-mini-flag bad">⚠ ${f}</span>`).join("")}</div>` : ""}
          ${r.positives.length ? `<div class="tl-mini-flags">${r.positives.map(p => `<span class="tl-mini-flag good">✓ ${p}</span>`).join("")}</div>` : ""}
          ${r.text.length > 90 ? `<div class="tl-full-text">${r.fullText || r.text}</div>` : ""}
        </div>
      </div>`;
  }

  function attachExpandListeners(perReview) {
    document.querySelectorAll(".tl-expand-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const idx = this.dataset.idx;
        const detail = document.getElementById(`tl-detail-${idx}`);
        if (detail) {
          const open = detail.style.display !== "none";
          detail.style.display = open ? "none" : "block";
          this.textContent = open ? "Details ▾" : "Details ▴";
        }
      });
    });
  }

  function showNoReviews() {
    const body = document.getElementById("tl-body");
    if (!body) return;
    body.innerHTML = `
      <div class="tl-empty">
        <div class="tl-empty-icon">📭</div>
        <p>No reviews found on this page.</p>
        <small>Scroll down to load reviews, then re-scan.</small>
        <button class="tl-rescan" id="tl-rescan" style="margin-top:12px">↻ Re-scan</button>
      </div>`;
    document.getElementById("tl-rescan")?.addEventListener("click", runAnalysis);
  }

  // ─────────────────────────────────────────────────────────
  // DRAGGABLE
  // ─────────────────────────────────────────────────────────

  function makeDraggable(panel, handle) {
    let dragging = false, sx, sy, ix, iy;
    handle.addEventListener("mousedown", e => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = panel.getBoundingClientRect(); ix = r.left; iy = r.top;
    });
    document.addEventListener("mousemove", e => {
      if (!dragging) return;
      panel.style.left = `${ix + e.clientX - sx}px`;
      panel.style.top = `${iy + e.clientY - sy}px`;
      panel.style.right = "auto"; panel.style.bottom = "auto";
    });
    document.addEventListener("mouseup", () => { dragging = false; });
  }

  // ─────────────────────────────────────────────────────────
  // MAIN FLOW
  // ─────────────────────────────────────────────────────────

  async function runAnalysis() {
    const site = detectSite();
    if (!site) return;

    // Show or reset loading state
    if (!document.getElementById("tl-panel")) {
      injectPanel(site);
    } else {
      const body = document.getElementById("tl-body");
      if (body) body.innerHTML = `
        <div class="tl-loading">
          <div class="tl-dots">
            <div class="tl-pulse"></div>
            <div class="tl-pulse" style="animation-delay:.15s"></div>
            <div class="tl-pulse" style="animation-delay:.3s"></div>
          </div>
          <p class="tl-load-text">Reading reviews from page…</p>
        </div>`;
    }

    // Small delay to let panel render
    await new Promise(r => setTimeout(r, 700));

    const reviews = scrapeReviews(site);
    const productName = scrapeProductName(site);

    if (reviews.length === 0) { showNoReviews(); return; }

    const result = analyzeAll(reviews);
    showResult(result, productName);
  }

  // Listen for popup button click
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "analyze") {
      const site = detectSite();
      if (!site) { sendResponse({ error: "Not supported" }); return true; }
      if (!document.getElementById("tl-panel")) injectPanel(site);
      runAnalysis();
      sendResponse({ status: "ok" });
    }
    return true;
  });

  // Auto-run on product pages
  const site = detectSite();
  if (site && site.pageMatch()) {
    setTimeout(() => { injectPanel(site); runAnalysis(); }, 2500);
  }

})();
