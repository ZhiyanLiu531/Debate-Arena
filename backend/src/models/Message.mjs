import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ChatRoom",
    index: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },
  username: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ["pro", "con"],
    required: true
  },
  content: {
    type: String,
    required: true
  },
}, { timestamps: true });

messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;