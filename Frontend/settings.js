// Settings management
async function getSetting(key) {
  return new Promise(resolve => {
    chrome.storage.local.get([key], result => resolve(result[key]));
  });
}

async function setSetting(key, value) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = isError ? '#ff6b6b' : '#4ecdc4';
}

async function loadSettings() {
  const settings = await chrome.storage.local.get(null);

  document.getElementById('groq-api-key').value = settings.groq_api_key || '';
  document.getElementById('use-ai-labeling').checked = settings.use_ai_labeling || false;
  document.getElementById('use-ai-reply').checked = settings.use_ai_reply || false;
  document.getElementById('auto-forward-enabled').checked = settings.auto_forward_enabled || false;
  document.getElementById('forward-email').value = settings.forward_email || '';
  document.getElementById('auto-reply-enabled').checked = settings.auto_reply_enabled || false;
  document.getElementById('reply-delay').value = settings.reply_delay || 0;

  showStatus('Settings loaded.');
}

async function saveSettings() {
  const settings = {
    groq_api_key: document.getElementById('groq-api-key').value.trim(),
    use_ai_labeling: document.getElementById('use-ai-labeling').checked,
    use_ai_reply: document.getElementById('use-ai-reply').checked,
    auto_forward_enabled: document.getElementById('auto-forward-enabled').checked,
    forward_email: document.getElementById('forward-email').value.trim(),
    auto_reply_enabled: document.getElementById('auto-reply-enabled').checked,
    reply_delay: parseInt(document.getElementById('reply-delay').value) || 0
  };

  await chrome.storage.local.set(settings);
  showStatus('Settings saved successfully!');
}

async function testApiConnection() {
  const apiKey = document.getElementById('groq-api-key').value.trim();

  if (!apiKey) {
    showStatus('Please enter your GROQ API key first.', true);
    return;
  }

  showStatus('Testing API connection...');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{
          role: 'user',
          content: 'Hello, this is a test message. Please respond with "API connection successful".'
        }],
        max_tokens: 20
      })
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices[0].message.content;
      showStatus('API connection successful! ✓');
    } else {
      throw new Error(`API returned status ${response.status}`);
    }

  } catch (error) {
    console.error('API test failed:', error);
    showStatus('API connection failed. Please check your API key.', true);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('test-api').addEventListener('click', testApiConnection);