import ChatRoom from '../models/ChatRoom.mjs';
import Message from '../models/Message.mjs';
import User from '../models/User.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "dotenv";

dotenv.config();
if (!process.env.GEMINI_API_KEY) {
  console.warn('[AI DEBATE] WARNING: GEMINI_API_KEY is not set in environment variables. AI Debate features will not work.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// the multiple msg/update queues for each room and their members
// for the sake of possibly adding webrtc peer to peer make the 
// a queue for each member of a room to distinguish between who the
// message was intended for

/* updates will have the form:
{
  type: string,
  update: any
}

type to help distinguish between chat messages, someone joining
the chatroom, someone leaving (and time permiting peer-to-peer
video offers, answers, and ice).

Note: since there are only two people per room client can assume
that any updates that are directed to them is from the other person
in the room

*/
const pollQueues = new Map();

function enqueueUpdate(roomId, userId, update) {
  const key = `${roomId}:${userId}`;
  const list = pollQueues.get(key) ?? [];
  list.push(update);
  pollQueues.set(key, list);
  console.log('[CHATS] enqueueUpdate:', { key, queuedCount: list.length, updateType: update.type, update });
}

function dequeueUpdate(roomId, userId) {
  const key = `${roomId}:${userId}`;
  const list = pollQueues.get(key);
  if (!list || list.length === 0) return undefined;
  const newMsg = list.shift();
  if (!list.length) pollQueues.delete(key);
  else pollQueues.set(key, list);
  console.log('[CHATS] dequeueUpdate:', { key, remaining: list ? list.length : 0, returned: newMsg });
  return newMsg;
}

/**
 * This logic was previously hardcoded and not extensible. What if we later add
 * spectators, moderators, or multi-sided debates? The Strategy Design Pattern lets
 * us swap in different "side resolution" algorithms without touching
 * sendMessage
 */ 
const SideStrategies = {
  twoParty: (room, userId) => {
    if ((room.hostId.equals(userId) && room.hostSide === "con") ||
        (!room.hostId.equals(userId) && room.hostSide === "pro")) {
      return "con";
    }
    return "pro";
  },

  // Easy to add later:
  // multiSide: (room, userId) => { future logic },
  // spectator: (room, userId) => "observer"
};

export async function joinChat(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const { userId, username } = req.session;

    console.log('[CHATS] joinChat called:', { roomId, userId, username });

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      console.log('[CHATS] ❌ Room not found:', roomId);
      return res.status(404).json({
        error: 'Chatroom not found.'
      });
    }

    if (room.status === "completed") {
      console.log('[CHATS] ⚠️ Chatroom already ended.');
      return res.status(403).json({
        error: 'Chatroom has ended.'
      });
    }

    if (room.challengerId !== null && !room.challengerId.equals(userId)
      && !room.hostId.equals(userId)) {
      console.log('[CHATS] ⚠️ Room full or user not authorized');
      return res.status(403).json({
        error: 'Chatroom is full.'
      });
    }

    // Check if user is blocked by host or vice versa
    const host = await User.findById(room.hostId);
    const joiningUser = await User.findById(userId);
    
    if (host && joiningUser) {
      const hostBlockedJoiner = host.blockedUsers?.some(id => id.equals(userId));
      const joinerBlockedHost = joiningUser.blockedUsers?.some(id => id.equals(room.hostId));
      
      if (hostBlockedJoiner || joinerBlockedHost) {
        console.log('[CHATS] ⚠️ User blocked');
        return res.status(403).json({
          error: 'Cannot join this room.'
        });
      }
    }

    // if the user is already in the room don't go through notifying
    // the host or make changes to db
    if (!room.hostId.equals(userId) && (room.challengerId === null)) {
      room.challengerId = userId;
      room.challenger = username;
      room.status = "active";
      await room.save();
      console.log('[CHATS] ✓ User joined room:', { roomId, username });

      const update = {
        type: "join",
        text: username
      };

      enqueueUpdate(roomId, room.hostId.toString(), update);
    }

    res.status(201).json({
      message: 'Room joined successfully.',
      room: room.toJSON()
    });

  } catch(err) {
    console.error('[CHATS] ❌ Error joining room:', err);
    res.status(500).json({
      error: 'An error occurred while joining the room.'
    });
  }
}

