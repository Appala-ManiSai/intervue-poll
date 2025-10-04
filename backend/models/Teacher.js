const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  pollsCreated: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Teacher', teacherSchema);
