const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  correct: {
    type: Boolean,
    required: true
  },
  votes: {
    type: Number,
    default: 0
  }
});

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    maxlength: 100
  },
  options: [optionSchema],
  timer: {
    type: Number,
    required: true,
    min: 30,
    max: 90
  },
  teacherUsername: {
    type: String,
    required: true
  },
  votes: {
    type: Map,
    of: String,
    default: new Map()
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Poll', pollSchema);
