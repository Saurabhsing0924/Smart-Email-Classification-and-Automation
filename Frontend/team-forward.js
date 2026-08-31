// Team forwarding settings
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

async function loadSettings() {
  const settings = await getSettings();
  const teamForward = settings.team_forward || {};

  document.getElementById('sales-enabled').checked = teamForward.sales?.enabled || false;
  document.getElementById('sales-email').value = teamForward.sales?.email || '';
  document.getElementById('support-enabled').checked = teamForward.support?.enabled || false;
  document.getElementById('support-email').value = teamForward.support?.email || '';
  document.getElementById('engineering-enabled').checked = teamForward.engineering?.enabled || false;
  document.getElementById('engineering-email').value = teamForward.engineering?.email || '';

  showStatus('Settings loaded.');
}

async function saveSettings() {
  const teamForward = {
    sales: {
      enabled: document.getElementById('sales-enabled').checked,
      email: document.getElementById('sales-email').value.trim()
    },
    support: {
      enabled: document.getElementById('support-enabled').checked,
      email: document.getElementById('support-email').value.trim()
    },
    engineering: {
      enabled: document.getElementById('engineering-enabled').checked,
      email: document.getElementById('engineering-email').value.trim()
    }
  };

  await setSetting('team_forward', teamForward);
  await setSetting('team_forward_banner_dismissed', false);
  updateBanner();
  showStatus('Team settings saved successfully!');
}

function updateBanner() {
  const banner = document.getElementById('team-banner');
  const dismissed = localStorage.getItem('team_forward_banner_dismissed') === 'true';
  const anyEnabled = document.getElementById('sales-enabled').checked || document.getElementById('support-enabled').checked || document.getElementById('engineering-enabled').checked;

  if (!anyEnabled && !dismissed) {
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function dismissBanner() {
  localStorage.setItem('team_forward_banner_dismissed', 'true');
  updateBanner();
  showStatus('Banner dismissed.');
}

function onForwardClick() {
  showStatus('Enable a team then save settings to activate forwarding.');
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  updateBanner();
  document.getElementById('sales-enabled').addEventListener('change', updateBanner);
  document.getElementById('support-enabled').addEventListener('change', updateBanner);
  document.getElementById('engineering-enabled').addEventListener('change', updateBanner);
  document.getElementById('banner-dismiss').addEventListener('click', dismissBanner);
  document.getElementById('banner-forward').addEventListener('click', onForwardClick);
});
document.getElementById('save-settings').addEventListener('click', saveSettings);