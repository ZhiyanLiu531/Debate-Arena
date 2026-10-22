import AIDebate from '../models/AIDebate.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "dotenv";

dotenv.config();
if (!process.env.GEMINI_API_KEY) {
  console.warn('[AI DEBATE] WARNING: GEMINI_API_KEY is not set in environment variables. AI Debate features will not work.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function startAIDebate(req, res, next) {
  try {
    console.log('[AI DEBATE] startAIDebate called:', {
      userId: req.session?.userId,
      username: req.session?.username,
      body: req.body
    });

    const { topic, userSide } = req.body;
    const { userId, username } = req.session;

    if (!userId || !username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!topic || !userSide) {
      return res.status(400).json({
        error: 'Missing parameters (topic and userSide are required)'
      });
    }

    if (!['pro', 'con'].includes(userSide)) {
      return res.status(400).json({
        error: 'userSide must be either "pro" or "con"'
      });
    }

    // Determine AI side (opposite of user side)
    const aiSide = userSide === 'pro' ? 'con' : 'pro';

    // Create new AI debate
    const aiDebate = new AIDebate({
      userId,
      username,
      topic,
      userSide,
      aiSide,
      messages: []
    });

    await aiDebate.save();

    console.log('[AI DEBATE] ✓ AI Debate created:', aiDebate._id);

    res.status(201).json({
      message: 'AI Debate started successfully',
      debate: aiDebate
    });
  } catch (err) {
    console.error('[AI DEBATE] ❌ Error starting AI debate:', err);
    res.status(500).json({
      error: 'An error occurred while starting the AI debate.'
    });
  }
}

export async function getAIDebate(req, res, next) {
  try {
    console.log('[AI DEBATE] getAIDebate called:', {
      debateId: req.params.debateId,
      userId: req.session?.userId
    });

    const { debateId } = req.params;
    const debate = await AIDebate.findById(debateId);

    if (!debate) {
      console.log('[AI DEBATE] ⚠️ Debate not found:', debateId);
      return res.status(404).json({
        error: 'Debate not found'
      });
    }

    // Check if user owns this debate
    if (debate.userId.toString() !== req.session?.userId) {
      return res.status(403).json({
        error: 'Not authorized to access this debate'
      });
    }

    console.log('[AI DEBATE] ✓ Retrieved debate:', debateId);

    res.status(200).json({
      debate
    });
  } catch (err) {
    console.error('[AI DEBATE] ❌ Error getting debate:', err);
    res.status(500).json({
      error: 'An error occurred while retrieving the debate.'
    });
  }
}

export async function sendMessageToAI(req, res, next) {
  try {
    console.log('[AI DEBATE] sendMessageToAI called:', {
      debateId: req.params.debateId,
      userId: req.session?.userId,
      message: req.body.message
    });

    const { debateId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        error: 'Message cannot be empty'
      });
    }

    const debate = await AIDebate.findById(debateId);

    if (!debate) {
      return res.status(404).json({
        error: 'Debate not found'
      });
    }

    // Check if user owns this debate
    if (debate.userId.toString() !== req.session?.userId) {
      return res.status(403).json({
        error: 'Not authorized to access this debate'
      });
    }

    // Add user message
    debate.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Generate AI response
    try {
      const aiResponse = await generateAIResponse(
        debate.topic,
        debate.aiSide,
        debate.userSide,
        message,
        debate.messages.slice(0, -1) // Previous messages (excluding the one we just added)
      );

      debate.messages.push({
        role: 'ai',
        content: aiResponse,
        timestamp: new Date()
      });

      console.log('[AI DEBATE] ✓ Generated AI response');
    } catch (aiErr) {
      console.error('[AI DEBATE] ❌ Error generating AI response:', aiErr);
      // Still save user message even if AI response fails
      return res.status(500).json({
        error: 'Failed to generate AI response. Please try again.',
        detail: aiErr?.message || 'No additional details available.'
      });
    }

    await debate.save();

    res.status(200).json({
      message: 'Message sent successfully',
      debate
    });
  } catch (err) {
    console.error('[AI DEBATE] ❌ Error sending message:', err);
    res.status(500).json({
      error: 'An error occurred while sending the message.'
    });
  }
}

