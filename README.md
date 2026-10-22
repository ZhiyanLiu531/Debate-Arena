
# Debate Court
## Overview
Debate Court is a web-based platform designed to help students and debate enthusiasts practice structured argumentation through real-time, text-based debates with other users. The platform focuses on improving users’ fluency, reasoning, and critical thinking skills in a low-pressure but structured environment.

Debate Court provides users with debate motions (topics) and matches them with other users for one-on-one debates using a familiar chat-style interface. Features such as timed responses and structured turn-taking simulate real debate conditions while remaining accessible to beginners. The app emphasizes human-to-human interaction, encouraging authentic engagement and growing your social circle across the web!
## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Docker and Docker Compose
- MongoDB (via Docker or local installation)

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update the following variables:
   - `MONGO_URI` - MongoDB connection string (default: `mongodb://debate:debate@localhost:27017/debate_court?authSource=admin`)
   - `SESSION_SECRET` - A secure random string for session encryption
   - `PORT` - Server port (default: 3000)
   - `NODE_ENV` - Set to `development` or `production`

4. **Start MongoDB:**
   
   Using Docker Compose (recommended):
   ```bash
   docker compose up mongo -d
   ```
   
   Or use a local MongoDB installation.

5. **Run the backend:**
   
   For development (with auto-reload):
   ```bash
   npm run dev
   ```
   
   For production:
   ```bash
   npm run prod
   ```

The backend API will be available at `http://localhost:3000`.

### Running Tests

The backend includes comprehensive test coverage for all authentication endpoints.

**Run tests:**
```bash
cd backend
npm test
```

**Watch mode (for development):**
npm run test:watch
```

**With coverage report:**
```bash
npm run test:coverage
```

**Test Details:**
- **Framework:** Vitest + Supertest
- **Test Database:** Uses a separate `debate_court_test` database (won't affect development data)

The tests automatically:
- Connect to the test database before running
- Clean up all data between tests
- Close database connections after completion

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the frontend:**
   
   For development:
   ```bash
   npm run dev
   ```
   
   For production build:
   ```bash
   npm run build
   ```

The built files can be statically served via Docker or by uncommenting the static serving line in `backend/src/app.mjs`.

### Docker Deployment

To run the entire stack with Docker Compose:

```bash
docker compose up -d
```

This will start:
- MongoDB database
- Backend API server
- Frontend (nginx)
- Nginx reverse proxy with SSL support

## Version Control
Follow conventional commit messages, have at least one teammate review pull requests, do not commit any api keys, consistently commit in small chunks to record progress.
### Git Flow Guideline
We agree to generally follow Git Flow for branching and merging, to maintain structure and clarity in our development process. However, strict adherence is not required for every situation, and minor deviations are acceptable as long as they are communicated to the team.
### Branching convention:
- main: Stable production-ready code.
- dev: Integration branch for features and fixes.
- feature/xxx, hotfix/xxx: For new work.
- merging: Feature branches should be merged into dev after code review and testing.
## Ticket Tools
Jira
