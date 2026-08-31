// Email templates management
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

async function loadTemplates() {
  const settings = await getSettings();
  let templates = settings.templates || [];
  const container = document.getElementById('templates-container');

  if (templates.length === 0) {
    templates = [
      {
        name: 'Quick Response',
        subject: 'Re: Your request',
        body: 'Thank you for reaching out. I have received your message and will review it shortly. I will follow up with any updates soon.'
      },
      {
        name: 'Meeting Confirmation',
        subject: 'Meeting Confirmation',
        body: 'Thank you for your message. I have scheduled the meeting and will share the agenda in advance. Please let me know if you need any changes.'
      },
      {
        name: 'Support Acknowledgement',
        subject: 'Support Request Received',
        body: 'We have received your support request and are working on it. Our team will get back to you as soon as possible with the next steps.'
      }
    ];
    await setSetting('templates', templates);
  }

  container.innerHTML = '';

  if (templates.length === 0) {
    container.innerHTML = '<p>No templates yet. Add your first template above!</p>';
    return;
  }

  templates.forEach((template, index) => {
    const templateDiv = document.createElement('div');
    templateDiv.className = 'template-item';
    templateDiv.innerHTML = `
      <div>
        <h3>${template.name}</h3>
        <p><strong>Subject:</strong> ${template.subject}</p>
        <p><strong>Body:</strong> ${template.body.substring(0, 100)}${template.body.length > 100 ? '...' : ''}</p>
      </div>
      <div class="template-actions">
        <button onclick="editTemplate(${index})">Edit</button>
        <button onclick="deleteTemplate(${index})" style="background: linear-gradient(45deg, #ff6b6b, #dc3545);">Delete</button>
      </div>
    `;
    container.appendChild(templateDiv);
  });
}

async function saveTemplate() {
  const name = document.getElementById('template-name').value.trim();
  const subject = document.getElementById('template-subject').value.trim();
  const body = document.getElementById('template-body').value.trim();

  if (!name || !subject || !body) {
    showStatus('Please fill in all fields.', true);
    return;
  }

  const settings = await getSettings();
  const templates = settings.templates || [];
  const editingIndex = document.getElementById('template-name').dataset.editingIndex;

  if (editingIndex !== undefined) {
    templates[editingIndex] = { name, subject, body };
    delete document.getElementById('template-name').dataset.editingIndex;
  } else {
    templates.push({ name, subject, body });
  }

  await setSetting('templates', templates);
  clearForm();
  loadTemplates();
  showStatus('Template saved successfully!');
}

function clearForm() {
  document.getElementById('template-name').value = '';
  document.getElementById('template-subject').value = '';
  document.getElementById('template-body').value = '';
  delete document.getElementById('template-name').dataset.editingIndex;
}

async function editTemplate(index) {
  const settings = await getSettings();
  const templates = settings.templates || [];
  const template = templates[index];

  document.getElementById('template-name').value = template.name;
  document.getElementById('template-subject').value = template.subject;
  document.getElementById('template-body').value = template.body;
  document.getElementById('template-name').dataset.editingIndex = index;
}

async function deleteTemplate(index) {
  if (!confirm('Are you sure you want to delete this template?')) return;

  const settings = await getSettings();
  const templates = settings.templates || [];
  templates.splice(index, 1);
  await setSetting('templates', templates);
  loadTemplates();
  showStatus('Template deleted.');
}

// Initialize
document.addEventListener('DOMContentLoaded', loadTemplates);
document.getElementById('save-template').addEventListener('click', saveTemplate);
document.getElementById('clear-form').addEventListener('click', clearForm);