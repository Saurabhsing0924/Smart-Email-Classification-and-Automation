document.addEventListener('DOMContentLoaded', () => {
  const buttons = {
    'label-rules': 'label-rules.html',
    'forward-rules': 'forward-rules.html',
    'team-forward': 'team-forward.html',
    'templates': 'templates.html',
    'process-email': 'process-email.html',
    'auto-label': 'auto-label.html',
    'settings': 'settings.html'
  };

  Object.keys(buttons).forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      window.location.href = chrome.runtime.getURL(buttons[id]);
    });
  });

  // Update status by checking Gmail auth token
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    const status = document.getElementById('status');
    if (chrome.runtime.lastError || !token) {
      status.textContent = 'Not signed into Gmail. Click Connect Gmail to authenticate.';
    } else {
      status.textContent = 'Gmail connected! Ready to automate.';
    }
  });

  document.getElementById('connect-gmail').addEventListener('click', () => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      const status = document.getElementById('status');
      if (chrome.runtime.lastError || !token) {
        status.textContent = `Gmail sign-in failed: ${chrome.runtime.lastError?.message || 'unknown error'}`;
      } else {
        status.textContent = 'Gmail connected successfully!';
      }
    });
  });
});
