import ChatRoom from '../models/ChatRoom.mjs';
import Topic from '../models/Topic.mjs';

export async function getTopics(req, res, next) {
  try {
    console.log('[TOPICS] getTopics called:', {
      userId: req.session?.userId,
      username: req.session?.username,
      query: req.query
    });

    const page = req.query.page ? parseInt(req.query.page) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const [topics, total] = await Promise.all([
      Topic.find({})
      .skip(page * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
      Topic.countDocuments()
    ]);

    console.log('[TOPICS] ✓ Retrieved topics:', { count: topics.length, total });

    return res.status(200).json({
      topics,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (err) {
    console.error('[TOPICS] ❌ Error getting topics:', err);
    res.status(500).json({
      error: 'An error occurred while getting the topics.'
    });
  }
}

export async function createTopic(req, res, next) {
  try {
    console.log('[TOPICS] createTopic called:', {
      body: req.body,
      userId: req.session?.userId,
      username: req.session?.username
    });

    const { title, description, category } = req.body;

    if (!title || !category) {
      console.log('[TOPICS] ❌ Missing parameters:', { title, description, category });
      return res.status(400).json({
        error: 'Missing parameters in the request body (title and category are required)'
      });
    }

    const normTitle = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s([?.!,])/g, '$1');
    
    const foundTitle = await Topic.findOne({ titleNormalized: normTitle });

    if (foundTitle) {
      console.log('[TOPICS] ⚠️ Topic already exists:', normTitle);
      return res.status(404).json({
        error: 'Topic already exists'
      });
    }

    const topic = new Topic({
      title,
      description,
      category
    });

    await topic.save();
    console.log('[TOPICS] ✓ Topic created:', topic._id);

    res.status(201).json({
      message: 'Topic creation successful',
      topic: topic.toJSON()
    })
  } catch (err) {
    console.error('[TOPICS] ❌ Error creating topic:', err);
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({
      error: 'An error occurred while creating a topic.'
    });
  }
}

export async function getChats(req, res, next) {
  try {
    const { userId, username } = req.session;
    const { topicId } = req.params;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    console.log('[TOPICS] getChats called:', { topicId, page, limit, userId, username });

    const topic = await Topic.findById(topicId);
    if (!topic) {
      console.log('[TOPICS] ❌ Topic not found:', topicId);
      return res.status(404).json({
        error: 'Topic not found.'
      });
    }

    const [chats, total] = await Promise.all([
      ChatRoom.find({ topicId: topicId,  $or: [
        {status: "pending"},
        {challengerId: userId},
        {hostId: userId}
      ]})
      .skip(page * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
      ChatRoom.countDocuments({ topicId: topicId })
    ]);

    console.log('[TOPICS] ✓ Retrieved chats:', { count: chats.length, total });

    return res.status(200).json({
      chats,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (err) {
    console.error('[TOPICS] ❌ Error getting chats:', err);
    res.status(500).json({
      error: 'An error occurred while getting chats by topic.'
    });
  }
}