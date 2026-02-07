// VecinoCustom TikTok Helper - Content Script
console.log('VecinoCustom TikTok Helper loaded!');

// Check if we're on a video page
function isVideoPage() {
  return window.location.pathname.includes('/video/');
}

// Extract TikTok data from the page
function extractTikTokData() {
  const data = {
    url: window.location.href,
    platform: 'TIKTOK',
    handle: null,
    username: null,
    views: null,
    likes: null,
    comments: null,
    shares: null,
    title: null
  };

  try {
    // Extract username/handle from URL
    const urlMatch = window.location.pathname.match(/@([^\/]+)/);
    if (urlMatch) {
      data.handle = urlMatch[1];
      data.username = urlMatch[1];
    }

    // Try to extract metrics from various possible selectors
    // TikTok changes their structure often, so we try multiple approaches
    
    // Views (various formats: "12.3K", "1.2M", etc)
    const viewsElements = document.querySelectorAll('[data-e2e="video-views"], [data-e2e="browse-video-view-count"]');
    for (const el of viewsElements) {
      const text = el.textContent.trim();
      const num = parseMetric(text);
      if (num) {
        data.views = num;
        break;
      }
    }

    // Likes
    const likeElements = document.querySelectorAll('[data-e2e="like-count"], [data-e2e="browse-like-count"]');
    for (const el of likeElements) {
      const text = el.textContent.trim();
      const num = parseMetric(text);
      if (num) {
        data.likes = num;
        break;
      }
    }

    // Comments
    const commentElements = document.querySelectorAll('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]');
    for (const el of commentElements) {
      const text = el.textContent.trim();
      const num = parseMetric(text);
      if (num) {
        data.comments = num;
        break;
      }
    }

    // Shares
    const shareElements = document.querySelectorAll('[data-e2e="share-count"], [data-e2e="browse-share-count"]');
    for (const el of shareElements) {
      const text = el.textContent.trim();
      const num = parseMetric(text);
      if (num) {
        data.shares = num;
        break;
      }
    }

    // Title/Description
    const titleElements = document.querySelectorAll('[data-e2e="video-title"], [data-e2e="browse-video-desc"]');
    for (const el of titleElements) {
      const text = el.textContent.trim();
      if (text && text.length > 0) {
        data.title = text.substring(0, 200); // Limit to 200 chars
        break;
      }
    }

    // If still no username, try from page meta
    if (!data.handle) {
      const authorLink = document.querySelector('a[href*="/@"]');
      if (authorLink) {
        const match = authorLink.href.match(/@([^\/\?]+)/);
        if (match) {
          data.handle = match[1];
          data.username = match[1];
        }
      }
    }

  } catch (error) {
    console.error('Error extracting TikTok data:', error);
  }

  return data;
}

// Parse metric strings like "12.3K", "1.2M" to numbers
function parseMetric(text) {
  if (!text) return null;
  
  // Remove any non-numeric characters except K, M, B, decimal point
  text = text.replace(/[^0-9KMB.]/gi, '');
  
  if (!text) return null;
  
  const num = parseFloat(text);
  if (isNaN(num)) return null;
  
  if (text.includes('K') || text.includes('k')) {
    return Math.round(num * 1000);
  } else if (text.includes('M') || text.includes('m')) {
    return Math.round(num * 1000000);
  } else if (text.includes('B') || text.includes('b')) {
    return Math.round(num * 1000000000);
  }
  
  return Math.round(num);
}

// Create floating button
function createFloatingButton() {
  // Remove existing button if any
  const existing = document.getElementById('vecinocustom-btn');
  if (existing) existing.remove();

  const button = document.createElement('button');
  button.id = 'vecinocustom-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 5v14M5 12h14"/>
    </svg>
    <span>Adicionar ao VecinoCustom</span>
  `;
  
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  };

  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };

  button.onclick = () => {
    const data = extractTikTokData();
    
    // Send to extension popup via chrome.storage
    chrome.storage.local.set({ 
      lastExtractedData: data,
      extractedAt: Date.now()
    }, () => {
      // Open popup by sending message to background
      chrome.runtime.sendMessage({
        action: 'openPopup',
        data: data
      });
      
      // Visual feedback
      button.innerHTML = '✓ Dados capturados!';
      button.style.background = 'linear-gradient(135deg, #34d399 0%, #10b981 100%)';
      setTimeout(() => {
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>Adicionar ao VecinoCustom</span>
        `;
        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }, 2000);
    });
  };

  document.body.appendChild(button);
}

// Initialize
function init() {
  if (isVideoPage()) {
    // Wait a bit for TikTok to load content
    setTimeout(() => {
      createFloatingButton();
    }, 2000);
  }
}

// Watch for URL changes (TikTok is SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    init();
  }
}).observe(document, { subtree: true, childList: true });

// Initial load
init();
