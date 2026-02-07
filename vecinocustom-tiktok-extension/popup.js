// VecinoCustom TikTok Helper - Popup Script

const API_URL = 'https://vecinocustom-influencer-platform.vercel.app';
// Backup: 'http://localhost:3000'

let extractedData = null;

// Load extracted data from storage
chrome.storage.local.get(['lastExtractedData'], (result) => {
  if (result.lastExtractedData) {
    extractedData = result.lastExtractedData;
    displayData(extractedData);
    loadCampaigns();
  } else {
    document.getElementById('no-data').style.display = 'block';
  }
});

// Display extracted data
function displayData(data) {
  document.getElementById('no-data').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
  
  document.getElementById('handle').textContent = data.handle ? `@${data.handle}` : 'N/A';
  document.getElementById('views').textContent = data.views ? formatNumber(data.views) : 'N/A';
  document.getElementById('likes').textContent = data.likes ? formatNumber(data.likes) : 'N/A';
  document.getElementById('comments').textContent = data.comments ? formatNumber(data.comments) : 'N/A';
  
  // Pre-fill title if available
  if (data.title) {
    document.getElementById('title-input').value = data.title;
  }
}

// Format numbers (12345 -> 12.3K)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Load campaigns from API
async function loadCampaigns() {
  try {
    const response = await fetch(`${API_URL}/api/campaigns?status=ACTIVE`);
    if (!response.ok) throw new Error('Failed to load campaigns');
    
    const campaigns = await response.json();
    
    const select = document.getElementById('campaign-select');
    select.innerHTML = '<option value="">Selecionar campanha...</option>';
    
    campaigns.forEach(campaign => {
      const option = document.createElement('option');
      option.value = campaign.id;
      option.textContent = campaign.name;
      if (campaign.hashtag) {
        option.textContent += ` (#${campaign.hashtag})`;
      }
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error loading campaigns:', error);
    document.getElementById('campaign-select').innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

// Submit video
document.getElementById('submit-btn').addEventListener('click', async () => {
  if (!extractedData) {
    showStatus('Nenhum dado extraído', 'error');
    return;
  }
  
  const campaignId = document.getElementById('campaign-select').value;
  if (!campaignId) {
    showStatus('Seleciona uma campanha', 'error');
    return;
  }
  
  const cost = document.getElementById('cost-input').value;
  const title = document.getElementById('title-input').value;
  
  // Show loading
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
  
  try {
    const payload = {
      url: extractedData.url,
      title: title || extractedData.title || null,
      platform: 'TIKTOK',
      tiktokHandle: extractedData.handle,
      influencerName: extractedData.handle,
      views: extractedData.views,
      likes: extractedData.likes,
      comments: extractedData.comments,
      shares: extractedData.shares,
      cost: cost ? parseFloat(cost) : null,
      campaignId: campaignId
    };
    
    const response = await fetch(`${API_URL}/api/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add video');
    }
    
    // Success!
    showStatus('✓ Vídeo adicionado com sucesso!', 'success');
    
    // Clear form
    document.getElementById('cost-input').value = '';
    document.getElementById('title-input').value = '';
    document.getElementById('campaign-select').value = '';
    
    // Clear stored data
    chrome.storage.local.remove('lastExtractedData');
    
    // Show main content again after 2 seconds
    setTimeout(() => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('main-content').style.display = 'block';
    }, 2000);
    
  } catch (error) {
    console.error('Error submitting video:', error);
    showStatus(`Erro: ${error.message}`, 'error');
    
    // Show main content again
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
  }
});

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

// Config button (future: allow changing API URL)
document.getElementById('config-btn').addEventListener('click', () => {
  const newUrl = prompt('URL da API:', API_URL);
  if (newUrl) {
    chrome.storage.local.set({ apiUrl: newUrl });
    alert('URL guardado! Reinicia a extensão.');
  }
});
