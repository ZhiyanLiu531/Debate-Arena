import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./db.mjs";
import { authRouter } from "./routes/authRouter.mjs";
import { chatsRouter } from "./routes/chatsRouter.mjs";
import { topicsRouter } from "./routes/topicsRouter.mjs";
import { profileRouter } from "./routes/profileRouter.mjs";
import aiDebateRouter from "./routes/aiDebateRouter.mjs";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://debate:debate@localhost:27017/debate_court?authSource=admin';
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set and at least 32 characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

export function createApp(mongoUri = MONGO_URI) {
  const app = express();

  // Trust proxy headers (for secure cookies behind nginx)
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
  }));

  // Request logging middleware (after session setup)
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`, {
      contentType: req.headers['content-type'],
      hasBody: !!req.body,
      sessionId: req.sessionID
    });
    next();
  });

  // Uncomment to run the backend with frontend files being served
  // app.use(express.static('../../frontend/dist'));

  app.use('/api/auth', authRouter);
  app.use('/api/chats', chatsRouter);
  app.use('/api/topics', topicsRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/ai-debates', aiDebateRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

async function start() {
  await connectDB();
  
  const app = createApp();
  const server = createServer(app);
  server.listen(PORT, function () {
    console.log("HTTP server on http://localhost:%s", PORT);
  });
}

// Only start server if this file is run directly (not imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
