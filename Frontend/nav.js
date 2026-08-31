function goBack() {
  // Try to go back in history first
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // If no history, close popup (user can click extension icon again)
    window.close();
  }
}