export async function getUserAIDebates(req, res, next) {
  try {
    console.log('[AI DEBATE] getUserAIDebates called:', {
      userId: req.session?.userId
    });

    const { userId } = req.session;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const [debates, total] = await Promise.all([
      AIDebate.find({ userId })
        .skip(page * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      AIDebate.countDocuments({ userId })
    ]);

    console.log('[AI DEBATE] ✓ Retrieved user AI debates:', { count: debates.length, total });

    res.status(200).json({
      debates,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (err) {
    console.error('[AI DEBATE] ❌ Error getting user AI debates:', err);
    res.status(500).json({
      error: 'An error occurred while retrieving your AI debates.'
    });
  }
}

async function generateAIResponse(topic, aiSide, userSide, userMessage, previousMessages) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is missing or not loaded. Set it in backend/.env and restart the server.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build conversation history for context
    let conversationHistory = previousMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
      .join('\n');

    const systemPrompt = `You are a debate opponent in a debate about "${topic}". 
You are arguing the ${aiSide} side (you ${aiSide === 'pro' ? 'support' : 'oppose'} the topic).
The user is arguing the ${userSide} side (they ${userSide === 'pro' ? 'support' : 'oppose'} the topic).

Rules:
- Provide substantive counterarguments to the user's points
- Stay focused on the topic
- Keep responses concise but thoughtful (2-3 paragraphs max)
- Be respectful and debate professionally
- Use evidence-based reasoning when possible
- Directly address the user's arguments

Previous conversation:
${conversationHistory}

User's latest message: ${userMessage}

Provide your debate response arguing for the ${aiSide} side:`;

    const timeoutMs = 25_000;
    const aiPromise = model.generateContent(systemPrompt);
    const timeoutPromise = new Promise((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error('AI response timed out'));
      }, timeoutMs);
    });

    const result = await Promise.race([aiPromise, timeoutPromise]);
    const response = result.response;
    let text = response.text();

    // Remove any leading/trailing quotes if present
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1);
    }

    return text;
  } catch (err) {
    // Provide a friendlier message when the API key is invalid
    const msg = (err && err.message) ? err.message : String(err);
    const isInvalidKey = msg.toLowerCase().includes('api key not valid') || msg.toLowerCase().includes('api_key_invalid');

    console.error('[AI DEBATE] Error generating AI response:', err);

    if (isInvalidKey) {
      throw new Error('Invalid GEMINI_API_KEY. Please update backend/.env with a valid Google Generative AI key.');
    }

    throw err;
  }
}

export async function endAIDebate(req, res, next) {
  try {
    console.log('[AI DEBATE] endAIDebate called:', {
      debateId: req.params.debateId,
      userId: req.session?.userId
    });

    const { debateId } = req.params;
    const debate = await AIDebate.findById(debateId);

    if (!debate) {
      return res.status(404).json({
        error: 'Debate not found'
      });
    }

    if (debate.userId.toString() !== req.session?.userId) {
      return res.status(403).json({
        error: 'Not authorized to access this debate'
      });
    }

    debate.status = 'completed';
    await debate.save();

    console.log('[AI DEBATE] ✓ Debate ended:', debateId);

    res.status(200).json({
      message: 'Debate ended successfully',
      debate
    });
  } catch (err) {
    console.error('[AI DEBATE] ❌ Error ending debate:', err);
    res.status(500).json({
      error: 'An error occurred while ending the debate.'
    });
  }
}

export async function evaluateAIDebate(req, res, next) {
  try {
    console.log('[AI DEBATE] evaluateAIDebate called:', {
      debateId: req.params.debateId,
      userId: req.session?.userId
    });

    const { debateId } = req.params;
    const userId = req.session?.userId;

    const debate = await AIDebate.findById(debateId);

    if (!debate) {
      return res.status(404).json({
        error: 'Debate not found'
      });
    }

    if (debate.userId.toString() !== userId) {
      return res.status(403).json({
        error: 'Not authorized to evaluate this debate'
      });
    }

    if (debate.status !== 'completed') {
      return res.status(400).json({
        error: 'Debate must be completed before evaluation'
      });
    }

    if (debate.messages.length === 0) {
      return res.status(400).json({
        error: 'No messages to evaluate'
      });
    }

    // Return cached evaluation if already exists
    if (debate.evaluation) {
      return res.status(200).json({
        result: debate.evaluation,
        topic: debate.topic,
        participants: {
          user: debate.username,
          ai: 'AI'
        }
      });
    }

    // Format conversation transcript
    const transcript = debate.messages
      .map(m => `[${m.role.toUpperCase()}] ${m.role === 'user' ? debate.username : 'AI'}: ${m.content}`)
      .join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert debate coach and evaluator. Evaluate the following debate between a human and an AI.

Topic: "${debate.topic}"
Human side: ${debate.userSide.toUpperCase()}
AI side: ${debate.aiSide.toUpperCase()}
Human name: ${debate.username}

Debate Transcript:
${transcript}

Evaluate the debate based on:
- Strength and clarity of arguments
- Use of evidence and reasoning
- Ability to counter the opponent's points
- Overall persuasiveness and debate skills

Respond in this exact format:
1. Start with a 2-3 sentence overall summary of the debate.
2. A paragraph analyzing the human's (${debate.username}'s) performance — highlight their strengths, and provide constructive criticism if applicable.
3. A paragraph analyzing the AI's performance — highlight its strengths, and provide constructive criticism if applicable.
4. End with a bold assessment on its own line, one of:
   **Overall Winner: ${debate.username}}**
   **Overall Winner: AI**
   **Overall Result: Tie**

If there is a clear winner, explain in one sentence why they won. If it is a tie, explain why both sides presented equally strong arguments.
Keep the tone professional, fair, constructive, and educational. Focus on helping the human learn from this debate.`;

    const timeoutMs = 30_000;
    const aiPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Evaluation timed out')), timeoutMs);
    });

    const result = await Promise.race([aiPromise, timeoutPromise]);
    const evaluation = result.response.text();

    debate.evaluation = evaluation;
    await debate.save();

    console.log('[AI DEBATE] ✓ Evaluation generated for debate:', debateId);

    res.status(200).json({
      result: evaluation,
      topic: debate.topic,
      participants: {
        user: debate.username,
        ai: 'AI'
      }
    });
  } catch (err) {
    console.error('[AI DEBATE] ❌ Error evaluating debate:', err);
    res.status(500).json({
      error: 'An error occurred while evaluating the debate.'
    });
  }
}
