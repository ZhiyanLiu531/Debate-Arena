import mongoose from 'mongoose';

const aiDebateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  username: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  userSide: {
    type: String,
    enum: ["pro", "con"],
    required: true
  },
  aiSide: {
    type: String,
    enum: ["pro", "con"],
    required: true
  },
  messages: [
    {
      role: {
        type: String,
        enum: ["user", "ai"],
        required: true
      },
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  status: {
    type: String,
    enum: ["active", "completed"],
    default: "active"
  },
  evaluation: {
    type: String,
    default: ""
  }
}, { timestamps: true });

aiDebateSchema.index({ createdAt: -1 });
aiDebateSchema.index({ userId: 1, createdAt: -1 });

const AIDebate = mongoose.model('AIDebate', aiDebateSchema);

export default AIDebate;
