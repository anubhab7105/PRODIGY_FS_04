// Get username from URL
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username') || 'Guest';

// DOM elements
const chatHistory = document.getElementById('chatHistory');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const onlineCount = document.getElementById('onlineCount');

// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:3000');

// Handle WebSocket connection
ws.addEventListener('open', () => {
  console.log('Connected to chat server');
  
  // Send login message
  ws.send(JSON.stringify({
    type: 'login',
    username: username
  }));
  
  // Show welcome message
  addMessage({
    text: `Welcome to the chat, ${username}!`,
    type: 'system'
  });
});

// Handle incoming messages
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'history':
      data.messages.forEach(addMessage);
      break;
      
    case 'chat':
      addMessage(data);
      break;
      
    case 'system':
      addMessage(data);
      break;
      
    case 'userlist':
      onlineCount.textContent = data.users.length;
      break;
      
    case 'typing':
      showTypingIndicator(data.from);
      break;
  }
});

// Handle connection close
ws.addEventListener('close', () => {
  addMessage({
    text: 'Connection lost. Trying to reconnect...',
    type: 'system'
  });
  
  // Try to reconnect every 3 seconds
  setTimeout(() => window.location.reload(), 3000);
});

// Send message when button is clicked
sendButton.addEventListener('click', sendMessage);

// Send message when Enter is pressed
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Show typing indicator when user is typing
messageInput.addEventListener('input', () => {
  if (messageInput.value.trim() !== '') {
    ws.send(JSON.stringify({
      type: 'typing'
    }));
  }
});

// Functions
function sendMessage() {
  const text = messageInput.value.trim();
  if (text === '') return;
  
  // Add our own message immediately
  addMessage({
    from: username,
    text: text,
    timestamp: new Date().toLocaleTimeString(),
    type: 'chat'
  });
  
  // Send to server
  ws.send(JSON.stringify({
    type: 'message',
    text: text
  }));
  
  // Clear input
  messageInput.value = '';
  typingIndicator.textContent = '';
}

function addMessage(msg) {
  const messageDiv = document.createElement('div');
  
  if (msg.type === 'system') {
    messageDiv.className = 'message system';
    messageDiv.textContent = msg.text;
  } 
  else {
    const isCurrentUser = msg.from === username;
    messageDiv.className = `message ${isCurrentUser ? 'user' : 'other'}`;
    
    messageDiv.innerHTML = `
      <div class="sender">${msg.from}</div>
      <div class="text">${msg.text}</div>
      <div class="time">${msg.timestamp}</div>
    `;
  }
  
  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showTypingIndicator(from) {
  if (from !== username) {
    typingIndicator.textContent = `${from} is typing...`;
    
    // Clear after 3 seconds
    setTimeout(() => {
      if (typingIndicator.textContent.includes(from)) {
        typingIndicator.textContent = '';
      }
    }, 3000);
  }
}