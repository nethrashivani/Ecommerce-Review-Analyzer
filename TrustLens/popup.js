const SUPPORTED = ["amazon.in", "amazon.com", "flipkart.com", "meesho.com", "myntra.com", "ajio.com"];

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isSupported = SUPPORTED.some(s => tab?.url?.includes(s));

  if (!isSupported) {
    document.getElementById("main").style.display = "none";
    document.getElementById("not-supported").style.display = "block";
    return;
  }

  document.getElementById("analyze-btn").addEventListener("click", async () => {
    const btn = document.getElementById("analyze-btn");
    btn.disabled = true;
    btn.textContent = "Analyzing...";
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "analyze" });
      window.close();
    } catch {
      btn.textContent = "Error — Refresh the page";
      setTimeout(() => { btn.disabled = false; btn.textContent = "🔍 Analyze Reviews"; }, 2000);
    }
  });
}

init();
