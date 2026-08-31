// Forward rules management
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
        <strong>${rule.department} Department</strong><br>
        Keywords: ${rule.keywords.join(', ')}<br>
        Forward to: ${rule.forward_to}
      </div>
      <button onclick="deleteRule(${index})">Delete</button>
    `;
    list.appendChild(item);
  });
}

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

async function getInboxMessages(token, pageToken = null) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inbox messages: ${response.status}`);
  }

  return await response.json();
}

async function forwardMessage(token, messageId, forwardTo) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/forward`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: forwardTo
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to forward message: ${response.status}`);
  }

  return await response.json();
}

function addForwardResult(message, isSuccess = true) {
  const container = document.getElementById('forward-results');
  const item = document.createElement('div');
  item.className = isSuccess ? 'rule-item' : 'rule-item';
  item.textContent = message;
  container.appendChild(item);
}

async function loadRules() {
  const settings = await getSettings();
  const rules = settings.forward_rules || [];
  renderRules(rules);
  showStatus('Rules loaded.');
}

async function addRule(department) {
  const keywordsInput = document.getElementById(`${department}-keywords`).value.trim();
  const email = document.getElementById(`${department}-email`).value.trim();

  if (!keywordsInput || !email) {
    showStatus('Please fill in keywords and email.', true);
    return;
  }

  const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);
  if (keywords.length === 0) {
    showStatus('Please provide at least one keyword.', true);
    return;
  }

  const settings = await getSettings();
  settings.forward_rules = settings.forward_rules || [];
  settings.forward_rules.push({
    id: `forward-${department}-${Date.now()}`,
    department,
    keywords,
    forward_to: email,
    active: true
  });

  await setSetting('forward_rules', settings.forward_rules);
  renderRules(settings.forward_rules);
  showStatus(`${department} rule added successfully!`);

  // Clear form
  document.getElementById(`${department}-keywords`).value = '';
  document.getElementById(`${department}-email`).value = '';
}

async function deleteRule(index) {
  const settings = await getSettings();
  settings.forward_rules.splice(index, 1);
  await setSetting('forward_rules', settings.forward_rules);
  renderRules(settings.forward_rules);
  showStatus('Rule deleted.');
}

async function startForwarding() {
  const settings = await getSettings();
  const rules = settings.forward_rules || [];

  if (rules.length === 0) {
    showStatus('Please create at least one forward rule before running.', true);
    return;
  }

  showStatus('Fetching inbox messages...');
  document.getElementById('forward-results').innerHTML = '';

  try {
    const token = await getAuthToken();
    let pageToken = null;
    const messages = [];

    do {
      const messagesData = await getInboxMessages(token, pageToken);
      if (messagesData.messages) {
        messages.push(...messagesData.messages);
      }
      pageToken = messagesData.nextPageToken;
    } while (pageToken);

    if (messages.length === 0) {
      showStatus('No inbox messages found.', true);
      return;
    }

    showStatus(`Processing ${messages.length} messages...`);

    for (const msg of messages) {
      try {
        const details = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json());

        const headers = {};
        details.payload.headers.forEach(h => headers[h.name.toLowerCase()] = h.value);
        const subject = headers.subject || '';
        const sender = headers.from || '';
        const rawText = `${subject} ${sender}`.toLowerCase();

        for (const rule of rules) {
          if (!rule.active) continue;
          const keywords = rule.keywords.map(k => k.toLowerCase());
          if (keywords.some(k => rawText.includes(k))) {
            await forwardMessage(token, msg.id, rule.forward_to);
            addForwardResult(`Forwarded message '${subject}' to ${rule.forward_to}`);
            break;
          }
        }
      } catch (error) {
        console.error('Forwarding error', error);
        addForwardResult(`Failed to forward message ID ${msg.id}`, false);
      }
    }

    showStatus('Forwarding process completed.');
  } catch (error) {
    console.error(error);
    showStatus('Forwarding failed. Check Gmail authentication.', true);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', loadRules);
document.getElementById('run-forwarding').addEventListener('click', startForwarding);