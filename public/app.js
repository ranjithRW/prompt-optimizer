/* ============================================================
   Prompt Optimizer — Frontend Logic
   ============================================================ */
'use strict';

// ── DOM refs ────────────────────────────────────────────────
const promptInput       = document.getElementById('promptInput');
const optimizeBtn       = document.getElementById('optimizeBtn');
const outputArea        = document.getElementById('outputArea');
const copyBtn           = document.getElementById('copyBtn');
const usePromptBtn      = document.getElementById('usePromptBtn');
const charCount         = document.getElementById('charCount');
const themeToggleBtn    = document.getElementById('themeToggleBtn');
const historyToggleBtn  = document.getElementById('historyToggleBtn');
const historySidebar    = document.getElementById('historySidebar');
const historyList       = document.getElementById('historyList');
const clearHistoryBtn   = document.getElementById('clearHistoryBtn');
const explainToggle     = document.getElementById('explainToggle');
const errorBanner       = document.getElementById('errorBanner');
const errorMessage      = document.getElementById('errorMessage');
const scoreComparison   = document.getElementById('scoreComparison');
const scoreBefore       = document.getElementById('scoreBefore');
const scoreAfter        = document.getElementById('scoreAfter');
const scoreDiff         = document.getElementById('scoreDiff');
const ringBefore        = document.getElementById('ringBefore');
const ringAfter         = document.getElementById('ringAfter');
const inputStrengthWrap  = document.getElementById('inputStrengthWrap');
const inputStrengthBar   = document.getElementById('inputStrengthBar');
const inputStrengthScore = document.getElementById('inputStrengthScore');
const outputStrengthWrap = document.getElementById('outputStrengthWrap');
const outputStrengthBar  = document.getElementById('outputStrengthBar');
const outputStrengthScore= document.getElementById('outputStrengthScore');
const usePromptModal    = document.getElementById('usePromptModal');
const modalCloseBtn     = document.getElementById('modalCloseBtn');
const toast             = document.getElementById('toast');

// ── State ────────────────────────────────────────────────────
let selectedMode     = 'creative';
let optimizedText    = '';
let typingTimer      = null;
let toastTimer       = null;
let history          = loadHistory();

// Section color map for highlighting
const SECTION_COLORS = {
  '1': 'blue',
  'objective': 'blue',
  '2': 'green',
  'context': 'green',
  '3': 'purple',
  'requirements': 'purple',
  '4': 'orange',
  'style': 'orange',
  'tone': 'orange',
  '5': 'blue',
  'output': 'blue',
  'format': 'blue',
  '6': 'green',
  'additional': 'green',
  '7': 'purple',
  'what': 'purple',
  'improved': 'purple',
};

// ── Init ─────────────────────────────────────────────────────
(function init() {
  applyTheme(loadTheme());
  renderHistory();

  promptInput.addEventListener('input', onInputChange);
  promptInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleOptimize();
    }
  });
  optimizeBtn.addEventListener('click', handleOptimize);
  copyBtn.addEventListener('click', handleCopy);
  usePromptBtn.addEventListener('click', handleUsePrompt);
  themeToggleBtn.addEventListener('click', toggleTheme);
  historyToggleBtn.addEventListener('click', toggleHistorySidebar);
  clearHistoryBtn.addEventListener('click', clearHistory);
  modalCloseBtn.addEventListener('click', () => { usePromptModal.hidden = true; });
  usePromptModal.addEventListener('click', (e) => {
    if (e.target === usePromptModal) usePromptModal.hidden = true;
  });

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMode = btn.dataset.mode;
    });
  });
})();

// ── Input handling ───────────────────────────────────────────
function onInputChange() {
  const len = promptInput.value.length;
  charCount.textContent = `${len} / 4000`;
  charCount.classList.toggle('warning', len > 3500);

  if (len > 0) {
    inputStrengthWrap.style.display = 'flex';
    const score = clientSideScore(promptInput.value);
    inputStrengthBar.style.width = score + '%';
    inputStrengthScore.textContent = score;
  } else {
    inputStrengthWrap.style.display = 'none';
  }
}

