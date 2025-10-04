# Intervue Poll Backend

A real-time polling system backend built with Node.js, Express, Socket.io, and MongoDB.

## Features

- **Real-time Polling**: Create and manage live polls with real-time results
- **Teacher/Student Roles**: Separate authentication for teachers and students
- **Live Chat**: Real-time chat functionality during polls
- **Poll History**: View past polls and their results
- **Participant Management**: Teachers can kick out participants
- **Timer Support**: Configurable poll timers (30, 60, 90 seconds)

## API Endpoints

### Authentication
- `POST /teacher-login` - Generate teacher session

### Polls
- `GET /polls/:teacherUsername` - Get poll history for a teacher

## Socket.io Events

### Client to Server
- `joinChat` - Join chat room
- `chatMessage` - Send chat message
- `createPoll` - Create a new poll
- `submitAnswer` - Submit poll answer
- `kickOut` - Kick out a participant (teachers only)

### Server to Client
- `pollCreated` - New poll created
- `pollResults` - Updated poll results
- `chatMessage` - New chat message
- `participantsUpdate` - Updated participants list
- `chatHistory` - Recent chat messages
- `kickedOut` - User has been kicked out
- `error` - Error messages

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `env.example`:
```bash
cp env.example .env
```

3. Update the `.env` file with your configuration:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/intervue-poll
FRONTEND_URL=http://localhost:5173
```

4. Make sure MongoDB is running on your system

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## Database Schema

### Poll Model
```javascript
{
  question: String (max 100 chars),
  options: [{
    text: String,
    correct: Boolean,
    votes: Number
  }],
  timer: Number (30-90 seconds),
  teacherUsername: String,
  votes: Map<String, String>,
  totalVotes: Number,
  status: String ('active' | 'completed'),
  createdAt: Date,
  updatedAt: Date
}
```

### Teacher Model
```javascript
{
  username: String (unique),
  pollsCreated: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `FRONTEND_URL` - Frontend URL for CORS

## Development

The server uses nodemon for development with hot reloading:
```bash
npm run dev
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a production MongoDB instance
3. Update `FRONTEND_URL` to your production frontend URL
4. Start with `npm start`

## CORS Configuration

The server is configured to accept requests from the frontend URL specified in `FRONTEND_URL`. Make sure to update this when deploying to production.