export async function leaveChat(req, res, next) {
  try{
    const roomId = req.params.roomId;
    const { userId, username } = req.session;

    console.log('[CHATS] leaveChat called:', { roomId, userId, username });

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      console.log('[CHATS] ❌ Room not found:', roomId);
      return res.status(404).json({
        error: 'Chatroom not found.'
      });
    }

    if (!(room.challengerId !== null && room.challengerId.equals(userId)) && !room.hostId.equals(userId)){
      console.log('[CHATS] ⚠️ User not authorized');
      return res.status(403).json({
        error: 'Not a member of the room.'
      });
    }
    if (room.status !== "completed") {
      const otherId = room.hostId.equals(userId) ? room.challengerId : room.hostId;
      room.status = "completed";
      await room.save();

      const update = {
        type: "leave",
        text: username
      };
      if (otherId) enqueueUpdate(roomId, otherId.toString(), update);
    }
    res.status(201).json({
      message: 'Room left successfully.',
      room: room.toJSON()
    });
  } catch(err) {
    console.error('[CHATS] ❌ Error leaving room:', err);
    res.status(500).json({
      error: 'An error occurred while leaving the room.'
    });
  }
}

export async function createRoom(req, res, next) {
  try {
    const { userId, username } = req.session;
    const { topicId, title, hostSide } = req.body;

    console.log('[CHATS] createRoom called:', {
      body: req.body,
      userId,
      username,
    });

    if (!title || !topicId || !hostSide) {
      console.log('[CHATS] ❌ Missing parameters:', { title, topicId, hostSide });
      return res.status(400).json({
        error: 'Missing parameters in the request body'
      });
    }

    if (!["pro", "con"].includes(hostSide)) {
      console.log('[CHATS] ❌ Invalid hostSide:', hostSide);
      return res.status(400).json({
        error: 'Incorrect parameters in the request body'
      });
    }

    const room = new ChatRoom({
      topicId,
      title,
      hostId: userId,
      host: username,
      hostSide
    });

    await room.save();
    console.log('[CHATS] ✓ Room created:', room._id);

    res.status(201).json({
      message: "Room creation succesful.",
      room: room.toJSON()
    });
  } catch(err) {
    console.error('[CHATS] ❌ Error creating room:', err);
    res.status(500).json({
      error: 'An error occurred while creating the room.'
    });
  }
}

export async function getRoomById(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const { userId } = req.session;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Chatroom not found.'
      });
    }

    // Only allow access if user is a participant
    if (!(room.challengerId !== null && room.challengerId.equals(userId)) && !room.hostId.equals(userId)) {
      return res.status(403).json({
        error: 'Not a member of the room.'
      });
    }

    res.status(200).json(room.toJSON());
  } catch(err) {
    console.error(err);
    res.status(500).json({
      error: 'An error occurred while fetching the room.'
    });
  }
}

export async function pollChat(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const { userId, username } = req.session;
    const start = Date.now();

    console.log('[CHATS] pollChat called:', { roomId, userId: String(userId), username: String(username), sessionId: req.sessionID });
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Chatroom not found.'
      });
    }

    if (!(room.challengerId !== null && room.challengerId.equals(userId)) && !room.hostId.equals(userId)) {
      return res.status(403).json({
        error: 'Not a member of the room.'
      });
    }

    // function checks for any updates specifically for the user
    function checkUpdate() {
      const msg = dequeueUpdate(roomId, String(userId));
      if (msg) {
        res.json(msg);
        return true;
      }
      return false;
    }

    // check immediately for any updates for the user
    if (checkUpdate()) return;

    const interval = setInterval(() => {
      if (Date.now() - start > 30000) {
        // no new message after 30 seconds client needs to repoll
        clearInterval(interval);
        return res.json({ message: "no-update" });
      }
      if (checkUpdate()) {
        // we did get an update and it was sent
        clearInterval(interval);
      }
    }, 1000);
  } catch(err) {
    console.error(err);
    res.status(500).json({
      error: 'An error occurred while polling the room.'
    });
  }
}

