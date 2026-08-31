# Email Automation Chrome Extension

A comprehensive Chrome extension for automating email management with AI-powered features including auto-labeling, forwarding, and reply generation.

## Features

- 🏷️ **Smart Labeling**: Manual keyword rules + AI-powered content analysis
- ➡️ **Auto Forwarding**: Department-wise and team-based forwarding rules
- 🤖 **AI Replies**: Generate intelligent responses using GROQ AI
- 📝 **Templates**: Manage and use custom email templates
- 🔄 **Auto Processing**: Process emails with AI-generated replies
- ⚙️ **Settings**: Configure API keys and automation preferences

## Installation

1. **Download the Extension**
   - Clone or download this repository
   - Navigate to the `frontend` folder

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `frontend` folder

3. **Setup OAuth for Gmail**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Add your domain to authorized origins: `chrome-extension://[YOUR_EXTENSION_ID]`
   - Copy the Client ID

4. **Configure the Extension**
   - Click the extension icon in Chrome toolbar
   - Go to Settings (⚙️)
   - Enter your GROQ API key (get from [GROQ Console](https://console.groq.com/))
   - Test the API connection
   - Configure other settings as needed

## Usage

### Auto Labeling
- Set up labeling rules with keywords or AI analysis
- Use "Auto Label Inbox" to scan and label existing emails
- New emails can be processed automatically

### Forward Rules
- Configure department-wise forwarding (Sales, Support, Engineering)
- Set up team forwarding toggles
- Define keyword-based forwarding rules

### AI Reply Generation
- Use "Process Email" to generate AI-powered replies
- Copy, edit, or send replies directly
- Access saved templates for common responses

### Templates
- Create and manage email templates
- Use templates for consistent responses
- Edit and organize your template library

## API Keys Required

- **GROQ API Key**: For AI features (labeling, reply generation)
  - Get from: https://console.groq.com/
  - Free tier available

## Permissions

The extension requires these permissions:
- `identity`: OAuth authentication with Gmail
- `storage`: Local settings storage
- `https://www.googleapis.com/*`: Gmail API access
- `https://api.groq.com/*`: GROQ AI API access

## Security Notes

- API keys are stored locally in Chrome storage
- OAuth tokens are managed by Chrome's identity API
- No data is sent to external servers except Gmail and GROQ APIs
- All processing happens locally in your browser

## Troubleshooting

**Extension not loading?**
- Ensure manifest.json is valid JSON
- Check that all required files are present
- Try reloading the extension

**Gmail authentication failing?**
- Verify OAuth client ID is correct
- Check authorized origins include your extension ID
- Ensure Gmail API is enabled in Google Cloud Console

**AI features not working?**
- Verify GROQ API key is entered correctly
- Test API connection in settings
- Check your GROQ account has credits

## Development

To modify the extension:
- Edit HTML/CSS/JS files in the `frontend` folder
- Reload the extension in `chrome://extensions/`
- Test changes in a new tab

## Commercial Use

This extension is designed for commercial distribution:
- Self-contained (no external server required)
- Portable folder-based installation
- Professional UI suitable for business use
- Configurable for different organizations

## Support

For issues or questions:
- Check the troubleshooting section
- Verify API configurations
- Ensure all permissions are granted

## License

This project is open source. Modify and distribute as needed for your use case.