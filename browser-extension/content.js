// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capturePage') {
    capturePageContent()
      .then(content => sendResponse({ success: true, content }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
  
  if (request.action === 'captureVideo') {
    captureVideoContent()
      .then(content => sendResponse({ success: true, content }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
});

// Function to capture page content
async function capturePageContent() {
  // Get the main content of the page
  const content = {
    title: document.title,
    text: getMainContent(),
    metadata: {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      type: 'web'
    }
  };
  
  return content;
}

// Function to capture video content
async function captureVideoContent() {
  const content = {
    title: document.title,
    videoInfo: getVideoInfo(),
    metadata: {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      type: 'video'
    }
  };
  
  return content;
}

// Helper function to get main content
function getMainContent() {
  // Try to find the main content area
  const mainContent = document.querySelector('main, article, .content, #content, .main-content');
  
  if (mainContent) {
    // Get text content and clean it up
    return mainContent.innerText
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Fallback to body content if no main content area found
  return document.body.innerText
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to get video information
function getVideoInfo() {
  const videoInfo = {
    title: document.title,
    duration: null,
    currentTime: null,
    transcript: null
  };
  
  // Try to find video element
  const video = document.querySelector('video');
  
  if (video) {
    videoInfo.duration = video.duration;
    videoInfo.currentTime = video.currentTime;
  }
  
  // Try to find video transcript (common in educational platforms)
  const transcriptElement = document.querySelector('.transcript, .video-transcript, [data-transcript]');
  if (transcriptElement) {
    videoInfo.transcript = transcriptElement.innerText;
  }
  
  return videoInfo;
} 