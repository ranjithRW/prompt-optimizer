# Prompt Optimizer

An AI-powered tool that transforms simple, vague prompts into detailed, structured, and highly effective prompts for any AI system — text, image, video, or code generation.

---

## Features

- **One-click optimization** — paste a raw prompt, click Optimize, get a structured result instantly
- **4 optimization modes** — Creative, Technical, Marketing, Coding
- **Side-by-side compare view** — original and optimized prompt shown together
- **Prompt strength meter** — scores prompts 0–100 before and after, with animated ring indicators
- **Typing animation** — output reveals section by section with a live cursor
- **Explain improvements** — optional toggle adds a "What Was Improved" section to every result
- **History** — last 20 prompts saved in browser storage, one-click restore
- **Copy & Use** — copy to clipboard or open directly in ChatGPT, Claude, Gemini, or Midjourney
- **Dark / Light theme** — persisted across sessions
- **Secure** — API key stays on the server, never exposed to the browser

---

## Project Structure

```
prompt-optimizer/
├── server.js          # Express backend — OpenAI API proxy
├── package.json
├── .env.example       # Environment variable template
├── .gitignore
└── public/
    ├── index.html     # UI layout
    ├── styles.css     # Classic theme (light/dark)
    └── app.js         # Frontend logic
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- An [OpenAI API key](https://platform.openai.com/api-keys)

---

## Setup

**1. Clone the repository**

```bash
git clone https://github.com/your-username/prompt-optimizer.git
cd prompt-optimizer
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment**

```bash
cp .env.example .env
```

Open `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

**4. Start the server**

```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

**5. Open the app**

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works

### User flow

1. Enter a basic prompt in the left panel
2. Select an optimization mode (Creative / Technical / Marketing / Coding)
3. Optionally enable **Explain improvements**
4. Click **Optimize Prompt** (or press `Ctrl + Enter`)
5. The structured result appears in the right panel with section highlights
6. Copy the result or use **Use Prompt** to open it in your preferred AI tool

### Output structure

Every optimized prompt follows this layout:

| Section | Description |
|---|---|
| **Objective** | Clear statement of what the prompt is trying to achieve |
| **Context** | Background information and relevant constraints |
| **Requirements** | Specific things the output must include or satisfy |
| **Style & Tone** | Voice, format, and stylistic guidance |
| **Output Format** | Structure and length expectations for the response |
| **Additional Enhancements** | Extra detail to improve result quality |
| **What Was Improved** *(optional)* | Explains each change made and why |

---

## API Reference

### `POST /optimize-prompt`

Optimizes a prompt using the OpenAI API.

**Request body**

```json
{
  "prompt": "create a video about travel",
  "mode": "creative",
  "explain": false
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `prompt` | string | Yes | Max 4000 characters |
| `mode` | string | No | `creative`, `technical`, `marketing`, `coding` (default: `creative`) |
| `explain` | boolean | No | `true` adds a "What Was Improved" section (default: `false`) |

**Success response**

```json
{
  "optimizedPrompt": "...",
  "originalScore": 10,
  "optimizedScore": 80,
  "usage": { "prompt_tokens": 120, "completion_tokens": 430 }
}
```

**Error responses**

| Status | Meaning |
|---|---|
| `400` | Missing or invalid prompt |
| `401` | Invalid OpenAI API key |
| `429` | OpenAI rate limit reached |
| `500` | Server error or missing API key config |

### `GET /health`

Returns `{ "status": "ok" }` — useful for uptime checks.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Your OpenAI secret key |
| `PORT` | No | Server port (default: `3000`) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| AI | OpenAI API (`gpt-4o-mini`) |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Config | dotenv |
| Dev server | nodemon |

---

## Security Notes

- The `OPENAI_API_KEY` is loaded server-side only via `.env` — it is never sent to or accessible from the browser.
- The `.env` file is listed in `.gitignore` and must not be committed.
- All OpenAI requests are proxied through the `/optimize-prompt` endpoint.
- Input is validated and capped at 4000 characters before being sent to the API.

---

## License

MIT
