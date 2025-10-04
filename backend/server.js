const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intervue-poll', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Import models
const Poll = require('./models/Poll');
const Teacher = require('./models/Teacher');

// Store active polls and participants
const activePolls = new Map();
const participants = new Set();
const chatMessages = [];

// Routes
app.post('/teacher-login', async (req, res) => {
  try {
    // Generate a unique teacher username
    const teacherUsername = `teacher_${Date.now()}`;
    
    // Create or find teacher
    let teacher = await Teacher.findOne({ username: teacherUsername });
    if (!teacher) {
      teacher = new Teacher({ username: teacherUsername });
      await teacher.save();
    }
    
    res.json({ username: teacherUsername });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/polls/:teacherUsername', async (req, res) => {
  try {
    const { teacherUsername } = req.params;
    const polls = await Poll.find({ teacherUsername }).sort({ createdAt: -1 });
    res.json({ data: polls });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle chat functionality
  socket.on('joinChat', ({ username }) => {
    participants.add(username);
    socket.username = username;
    socket.join('chat');
    
    // Send updated participants list to all clients
    io.emit('participantsUpdate', Array.from(participants));
    
    // Send recent chat messages to the new user
    socket.emit('chatHistory', chatMessages.slice(-50)); // Last 50 messages
  });

  socket.on('chatMessage', (message) => {
    const chatMessage = {
      ...message,
      timestamp: new Date(),
      id: Date.now()
    };
    
    chatMessages.push(chatMessage);
    
    // Keep only last 100 messages in memory
    if (chatMessages.length > 100) {
      chatMessages.shift();
    }
    
    io.to('chat').emit('chatMessage', chatMessage);
  });

  // Handle poll creation
  socket.on('createPoll', async (pollData) => {
    try {
      const { question, options, timer, teacherUsername } = pollData;
      
      // Create poll in database
      const poll = new Poll({
        question,
        options: options.map(opt => ({
          text: opt.text,
          correct: opt.correct,
          votes: 0
        })),
        timer: parseInt(timer),
        teacherUsername,
        votes: {},
        totalVotes: 0
      });
      
      await poll.save();
      
      // Store in active polls
      activePolls.set(poll._id.toString(), {
        ...poll.toObject(),
        votes: {},
        totalVotes: 0
      });
      
      // Emit to all connected clients
      io.emit('pollCreated', {
        _id: poll._id,
        question,
        options: poll.options,
        timer: parseInt(timer)
      });
      
      // Set timer to end poll
      setTimeout(() => {
        endPoll(poll._id.toString());
      }, parseInt(timer) * 1000);
      
    } catch (error) {
      console.error('Error creating poll:', error);
      socket.emit('error', { message: 'Failed to create poll' });
    }
  });

  // Handle answer submission
  socket.on('submitAnswer', async (data) => {
    try {
      const { username, option, pollId } = data;
      
      if (!activePolls.has(pollId)) {
        socket.emit('error', { message: 'Poll not found or expired' });
        return;
      }
      
      const poll = activePolls.get(pollId);
      
      // Check if user already voted
      if (poll.votes[username]) {
        socket.emit('error', { message: 'You have already voted' });
        return;
      }
      
      // Record vote
      poll.votes[username] = option;
      poll.totalVotes++;
      
      // Update option vote count
      const optionIndex = poll.options.findIndex(opt => opt.text === option);
      if (optionIndex !== -1) {
        poll.options[optionIndex].votes++;
      }
      
      // Update database
      await Poll.findByIdAndUpdate(pollId, {
        votes: poll.votes,
        totalVotes: poll.totalVotes,
        options: poll.options
      });
      
      // Emit updated results to all clients
      const voteCounts = {};
      poll.options.forEach(opt => {
        voteCounts[opt.text] = opt.votes;
      });
      
      io.emit('pollResults', voteCounts);
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });

  // Handle kick out functionality
  socket.on('kickOut', (username) => {
    if (socket.username && socket.username.startsWith('teacher')) {
      // Find and disconnect the user
      const userSockets = Array.from(io.sockets.sockets.values())
        .filter(s => s.username === username);
      
      userSockets.forEach(userSocket => {
        userSocket.emit('kickedOut');
        userSocket.disconnect();
      });
      
      // Remove from participants
      participants.delete(username);
      io.emit('participantsUpdate', Array.from(participants));
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.username) {
      participants.delete(socket.username);
      io.emit('participantsUpdate', Array.from(participants));
    }
  });
});

// Helper function to end poll
async function endPoll(pollId) {
  try {
    const poll = activePolls.get(pollId);
    if (poll) {
      // Update final results in database
      await Poll.findByIdAndUpdate(pollId, {
        status: 'completed',
        votes: poll.votes,
        totalVotes: poll.totalVotes,
        options: poll.options
      });
      
      // Remove from active polls
      activePolls.delete(pollId);
      
      console.log(`Poll ${pollId} ended`);
    }
  } catch (error) {
    console.error('Error ending poll:', error);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
