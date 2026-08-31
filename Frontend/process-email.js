// Process email with AI reply generation
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

async function generateReply() {
  const sender = document.getElementById('sender').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const body = document.getElementById('body').value.trim();
  const useAI = document.getElementById('use-ai').checked;

  if (!sender || !subject || !body) {
    showStatus('Please fill in all email fields.', true);
    return;
  }

  showStatus('Generating reply...');

  try {
    const groqApiKey = await getSetting('groq_api_key');
    if (!groqApiKey) {
      showStatus('Please set your GROQ API key in settings.', true);
      return;
    }

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
          content: `Generate a professional email reply to this message:

From: ${sender}
Subject: ${subject}
Body: ${body}

Please provide a helpful and appropriate response.`
        }],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedReply = data.choices[0].message.content;

    document.getElementById('generated-reply-content').textContent = generatedReply;
    document.getElementById('reply-section').style.display = 'block';
    showStatus('Reply generated successfully!');

  } catch (error) {
    console.error('Error generating reply:', error);
    showStatus('Error generating reply. Please check your API key and try again.', true);
  }
}

async function sendReply() {
  const replyContent = document.getElementById('generated-reply-content').textContent;
  const sender = document.getElementById('sender').value.trim();
  const subject = document.getElementById('subject').value.trim();

  if (!replyContent) {
    showStatus('No reply to send.', true);
    return;
  }

  showStatus('Sending reply...');

  try {
    // Get Gmail API access token
    const token = await getGmailAccessToken();
    if (!token) {
      showStatus('Failed to authenticate with Gmail.', true);
      return;
    }

    // Create the reply email
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    const emailContent = `To: ${sender}\nSubject: ${replySubject}\n\n${replyContent}`;

    // Encode the email
    const encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Send the email
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.status}`);
    }

    showStatus('Reply sent successfully!');
    clearForm();

  } catch (error) {
    console.error('Error sending reply:', error);
    showStatus('Error sending reply. Please try again.', true);
  }
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

function editReply() {
  const content = document.getElementById('generated-reply-content');
  const currentText = content.textContent;
  content.innerHTML = `<textarea style="width: 100%; height: 200px; margin-bottom: 10px;">${currentText}</textarea><button onclick="saveEdit()">Save Edit</button>`;
}

function saveEdit() {
  const textarea = document.querySelector('#generated-reply-content textarea');
  const newContent = textarea.value;
  document.getElementById('generated-reply-content').innerHTML = newContent;
}

async function copyReply() {
  const replyContent = document.getElementById('generated-reply-content').textContent;
  try {
    await navigator.clipboard.writeText(replyContent);
    showStatus('Reply copied to clipboard!');
  } catch (error) {
    showStatus('Failed to copy to clipboard.', true);
  }
}

function clearForm() {
  document.getElementById('sender').value = '';
  document.getElementById('subject').value = '';
  document.getElementById('body').value = '';
  document.getElementById('reply-section').style.display = 'none';
  document.getElementById('generated-reply-content').textContent = '';
}

// Initialize
document.getElementById('generate-reply').addEventListener('click', generateReply);
document.getElementById('send-reply').addEventListener('click', sendReply);
document.getElementById('edit-reply').addEventListener('click', editReply);
document.getElementById('copy-reply').addEventListener('click', copyReply);
document.getElementById('clear-form').addEventListener('click', clearForm);