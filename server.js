require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert prompt engineer. Your task is to convert a simple or vague user prompt into a highly detailed, structured, and optimized prompt for AI systems.

Follow these rules:
- Understand the user's intent deeply
- Expand the prompt with relevant details
- Add structure using sections
- Include tone, style, and constraints
- Make it clear and actionable
- Do not change the core meaning
- Output only the improved prompt

Structure the output using these exact section headers (use markdown bold **Section Name:**):

**1. Objective:**
**2. Context:**
**3. Requirements:**
**4. Style & Tone:**
**5. Output Format:**
**6. Additional Enhancements:**`;

const MODE_ADDONS = {
  creative: `\n\nFocus on creative expression, imaginative language, and storytelling elements. Emphasize emotional resonance, vivid imagery, and originality.`,
  technical: `\n\nFocus on technical precision, accuracy, and specificity. Include relevant technical constraints, edge cases, error handling, and implementation details.`,
  marketing: `\n\nFocus on persuasive language, target audience psychology, value propositions, calls to action, and conversion-driven messaging.`,
  coding: `\n\nFocus on code quality, architecture patterns, language-specific best practices, testing requirements, documentation standards, and performance considerations.`,
};

const EXPLAIN_ADDON = `\n\nAfter the optimized prompt, add a section:

**7. What Was Improved:**
List each major enhancement made and briefly explain why it makes the prompt more effective for AI systems.`;

// Scoring heuristic based on prompt characteristics
function scorePrompt(text) {
  let score = 0;
  const words = text.trim().split(/\s+/).length;
  const hasSections = /\*\*(1\.|objective|context|requirements)/i.test(text);
  const hasStyleTone = /style|tone|format/i.test(text);
  const hasContext = /context|background|audience/i.test(text);
  const hasRequirements = /require|must|should|include/i.test(text);
  const hasOutputFormat = /output|format|structure|result/i.test(text);

  if (words >= 5) score += 10;
  if (words >= 20) score += 10;
  if (words >= 50) score += 10;
  if (words >= 100) score += 10;
  if (hasSections) score += 20;
  if (hasStyleTone) score += 10;
  if (hasContext) score += 10;
  if (hasRequirements) score += 10;
  if (hasOutputFormat) score += 10;

  return Math.min(score, 100);
}

// POST /optimize-prompt
app.post('/optimize-prompt', async (req, res) => {
  const { prompt, mode = 'creative', explain = false } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A non-empty prompt is required.' });
  }

  if (prompt.trim().length > 4000) {
    return res.status(400).json({ error: 'Prompt must be under 4000 characters.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key is not configured on the server.' });
  }

  try {
    const modeAddon = MODE_ADDONS[mode] || '';
    const explainAddon = explain ? EXPLAIN_ADDON : '';
    const systemPrompt = SYSTEM_PROMPT + modeAddon + explainAddon;

    const originalScore = scorePrompt(prompt);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.trim() },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const optimizedPrompt = completion.choices[0].message.content.trim();
    const optimizedScore = scorePrompt(optimizedPrompt);

    res.json({
      optimizedPrompt,
      originalScore,
      optimizedScore,
      usage: completion.usage,
    });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid OpenAI API key.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'OpenAI rate limit reached. Please try again shortly.' });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: 'Request rejected by OpenAI. Check your prompt content.' });
    }
    console.error('OpenAI error:', err.message);
    res.status(500).json({ error: 'Failed to optimize prompt. Please try again.' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`\n🚀 Prompt Optimizer running at http://localhost:${PORT}\n`);
});
