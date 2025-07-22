const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected users and messages
const users = new Map(); // username -> WebSocket
const messageHistory = [];

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Simple login endpoint (for demo only)
app.get('/login', (req, res) => {
  const username = req.query.username;
  if (!username) return res.sendStatus(400);
  
  res.redirect(`/chat.html?username=${username}`);
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  let username = 'Guest';

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'login':
        username = message.username;
        users.set(username, ws);
        broadcastUserList();
        sendHistory(ws);
        broadcast(`${username} joined the chat`, 'system');
        break;
        
      case 'message':
        const newMessage = {
          from: username,
          text: message.text,
          timestamp: new Date().toLocaleTimeString(),
          type: 'chat'
        };
        messageHistory.push(newMessage);
        broadcast(JSON.stringify(newMessage));
        break;
        
      case 'typing':
        broadcast(JSON.stringify({
          type: 'typing',
          from: username
        }), false); // Send to others only
        break;
    }
  });

  ws.on('close', () => {
    users.delete(username);
    broadcastUserList();
    broadcast(`${username} left the chat`, 'system');
  });
});

// Helper functions
function broadcast(message, messageType = 'websocket') {
  const data = messageType === 'system' 
    ? JSON.stringify({ text: message, type: 'system' })
    : message;

  users.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastUserList() {
  const userList = Array.from(users.keys());
  broadcast(JSON.stringify({
    type: 'userlist',
    users: userList
  }));
}

function sendHistory(ws) {
  if (messageHistory.length > 0) {
    ws.send(JSON.stringify({
      type: 'history',
      messages: messageHistory.slice(-20) // Last 20 messages
    }));
  }
}

// Start server
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});