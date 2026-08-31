// Gmail API and Storage utilities
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

async function gmailAPI(endpoint, options = {}) {
  const token = await getAuthToken();
  const url = `https://www.googleapis.com/gmail/v1/users/me/${endpoint}`;
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  }).then(res => res.json());
}

async function groqAPI(prompt) {
  const apiKey = await getSetting('groq_api_key');
  if (!apiKey) throw new Error('GROQ API key not set in settings');

  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mixtral-8x7b-32768',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 256,
      temperature: 0.7
    })
  }).then(res => res.json()).then(data => data.choices[0].message.content);
}

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

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get(null, resolve);
  });
}

// Classification logic (ported from Python)
const STANDARD_LABEL_PATTERNS = {
  "Payment 💰": ["invoice", "payment", "bill", "transaction", "refund"],
  "Action Required ⚠️": ["urgent", "asap", "immediately", "action required"],
  "High Priority 🔴": ["important", "priority", "critical"],
  "Follow-up 🔁": ["follow up", "reminder", "pending"],
  "Approval Needed ✅": ["approve", "approval needed"],
  "Work 📘": ["project", "update", "task", "assignment"],
  "Meeting 📅": ["meeting", "schedule", "appointment"],
  "Deadline ⏳": ["deadline", "due date"],
  "Notification 🔔": ["alert", "notification", "notice"],
  "Security Alert 🔒": ["security", "password", "login attempt"],
  "Promotional 🟡": ["offer", "discount", "sale", "deal", "promo"],
  "Newsletter 📰": ["newsletter", "subscribe"],
  "Order / Delivery 📦": ["order", "shipment", "delivery", "tracking"],
  "Booking 🎫": ["booking", "reservation", "ticket"],
  "Personal 💬": ["hi", "hello", "regards", "how are you"],
  "Greetings 🎉": ["happy birthday", "congratulations"],
  "Spam 🚫": ["unsubscribe", "spam"],
  "FYI ℹ️": ["fyi", "for your information"],
};

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function matchesKeywords(text, keywords) {
  const lowerText = normalizeText(text);
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase().trim()));
}

async function classifyEmail(text, manualRules = [], useAI = true) {
  const normalizedText = normalizeText(text);
  const labels = [];

  // Manual rules
  for (const rule of manualRules) {
    if (rule.active && matchesKeywords(normalizedText, rule.keywords)) {
      labels.push(rule.label);
    }
  }

  // Standard patterns
  for (const [label, keywords] of Object.entries(STANDARD_LABEL_PATTERNS)) {
    if (matchesKeywords(normalizedText, keywords)) {
      labels.push(label);
    }
  }

  // AI suggestion
  if (useAI) {
    try {
      const prompt = `Read the following email and suggest one or more labels from: ${Object.keys(STANDARD_LABEL_PATTERNS).join(', ')}. Return only label names separated by commas. Email: ${text}`;
      const aiResponse = await groqAPI(prompt);
      const aiLabels = aiResponse.split(',').map(l => l.trim()).filter(l => STANDARD_LABEL_PATTERNS[l]);
      labels.push(...aiLabels);
    } catch (error) {
      console.warn('AI labeling failed:', error);
    }
  }

  return [...new Set(labels)];
}

// UI functions
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = isError ? '#ff6b6b' : '#4ecdc4';
}

function renderRules(rules) {
  const list = document.getElementById('rules-list');
  list.innerHTML = '';

  rules.forEach((rule, index) => {
    const item = document.createElement('div');
    item.className = 'rule-item';
    item.innerHTML = `
      <div>
        <strong>${rule.label}</strong><br>
        Keywords: ${rule.keywords.join(', ')}
      </div>
      <button onclick="deleteRule(${index})">Delete</button>
    `;
    list.appendChild(item);
  });
}

async function loadRules() {
  const settings = await getSettings();
  const rules = settings.label_rules || [];
  renderRules(rules);
  showStatus('Rules loaded.');
}

async function addRule() {
  const label = document.getElementById('label-name').value.trim();
  const keywordsInput = document.getElementById('label-keywords').value.trim();

  if (!label || !keywordsInput) {
    showStatus('Please fill in all fields.', true);
    return;
  }

  const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);
  if (keywords.length === 0) {
    showStatus('Please provide at least one keyword.', true);
    return;
  }

  const settings = await getSettings();
  settings.label_rules = settings.label_rules || [];
  settings.label_rules.push({
    id: `label-${Date.now()}`,
    label,
    keywords,
    active: true
  });

  await setSetting('label_rules', settings.label_rules);
  renderRules(settings.label_rules);
  showStatus('Rule added successfully!');

  // Clear form
  document.getElementById('label-name').value = '';
  document.getElementById('label-keywords').value = '';
}

async function deleteRule(index) {
  const settings = await getSettings();
  settings.label_rules.splice(index, 1);
  await setSetting('label_rules', settings.label_rules);
  renderRules(settings.label_rules);
  showStatus('Rule deleted.');
}

// Initialize
document.addEventListener('DOMContentLoaded', loadRules);
document.getElementById('add-rule').addEventListener('click', addRule);