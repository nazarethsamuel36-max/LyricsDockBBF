# Song Viewer Presentation System

A two-page presentation system for displaying song lyrics/sections with local communication using BroadcastChannel API.

## Features

- **Control Page** (`/control.html`): Select and broadcast song blocks
- **View Page** (`/view.html`): Display selected blocks in real-time
- **Local Communication**: Uses BroadcastChannel API (no server sync needed)
- **Instant Updates**: No page refresh required

## How to Run

### Option 1: Python Server (Recommended)

```bash
python server.py
```

Then open in your browser:
- Control Page: http://localhost:8000/control.html
- View Page: http://localhost:8000/view.html

### Option 2: Node.js Server

```bash
npx http-server -p 8000
```

### Option 3: Python SimpleHTTPServer

```bash
python -m http.server 8000
```

## Usage

1. Open the control page in one browser tab/window
2. Open the view page in a separate browser tab/window
3. Click on any block in the control page
4. The view page will instantly display the selected content

## Architecture

- Both pages run on the same laptop
- Communication via `BroadcastChannel` API
- No external dependencies or backend required
- Clean, modular implementation for easy extension

## Future Extensions

- Connect to real song data
- Add more block types (pre-chorus, bridge, etc.)
- Add styling options (fonts, colors, themes)
- Add keyboard shortcuts for control page
- Add auto-advance feature
