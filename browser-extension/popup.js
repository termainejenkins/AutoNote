document.addEventListener('DOMContentLoaded', function() {
  const capturePageBtn = document.getElementById('capturePage');
  const captureVideoBtn = document.getElementById('captureVideo');
  const viewNotesBtn = document.getElementById('viewNotes');
  const statusDiv = document.getElementById('status');

  // Capture current page content
  capturePageBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      statusDiv.textContent = 'Capturing page content...';
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'capturePage' });
      
      if (response.success) {
        // Send to backend
        const result = await sendToBackend({
          url: tab.url,
          content: response.content,
          type: 'web'
        });
        
        statusDiv.textContent = 'Page captured successfully!';
      } else {
        statusDiv.textContent = 'Failed to capture page content.';
      }
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
    }
  });

  // Capture video content
  captureVideoBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      statusDiv.textContent = 'Capturing video content...';
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'captureVideo' });
      
      if (response.success) {
        // Send to backend
        const result = await sendToBackend({
          url: tab.url,
          content: response.content,
          type: 'video'
        });
        
        statusDiv.textContent = 'Video content captured successfully!';
      } else {
        statusDiv.textContent = 'Failed to capture video content.';
      }
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
    }
  });

  // View notes
  viewNotesBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/notes' });
  });
});

// Helper function to send data to backend
async function sendToBackend(data) {
  try {
    const response = await fetch('http://localhost:8000/notes/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send data to backend');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending data to backend:', error);
    throw error;
  }
} 