export async function sendMessage(req, res, next) {
  try {
    const roomId = req.params.roomId;
    const text = req.body.text;
    const { userId, username } = req.session;

    console.log('[CHATS] sendMessage called:', { roomId, userId, username, textLength: text?.length });

    if (!text) {
      console.log('[CHATS] ❌ No text provided');
      return res.status(400).json({
        error: 'Missing parameters in the request body'
      });
    }

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      console.log('[CHATS] ❌ Room not found:', roomId);
      return res.status(404).json({
        error: 'Chatroom not found.'
      });
    }

    if (!(room.challengerId !== null && room.challengerId.equals(userId)) && !room.hostId.equals(userId)) {
      console.log('[CHATS] ⚠️ User not in room');
      return res.status(403).json({
        error: 'Not a member of the room.'
      });
    }

    if (room.status === "completed") {
      console.log('[CHATS] ⚠️ Chatroom already ended.');
      return res.status(403).json({
        error: 'Chatroom has ended.'
      });
    }

    const resolveSide = SideStrategies.twoParty;
    const side = resolveSide(room, userId);

    const otherId = room.hostId.equals(userId) ? room.challengerId : room.hostId;

    const message = new Message({
      roomId,
      userId,
      username,
      side,
      content: text
    });
    // Enqueue a lightweight interim update to reduce visibility race on the opponent
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const interimUpdate = {
      type: "chat",
      _id: tempId,
      username,
      text: text,
      side,
      createdAt: new Date().toISOString(),
      interim: true
    };
    if (otherId !== null) {
      enqueueUpdate(roomId, otherId.toString(), interimUpdate);
    }

    await message.save();
    console.log('[CHATS] ✓ Message saved:', { messageId: message._id, side });

    // Include the authoritative saved message object in the update payload
    const msgObj = message.toObject ? message.toObject() : JSON.parse(JSON.stringify(message));
    // Normalize fields to safe JSON values
    if (msgObj._id) msgObj._id = String(msgObj._id);
    if (msgObj.createdAt && msgObj.createdAt.toISOString) msgObj.createdAt = msgObj.createdAt.toISOString();

    const update = {
      type: "chat",
      msg: msgObj,
      // keep some convenience fields for backward-compat
      _id: msgObj._id,
      username: msgObj.username,
      text: msgObj.content || msgObj.text,
      side: msgObj.side,
      createdAt: msgObj.createdAt
    };

    if (otherId !== null) {
      enqueueUpdate(roomId, otherId.toString(), update);
    }

    res.status(201).json({
      message: 'Message sent successfully.',
      msg: message.toJSON()
    });
  } catch(err) {
    console.error('[CHATS] ❌ Error sending message:', err);
    res.status(500).json({
      error: 'An error occurred while messaging the room.'
    });
  }
}