// ── Client-side prompt score ─────────────────────────────────
function clientSideScore(text) {
  let score = 0;
  const words = text.trim().split(/\s+/).length;
  if (words >= 3)  score += 10;
  if (words >= 10) score += 10;
  if (words >= 30) score += 10;
  if (words >= 60) score += 10;
  if (/style|tone/i.test(text))        score += 10;
  if (/context|background/i.test(text)) score += 10;
  if (/require|must|should/i.test(text)) score += 10;
  if (/output|format/i.test(text))     score += 10;
  if (/audience|user/i.test(text))     score += 10;
  if (/example|sample/i.test(text))    score += 10;
  return Math.min(score, 100);
}

// ── Optimize ─────────────────────────────────────────────────
async function handleOptimize() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showError('Please enter a prompt before optimizing.');
    promptInput.focus();
    return;
  }

  hideError();
  setLoading(true);
  clearTyping();

  // Button ripple effect
  optimizeBtn.classList.add('ripple');
  setTimeout(() => optimizeBtn.classList.remove('ripple'), 600);

  try {
    const res = await fetch('/optimize-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        mode: selectedMode,
        explain: explainToggle.checked,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'An unexpected error occurred.');
    }

    optimizedText = data.optimizedPrompt;

    // Show output
    renderOutput(optimizedText);

    // Score meters
    updateScores(data.originalScore, data.optimizedScore);

    // Save to history
    saveToHistory(prompt, optimizedText, selectedMode, data.originalScore, data.optimizedScore);

    // Show action buttons
    copyBtn.hidden = false;
    usePromptBtn.hidden = false;

  } catch (err) {
    showError(err.message || 'Network error — is the server running?');
  } finally {
    setLoading(false);
  }
}

// ── Render output with typing animation ──────────────────────
function renderOutput(text) {
  // Parse sections from markdown bold headers
  const sections = parseSections(text);

  outputArea.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'output-content';
  outputArea.appendChild(wrapper);

  let delay = 0;
  sections.forEach((section, idx) => {
    const el = document.createElement('div');
    el.className = 'output-section';
    el.style.animationDelay = `${delay}ms`;
    el.style.animationFillMode = 'both';

    if (section.heading) {
      const headingEl = document.createElement('div');
      headingEl.className = `section-heading ${section.color}`;
      headingEl.textContent = section.heading;
      el.appendChild(headingEl);
    }

    const bodyEl = document.createElement('div');
    bodyEl.className = 'section-body';
    el.appendChild(bodyEl);
    wrapper.appendChild(el);

    // Type body text
    typeText(bodyEl, section.body, delay);
    delay += Math.min(section.body.length * 8 + 200, 600);
  });

  // Update output strength
  outputStrengthWrap.style.display = 'flex';
  const outScore = clientSideScore(text);
  outputStrengthBar.style.width = outScore + '%';
  outputStrengthScore.textContent = outScore;
}

