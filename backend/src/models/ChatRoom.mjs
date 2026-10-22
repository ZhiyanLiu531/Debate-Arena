import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  host: {
    type: String,
    required: true
  },
  hostSide: {
    type: String,
    enum: ["pro", "con"],
    required: true
  },
  challengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  challenger: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["active", "pending", "completed"],
    default: "pending"
  },
  evaluation: {
    type: String,
    default: ""
  }
}, { timestamps: true });

chatRoomSchema.index({ createdAt: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;