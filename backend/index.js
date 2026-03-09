require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const diagramRoutes = require('./routes/diagramRoutes');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ──────────── Socket.io — Real-time Collaboration ────────────
const io = new Server(server, {
  cors: { origin: '*' },
});

// Track online users per room
const roomUsers = {};

io.on('connection', (socket) => {
  console.log(`✓ User connected: ${socket.id}`);

  // Join a diagram room
  socket.on('join-room', ({ diagramId, user }) => {
    socket.join(diagramId);
    socket.diagramId = diagramId;
    socket.userData = user || { name: 'Anonymous', color: '#3b82f6' };

    if (!roomUsers[diagramId]) roomUsers[diagramId] = {};
    roomUsers[diagramId][socket.id] = socket.userData;

    // Broadcast updated user list
    io.to(diagramId).emit('room-users', Object.values(roomUsers[diagramId]));
    console.log(`  → ${socket.userData.name} joined room ${diagramId}`);
  });

  // Broadcast cursor movement
  socket.on('cursor-move', ({ x, y }) => {
    if (!socket.diagramId) return;
    socket.to(socket.diagramId).emit('cursor-move', {
      id: socket.id,
      user: socket.userData,
      x,
      y,
    });
  });

  // Broadcast node position changes
  socket.on('node-move', (data) => {
    if (!socket.diagramId) return;
    socket.to(socket.diagramId).emit('node-move', data);
  });

  // Broadcast graph changes (add/remove nodes/edges)
  socket.on('graph-change', (data) => {
    if (!socket.diagramId) return;
    socket.to(socket.diagramId).emit('graph-change', data);
  });

  socket.on('disconnect', () => {
    if (socket.diagramId && roomUsers[socket.diagramId]) {
      delete roomUsers[socket.diagramId][socket.id];
      io.to(socket.diagramId).emit('room-users', Object.values(roomUsers[socket.diagramId]));
      if (Object.keys(roomUsers[socket.diagramId]).length === 0) {
        delete roomUsers[socket.diagramId];
      }
    }
    console.log(`✗ User disconnected: ${socket.id}`);
  });
});

// ──────────── Database ────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/system-design-visualizer';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch((err) => console.error('✗ MongoDB connection error:', err));

// ──────────── Routes ────────────
app.use('/api/auth', authRoutes);
app.use('/api/diagrams', diagramRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────── Start ────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Routes: /api/auth, /api/diagrams, /api/ai\n`);
});