function parseSections(text) {
  // Split on **N. Title:** or **Title:** patterns
  const sectionRegex = /\*\*(\d+\.\s*[^*]+?|\w[\w\s&]+?):\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let prevHeading = null;
  let prevColor = 'blue';

  while ((match = sectionRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (lastIndex === 0 && before) {
      parts.push({ heading: null, body: before, color: 'blue' });
    } else if (prevHeading !== null && before) {
      parts.push({ heading: prevHeading, body: before, color: prevColor });
    }
    prevHeading = match[1].trim();
    prevColor = getSectionColor(prevHeading);
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    parts.push({ heading: prevHeading, body: remaining, color: prevColor });
  }

  // Fallback: no sections parsed
  if (parts.length === 0) {
    parts.push({ heading: null, body: text, color: 'blue' });
  }

  return parts;
}

function getSectionColor(heading) {
  const lower = heading.toLowerCase();
  for (const [key, color] of Object.entries(SECTION_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'blue';
}

// ── Typing effect ────────────────────────────────────────────
function typeText(el, text, delay) {
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';

  const start = () => {
    el.textContent = '';
    el.appendChild(cursor);

    const interval = setInterval(() => {
      if (i < text.length) {
        el.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
      } else {
        clearInterval(interval);
        cursor.remove();
      }
    }, 12);

    typingTimer = interval;
  };

  if (delay > 0) {
    setTimeout(start, delay);
  } else {
    start();
  }
}

function clearTyping() {
  if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
  outputStrengthWrap.style.display = 'none';
  scoreComparison.hidden = true;
  copyBtn.hidden = true;
  usePromptBtn.hidden = true;
  outputArea.innerHTML = `
    <div class="output-placeholder">
      <div class="placeholder-icon">✨</div>
      <p>Your optimized prompt will appear here</p>
      <p class="placeholder-sub">Enter a prompt and click <strong>Optimize Prompt</strong></p>
    </div>`;
}

// ── Score display ────────────────────────────────────────────
function updateScores(orig, opt) {
  scoreComparison.hidden = false;
  scoreBefore.textContent = orig;
  scoreAfter.textContent  = opt;
  const diff = opt - orig;
  scoreDiff.textContent   = (diff >= 0 ? '+' : '') + diff;
  scoreDiff.style.color   = diff >= 0 ? 'var(--accent-green)' : 'var(--text-danger)';

  // Animate rings
  setTimeout(() => {
    ringBefore.style.setProperty('--pct', orig);
    ringAfter.style.setProperty('--pct',  opt);
  }, 100);
}

// ── Copy ─────────────────────────────────────────────────────
async function handleCopy() {
  if (!optimizedText) return;
  try {
    await navigator.clipboard.writeText(optimizedText);
    copyBtn.classList.add('copied');
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Copied!`;
    showToast('Copied to clipboard!');
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy`;
    }, 2000);
  } catch {
    showToast('Copy failed — select text manually.');
  }
}

// ── Use Prompt ───────────────────────────────────────────────
async function handleUsePrompt() {
  if (!optimizedText) return;
  try {
    await navigator.clipboard.writeText(optimizedText);
  } catch { /* silent */ }
  usePromptModal.hidden = false;
}

// ── Loading state ────────────────────────────────────────────
function setLoading(on) {
  optimizeBtn.disabled = on;
  optimizeBtn.classList.toggle('loading', on);
  promptInput.disabled = on;
}

// ── Error handling ───────────────────────────────────────────
function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.hidden = false;
}
function hideError() { errorBanner.hidden = true; }

// ── Theme ────────────────────────────────────────────────────
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveTheme(next);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
function loadTheme() {
  return localStorage.getItem('po-theme') || 'dark';
}
function saveTheme(theme) {
  localStorage.setItem('po-theme', theme);
}

// ── History Sidebar ──────────────────────────────────────────
function toggleHistorySidebar() {
  historySidebar.classList.toggle('open');
}

function saveToHistory(prompt, optimized, mode, scoreBefore, scoreAfter) {
  const item = {
    id: Date.now(),
    prompt,
    optimized,
    mode,
    scoreBefore,
    scoreAfter,
    date: new Date().toISOString(),
  };
  history.unshift(item);
  if (history.length > 20) history = history.slice(0, 20);
  persistHistory();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No history yet</li>';
    return;
  }
  historyList.innerHTML = '';
  history.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.setAttribute('role', 'listitem');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', `Restore prompt: ${item.prompt.slice(0, 50)}`);
    li.innerHTML = `
      <div class="history-item-prompt">${escapeHtml(item.prompt)}</div>
      <div class="history-item-meta">
        <span class="history-item-mode">${item.mode}</span>
        <span>${formatDate(item.date)}</span>
        <span>${item.scoreBefore}→${item.scoreAfter}</span>
      </div>`;
    li.addEventListener('click', () => restoreHistory(item));
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter') restoreHistory(item); });
    historyList.appendChild(li);
  });
}

function restoreHistory(item) {
  promptInput.value = item.prompt;
  optimizedText = item.optimized;
  onInputChange();
  renderOutput(item.optimized);
  updateScores(item.scoreBefore, item.scoreAfter);
  copyBtn.hidden = false;
  usePromptBtn.hidden = false;
  hideError();

  // Set mode button
  document.querySelectorAll('.mode-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === item.mode);
  });
  selectedMode = item.mode;

  showToast('Prompt restored from history');
  historySidebar.classList.remove('open');
}

function clearHistory() {
  if (history.length === 0) return;
  history = [];
  persistHistory();
  renderHistory();
  showToast('History cleared');
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('po-history') || '[]');
  } catch { return []; }
}

function persistHistory() {
  localStorage.setItem('po-history', JSON.stringify(history));
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ── Utilities ────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
