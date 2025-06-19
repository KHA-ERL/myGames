const express = require('express');
const http = require('http');
const { Server } = require('socket.io');  // <-- Socket.IO

const app = express();
const server = http.createServer(app);    // Create raw HTTP server
const io = new Server(server);            // Attach Socket.IO

const port = 3000;

// Serve static files
app.use(express.static('public'));

// Render a view (if using EJS)
app.set('view engine', 'ejs');
app.get('/', (req, res) => {
  res.render('index');
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('chat message', (msg) => {
    console.log('Message received:', msg);
    io.emit('chat message', msg); // Broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
