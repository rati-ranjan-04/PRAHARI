# PRAHARI v5.0 + ARIA v7.0 — Unified Backend

## Folder Structure
```
prahari/
├── server.js          ← Express backend (API proxy + static server)
├── package.json
├── .env               ← YOUR API KEY GOES HERE (create from .env.example)
├── .env.example       ← Template — copy to .env
├── .gitignore         ← .env is excluded from git
└── public/
    ├── index.html     ← PRAHARI v5.0 dashboard (copy your original here)
    └── ai.html        ← ARIA v7.0 chat (already updated)
```

## Setup (3 steps)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and replace `AI_API_KEY` with your actual key:
```
AI_API_KEY=sk-your-real-key-here
AI_MODEL=gpt-4o-mini
```

### 3. Copy your original index.html
```bash
cp /path/to/your/original/index.html public/index.html
```

## Run
```bash
node server.js
# or for auto-reload during development:
npx nodemon server.js
```

Open: http://localhost:3000

## API Endpoints

| Endpoint         | Method | Description                        |
|-----------------|--------|------------------------------------|
| `/api/health`   | GET    | Check server + AI key status       |
| `/api/chat`     | POST   | ARIA AI chat proxy                 |
| `/api/ip-analyze` | POST | IP/domain threat analysis (mock)  |
| `/*`            | GET    | Serves static files from /public   |

## /api/chat Request Format
```json
{
  "messages": [
    {"role": "user", "content": "What is a phishing attack?"}
  ],
  "mode": "defensive",
  "stream": false
}
```

## Security Notes
- API key stays on the server — never exposed to the browser
- Rate limited to 20 requests/minute per IP
- Message history capped at 20 turns
- All messages sanitised before forwarding to AI

## Supported AI Providers
Change `AI_BASE_URL` in `.env` to switch providers:
- **OpenAI**: `https://api.openai.com/v1`
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **Together AI**: `https://api.together.xyz/v1`
- **Groq**: `https://api.groq.com/openai/v1`
