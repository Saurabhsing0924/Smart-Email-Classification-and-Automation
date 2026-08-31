// Background service worker for Email Automation Extension
// Handles OAuth token refresh and background tasks

chrome.runtime.onInstalled.addListener(() => {
  console.log('Email Automation Extension installed');
});

// Optional: Handle token refresh
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  if (!signedIn) {
    // Clear cached tokens if needed
    chrome.storage.local.remove(['gmail_token']);
  }
});