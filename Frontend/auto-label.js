// Auto label existing emails
let isLabeling = false;
let abortController = null;

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

function updateProgress(text, percentage = null) {
  document.getElementById('progress-text').textContent = text;
  if (percentage !== null) {
    document.getElementById('progress-fill').style.width = `${percentage}%`;
  }
}

function addResult(message, isSuccess = true) {
  const container = document.getElementById('results-container');
  const resultDiv = document.createElement('div');
  resultDiv.className = `result-item ${isSuccess ? 'success' : 'error'}`;
  resultDiv.textContent = message;
  container.appendChild(resultDiv);
  container.scrollTop = container.scrollHeight;
}

async function getGmailAccessToken() {
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
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  return await response.json();
}

async function getMessageDetails(token, messageId) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch message details: ${response.status}`);
  }

  return await response.json();
}

async function applyLabel(token, messageId, labelName) {
  // First, get or create the label
  const labelsResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!labelsResponse.ok) {
    throw new Error(`Failed to fetch labels: ${labelsResponse.status}`);
  }

  const labelsData = await labelsResponse.json();
  let labelId = null;

  // Check if label exists
  for (const label of labelsData.labels) {
    if (label.name === labelName) {
      labelId = label.id;
      break;
    }
  }

  // Create label if it doesn't exist
  if (!labelId) {
    const createLabelResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      })
    });

    if (!createLabelResponse.ok) {
      throw new Error(`Failed to create label: ${createLabelResponse.status}`);
    }

    const newLabel = await createLabelResponse.json();
    labelId = newLabel.id;
  }

  // Apply the label to the message
  const modifyResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      addLabelIds: [labelId]
    })
  });

  if (!modifyResponse.ok) {
    throw new Error(`Failed to apply label: ${modifyResponse.status}`);
  }
}

function extractEmailContent(message) {
  let subject = '';
  let body = '';
  let sender = '';

  for (const header of message.payload.headers) {
    switch (header.name.toLowerCase()) {
      case 'subject':
        subject = header.value;
        break;
      case 'from':
        sender = header.value;
        break;
    }
  }

  // Extract body text
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        break;
      }
    }
  } else if (message.payload.body.data) {
    body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }

  return { subject, body, sender };
}

async function classifyEmail(content, rules) {
  const { subject, body, sender } = content;
  const manualRules = Array.isArray(rules) ? rules : (rules.manual || []);

  // Check manual keyword rules first
  for (const rule of manualRules) {
    const keywords = Array.isArray(rule.keywords)
      ? rule.keywords
      : rule.keywords.toLowerCase().split(',').map(k => k.trim());
    const textToCheck = `${subject} ${body} ${sender}`.toLowerCase();

    if (keywords.some(keyword => keyword && textToCheck.includes(keyword))) {
      return rule.label;
    }
  }

  // If AI is enabled, use GROQ for classification
  const useAI = await getSetting('use_ai_labeling');
  if (useAI) {
    try {
      const groqApiKey = await getSetting('groq_api_key');
      if (groqApiKey) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [{
              role: 'user',
              content: `Analyze this email and suggest an appropriate label. Consider the content, sender, and context. Return only the label name (e.g., "Work", "Personal", "Important", "Spam", etc.).

Subject: ${subject}
From: ${sender}
Body: ${body.substring(0, 500)}`
            }],
            max_tokens: 50
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiLabel = data.choices[0].message.content.trim();
          return aiLabel;
        }
      }
    } catch (error) {
      console.error('AI classification failed:', error);
    }
  }

  return null; // No label matched
}

async function startAutoLabeling() {
  if (isLabeling) return;

  isLabeling = true;
  abortController = new AbortController();

  document.getElementById('start-labeling').disabled = true;
  document.getElementById('stop-labeling').disabled = false;
  document.getElementById('results-container').innerHTML = '';

  updateProgress('Initializing...', 0);

  try {
    const token = await getGmailAccessToken();
    const rules = await getSetting('label_rules') || [];

    updateProgress('Fetching inbox messages...', 10);

    let messages = [];
    let pageToken = null;

    do {
      const messagesData = await getInboxMessages(token, pageToken);
      if (messagesData.messages) {
        messages.push(...messagesData.messages);
      }
      pageToken = messagesData.nextPageToken;
    } while (pageToken && !abortController.signal.aborted);

    if (messages.length === 0) {
      addResult('No messages found in inbox.', false);
      return;
    }

    updateProgress(`Processing ${messages.length} messages...`, 20);

    let processed = 0;
    const total = messages.length;

    for (const message of messages) {
      if (abortController.signal.aborted) break;

      try {
        const messageDetails = await getMessageDetails(token, message.id);
        const content = extractEmailContent(messageDetails);
        const label = await classifyEmail(content, rules);

        if (label) {
          await applyLabel(token, message.id, label);
          addResult(`Labeled "${content.subject}" as "${label}"`);
        } else {
          addResult(`No label applied to "${content.subject}"`, false);
        }

        processed++;
        const progress = 20 + (processed / total) * 80;
        updateProgress(`Processed ${processed}/${total} messages...`, progress);

      } catch (error) {
        console.error('Error processing message:', error);
        addResult(`Error processing message ${message.id}`, false);
        processed++;
      }
    }

    updateProgress('Auto labeling completed!', 100);
    showStatus('Auto labeling completed successfully!');

  } catch (error) {
    console.error('Auto labeling failed:', error);
    showStatus('Auto labeling failed. Please check your authentication and try again.', true);
  } finally {
    isLabeling = false;
    document.getElementById('start-labeling').disabled = false;
    document.getElementById('stop-labeling').disabled = true;
  }
}

function stopAutoLabeling() {
  if (abortController) {
    abortController.abort();
  }
  isLabeling = false;
  document.getElementById('start-labeling').disabled = false;
  document.getElementById('stop-labeling').disabled = true;
  updateProgress('Stopped by user.', 0);
  showStatus('Auto labeling stopped.');
}

// Initialize
document.getElementById('start-labeling').addEventListener('click', startAutoLabeling);
document.getElementById('stop-labeling').addEventListener('click', stopAutoLabeling);