export async function getMessages(req, res, next) {
  try{
    const roomId = req.params.roomId;
    const { userId, username } = req.session;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    console.log('[CHATS] getMessages called:', { roomId, page, limit, userId, username });

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      console.log('[CHATS] ❌ Room not found:', roomId);
      return res.status(404).json({
        error: 'Chatroom not found.'
      });
    }

    if (!(room.challengerId !== null && room.challengerId.equals(userId)) && !room.hostId.equals(userId)) {
      console.log('[CHATS] ⚠️ User not authorized to view messages');
      return res.status(403).json({
        error: 'Not a member of the room.'
      });
    }

    const [messages, total] = await Promise.all([
      Message.find({ roomId: roomId })
      .skip(page * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
      Message.countDocuments({ roomId: roomId })
    ]);

    console.log('[CHATS] ✓ Retrieved messages:', { count: messages.length, total });

    return res.status(200).json({
      messages,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch(err) {
    console.error('[CHATS] ❌ Error getting messages:', err);
    res.status(500).json({
      error: 'An error occurred while getting the room messages.'
    });
  }
}

export async function getChatHistory(req, res, next) {
  try {
    const { userId, username } = req.session;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const [history, total] = await Promise.all([
      ChatRoom.find({ $or: [{challengerId: userId}, {hostId: userId}] })
      .skip(page * limit)
      .limit(limit)
      .sort({ updatedAt: -1 }),
      ChatRoom.countDocuments({ $or: [{challengerId: userId}, {hostId: userId}] })
    ]);

    return res.status(200).json({
      history,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch(err) {
    console.error('[CHATS] ❌ Error getting messages:', err);
    res.status(500).json({
      error: 'An error occurred while getting the room messages.'
    });
  }
}

export async function evaluateChat(req, res, next) {
  try {
    console.log('[CHAT] evaluateChat called:', {
      roomId: req.params.roomId,
      userId: req.session.userId
    });

    const { roomId } = req.params;
    const userId = req.session.userId;

    const [chatRoom, messages] = await Promise.all([
      ChatRoom.findById(roomId),
      Message.find({ roomId }).sort({ createdAt: 1 })
    ]);

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const isParticipant =
      chatRoom.hostId.toString() === userId ||
      chatRoom.challengerId?.toString() === userId;

    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to evaluate this debate' });
    }

    if (chatRoom.status !== 'completed') {
      return res.status(400).json({ error: 'Debate must be completed before evaluation' });
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'No messages to evaluate' });
    }

    const proUsername = chatRoom.hostSide === 'pro' ? chatRoom.host : chatRoom.challenger;
    const conUsername = chatRoom.hostSide === 'con' ? chatRoom.host : chatRoom.challenger;

    if (chatRoom.evaluation) {
      return res.status(200).json({
        result: chatRoom.evaluation,
        topic: chatRoom.title,
        participants: {
          pro: proUsername,
          con: conUsername
        }
      });
    }

    // Separate messages by side
    const proMessages = messages.filter(m => m.side === 'pro');
    const conMessages = messages.filter(m => m.side === 'con');

    if (proMessages.length === 0 || conMessages.length === 0) {
      return res.status(400).json({ error: 'Both sides must have messages for evaluation' });
    }

    // Format conversation transcript
    const transcript = messages
      .map(m => `[${m.side.toUpperCase()}] ${m.username}: ${m.content}`)
      .join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert debate judge. Evaluate the following debate and provide a fair, detailed assessment.

Topic: "${chatRoom.title}"
Pro side: ${proUsername}
Con side: ${conUsername}

Debate Transcript:
${transcript}

Evaluate the debate based on:
- Strength and clarity of arguments
- Use of evidence and reasoning
- Ability to counter the opponent's points
- Overall persuasiveness

Respond in this exact format:
1. Start with a 2-3 sentence overall summary of the debate.
2. A paragraph analyzing the Pro side's performance — highlight their strengths, and provide constructive criticism if applicable.
3. A paragraph analyzing the Con side's performance — highlight their strengths, and provide constructive criticism if applicable.
4. End with a bold winner declaration on its own line, one of:
   **Winner: ${proUsername} (Pro)**
   **Winner: ${conUsername} (Con)**
   **Winner: Tie**

If there is a winner, explain in one sentence why they won. If it is a tie, explain why both sides were equally matched.
Keep the tone professional, fair, and constructive.`;

    const timeoutMs = 30_000;
    const aiPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Evaluation timed out')), timeoutMs);
    });

    const result = await Promise.race([aiPromise, timeoutPromise]);
    const evaluation = result.response.text();

    chatRoom.evaluation = evaluation;
    await chatRoom.save();

    console.log('[CHAT] ✓ Evaluation recovered for room:', roomId);

    res.status(200).json({
      result: evaluation,
      topic: chatRoom.title,
      participants: {
        pro: proUsername,
        con: conUsername
      }
    });
  } catch (err) {
    console.error('[CHAT] ❌ Error evaluating chat:', err);
    res.status(500).json({
      error: 'An error occurred while evaluating the debate.'
    });
  }
}