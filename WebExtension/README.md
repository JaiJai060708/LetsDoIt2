# LetsDoIt Web Extension

A browser extension that provides quick access to your daily tasks and happiness tracking.

## Features

### Popup Page (Daily Task List)
- View tasks organized by: Overdue, Today, Tomorrow, Upcoming, Someday
- Collapsible sections with task counts
- Add new tasks quickly
- Mark tasks as complete
- Delete tasks
- Happiness reminder for daily mood tracking
- Full happiness survey with 10-point scale

### Options Page
- **Google Drive Sync**: Two-way sync with your Google Drive backup
  - Read link: Paste your Google Drive shared file link
  - Write endpoint (Advanced): Google Apps Script Web App URL for pushing data
- **Auto-sync**: Enable automatic sync on extension load
- **Delete All Data**: Clear all tasks, habits, and settings

## Installation

### Chrome / Edge / Brave
1. Open `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `WebExtension` folder

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `WebExtension` folder

## Setting Up Icons

The extension requires PNG icons in the following sizes:
- icon16.png (16x16)
- icon32.png (32x32)
- icon48.png (48x48)
- icon128.png (128x128)

You can create these from the included `icon.svg`:

```bash
# Using ImageMagick
convert -background none -resize 16x16 icons/icon.svg icons/icon16.png
convert -background none -resize 32x32 icons/icon.svg icons/icon32.png
convert -background none -resize 48x48 icons/icon.svg icons/icon48.png
convert -background none -resize 128x128 icons/icon.svg icons/icon128.png
```

Or use any SVG to PNG converter online.

## Setting Up Google Drive Sync

### For Reading (Pull)
1. Export your data from the main LetsDoIt app
2. Upload the JSON file to Google Drive
3. Right-click the file → Share → "Anyone with the link can view"
4. Copy the share link and paste it in the extension options

### For Writing (Push) - Advanced
1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Paste the script from the Setup Guide in the options page
4. Deploy as a Web App (Execute as: Me, Access: Anyone)
5. Copy the Web App URL and paste it in the Write Endpoint field

## Data Storage

The extension uses IndexedDB for local storage, with the same database schema as the main LetsDoIt app. This allows both the web app and extension to share data.

## Development

### File Structure
```
WebExtension/
├── manifest.json       # Extension manifest
├── popup.html          # Popup page HTML
├── options.html        # Options page HTML
├── css/
│   ├── popup.css       # Popup styles
│   └── options.css     # Options styles
├── js/
│   ├── popup.js        # Popup functionality
│   ├── options.js      # Options functionality
│   ├── database.js     # IndexedDB & sync operations
│   ├── dateUtils.js    # Date utility functions
│   └── habitUtils.js   # Habit tracking utilities
└── icons/
    ├── icon.svg        # Source icon
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## License

Part of the LetsDoIt.xyz project.

