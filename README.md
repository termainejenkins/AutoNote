# AutoNote

AutoNote is an intelligent note-taking application that automatically generates notes for you as you read or study during web browsing, Coursera courses, and video content.

## Features

- Automatic note generation from web content
- Coursera course content integration
- Video transcription and summarization
- Browser extension for seamless web content capture
- Modern web interface for note management
- AI-powered content summarization

## Project Structure

```
autonote/
├── backend/           # FastAPI backend service
├── frontend/         # React frontend application
├── browser-extension/ # Chrome extension for web capture
└── docs/             # Documentation
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- Chrome browser (for extension)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Browser Extension Setup

1. Navigate to the browser-extension directory
2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the browser-extension directory

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 