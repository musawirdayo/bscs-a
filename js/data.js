// ─── BCS 3A Platform — Central Data Store v3 ───────────────────────────────
// Cloud: JSONBin   AI: Gemini 2.0 Flash   Presence: simple heartbeat via bin

const APP_DATA = {
  meta: {
    university: "COMSATS University Islamabad",
    class: "BCS Section A",
    semester: "3rd Semester",
    session: "Spring 2026"
  },
  courses: [
    { id:"dld",  code:"CSC202", name:"Fundamentals of Digital Logic Design", short:"DLD",     teacher:"Muhammad Bilal Qasim", icon:"⚡", color:"dld",  examDate:"2026-04-14T14:00:00", examEnd:"2026-04-14T15:30:00", room:"CL-05, CL-06",    topics:[] },
    { id:"se",   code:"CSC301", name:"Software Engineering",                  short:"SE",      teacher:"Ch. Anwar Shaukat",    icon:"🛠", color:"se",   examDate:"2026-04-15T10:20:00", examEnd:"2026-04-15T11:50:00", room:"210, 106, 107",   topics:[] },
    { id:"ds",   code:"CSC211", name:"Data Structures",                       short:"DS",      teacher:"Dr. Inayat-ur-Rehman", icon:"🌲", color:"ds",   examDate:"2026-04-16T15:50:00", examEnd:"2026-04-16T17:20:00", room:"G-05",            topics:[] },
    { id:"calc", code:"MTH101", name:"Calculus and Analytic Geometry",        short:"Calculus",teacher:"Dr. Saqib Zia",        icon:"∫",  color:"calc", examDate:"2026-04-20T10:20:00", examEnd:"2026-04-20T11:50:00", room:"CL-07, CL-08",   topics:[] },
    { id:"db",   code:"CSC221", name:"Database Systems",                      short:"DB",      teacher:"Dr. Rubina Adnan",     icon:"🗄", color:"db",   examDate:"2026-04-21T14:00:00", examEnd:"2026-04-21T15:30:00", room:"CL-09, CL-10",   topics:[] }
  ],
  notes:         {},   // { courseId: { topicName: { raw, sections:[{type,content}], links:[] } } }
  quizzes:       {},   // { courseId: [ {q, opts[], ans, exp, topic, difficulty} ] }
  flashcards:    {},   // { courseId: [ {q, a, topic} ] }
  announcements: [],   // [ { id, type, msg, date, pinned } ]
  resources:     {},   // { courseId: [ {title, url, type, uploadedAt} ] }
  presence:      {}    // { sessionId: { name, page, ts } }
};

// ─── Config ──────────────────────────────────────────────────────────────────
const BIN_ID      = '69d6d7a9aaba882197da5ce4';
const MASTER_KEY  = '$2a$10$71mUhVOOXOpiRPD96MDIDenFdtAoL9GG5B7Z8yqijyH.Fx6xCQWJ6';
// ── GEMINI API KEY ─────────────────────────────────────────────────────────
// Key is set in Admin → AI Settings, stored in browser localStorage.
// Fallback to hardcoded key if not set.
function getGeminiKey() {
  return localStorage.getItem('gemini_api_key') || 'AIzaSyCr9Zc-uS2D4wCICU6qWmBk0_wvezA7RAk';
}
const GEMINI_MODEL = 'gemini-1.5-flash';

// ─── Session identity (for presence) ─────────────────────────────────────────
const SESSION_ID = (() => {
  let id = sessionStorage.getItem('bcs_session');
  if (!id) { id = 'u_' + Math.random().toString(36).slice(2,9); sessionStorage.setItem('bcs_session', id); }
  return id;
})();
const STUDENT_NAME = localStorage.getItem('bcs_name') || 'Student';

// ─── Sync ─────────────────────────────────────────────────────────────────────
let _syncStatus = 'idle';

async function saveData() {
  _syncStatus = 'saving';
  _notifySyncStatus();
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
      body: JSON.stringify(APP_DATA)
    });
    if (res.ok) {
      _syncStatus = 'saved';
      _toast('✅ Deployed to cloud. All students can see it now.');
    } else {
      _syncStatus = 'error';
      _toast('❌ Cloud save failed.', 'error');
    }
  } catch(e) {
    _syncStatus = 'error';
    _toast('❌ Network error.', 'error');
  }
  _notifySyncStatus();
}

async function loadData() {
  _syncStatus = 'loading';
  _notifySyncStatus();
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': MASTER_KEY }
    });
    if (res.ok) {
      const { record } = await res.json();
      if (record.notes)         APP_DATA.notes         = record.notes;
      if (record.quizzes)       APP_DATA.quizzes       = record.quizzes;
      if (record.flashcards)    APP_DATA.flashcards    = record.flashcards;
      if (record.announcements) APP_DATA.announcements = record.announcements;
      if (record.resources)     APP_DATA.resources     = record.resources;
      if (record.presence)      APP_DATA.presence      = record.presence;
      if (record.courses) {
        record.courses.forEach(rc => {
          const lc = APP_DATA.courses.find(c => c.id === rc.id);
          if (lc) {
            lc.topics = rc.topics || [];
            if (rc.examDate) lc.examDate = rc.examDate;
            if (rc.examEnd)  lc.examEnd  = rc.examEnd;
            if (rc.room)     lc.room     = rc.room;
          }
        });
      }
      _syncStatus = 'loaded';
    } else {
      _syncStatus = 'offline';
    }
  } catch(e) {
    _syncStatus = 'offline';
  }
  _notifySyncStatus();
  // Update presence
  updatePresence(document.title.split('—')[0].trim());
  if (typeof onDataLoaded === 'function') onDataLoaded();
}

// ─── Presence heartbeat ──────────────────────────────────────────────────────
async function updatePresence(page) {
  if (!APP_DATA.presence) APP_DATA.presence = {};
  const now = Date.now();
  // Prune stale (>3 min)
  Object.keys(APP_DATA.presence).forEach(k => {
    if (now - APP_DATA.presence[k].ts > 180000) delete APP_DATA.presence[k];
  });
  APP_DATA.presence[SESSION_ID] = { name: STUDENT_NAME, page, ts: now };
  // Don't block — fire and forget
  fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
    body: JSON.stringify(APP_DATA)
  }).catch(() => {});
}

function getOnlineCount() {
  const now = Date.now();
  return Object.values(APP_DATA.presence || {}).filter(p => now - p.ts < 180000).length;
}

// Refresh presence every 90s
setInterval(() => updatePresence(document.title.split('—')[0].trim()), 90000);

// ─── Gemini AI ───────────────────────────────────────────────────────────────

// Robustly extract JSON from Gemini response — handles all wrapping variations
function _extractJSON(text) {
  // Remove markdown fences (```json ... ``` or ``` ... ```)
  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // If still has fences in middle, extract the JSON block
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Try to find JSON array or object if there's extra text before/after
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const arrMatch = cleaned.match(/(\[[\s\S]*\])/);
    const objMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (arrMatch) cleaned = arrMatch[1];
    else if (objMatch) cleaned = objMatch[1];
  }

  return JSON.parse(cleaned);
}

// Core Gemini call with automatic model fallback
async function geminiGenerate(prompt, statusEl) {
  if (statusEl) statusEl.innerHTML = '<span class="ai-spinner"></span> Connecting to Gemini AI…';

  // Strategy 1: Try our Netlify edge function proxy (bypasses AI Gateway)
  // Strategy 2: Fall back to direct Gemini call (works on GitHub Pages / other hosts)
  const MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.0-pro'];
  const DIRECT_KEY = getGeminiKey();

  // Try proxy first (only works on Netlify with edge functions)
  try {
    const proxyRes = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(5000) // 5s timeout for proxy check
    });
    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      if (proxyData.text) {
        console.log('AI: Used Netlify proxy, model:', proxyData.model);
        return proxyData.text;
      }
    }
    // proxy returned error JSON - read it but fall through to direct
    const errData = await proxyRes.json().catch(() => ({}));
    console.warn('Proxy failed:', errData.error, '- trying direct call');
  } catch (proxyErr) {
    // 404 = not on Netlify, timeout = proxy slow, etc. Fall through.
    console.warn('Proxy unavailable:', proxyErr.message, '- trying direct call');
  }

  // Fall back: call Gemini directly
  let lastError = 'Unknown error';
  for (const model of MODELS) {
    try {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + DIRECT_KEY;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      });

      if (res.status === 404) { lastError = 'Model not found: ' + model; continue; }

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        lastError = (e.error && e.error.message) || ('HTTP ' + res.status);
        // If it's the Netlify AI Gateway error, give a clear message
        if (lastError.includes('AI Gateway') || lastError.includes('not configured')) {
          throw new Error('This site is on Netlify with AI Gateway blocking direct calls. Please redeploy with the edge function (see README).');
        }
        continue;
      }

      const data = await res.json();
      const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (!text) { lastError = 'Empty response'; continue; }

      console.log('AI: Direct call succeeded with model:', model);
      return text;
    } catch (e) {
      lastError = e.message;
      if (e.message.includes('Netlify') || e.message.includes('AI Gateway')) throw e;
      continue;
    }
  }
  throw new Error('AI failed: ' + lastError);
}

async function generateQuizFromNotes(courseId, topic, rawText, statusEl) {
  if (statusEl) statusEl.innerHTML = '<span class="ai-spinner"></span> Gemini is writing 15 MCQs…';

  const prompt = `You are an expert university professor creating exam MCQs for CS students.
Topic: "${topic}"
Source material:
${rawText.slice(0, 3000)}

INSTRUCTIONS:
- Generate exactly 15 multiple choice questions
- Mix difficulty: 5 easy, 7 medium, 3 hard
- Each question tests conceptual understanding
- Options must start with the letter: "A. ...", "B. ...", "C. ...", "D. ..."
- ans is the INDEX (0=A, 1=B, 2=C, 3=D) of the correct answer

Return ONLY a raw JSON array. No markdown. No explanation. No preamble. Start with [ and end with ]:
[{"q":"question text","opts":["A. option1","B. option2","C. option3","D. option4"],"ans":0,"exp":"why this answer is correct","topic":"${topic}","difficulty":"easy"}]`;

  const raw = await geminiGenerate(prompt, statusEl);
  const items = _extractJSON(raw);

  if (!Array.isArray(items) || items.length === 0) throw new Error('Gemini returned invalid quiz data');

  if (!APP_DATA.quizzes[courseId]) APP_DATA.quizzes[courseId] = [];
  APP_DATA.quizzes[courseId] = APP_DATA.quizzes[courseId].filter(q => q.topic !== topic);
  APP_DATA.quizzes[courseId].push(...items);
  if (statusEl) statusEl.innerHTML = `✅ ${items.length} MCQs generated for "${topic}"`;
  return items.length;
}

async function generateFlashcardsFromNotes(courseId, topic, rawText, statusEl) {
  if (statusEl) statusEl.innerHTML = '<span class="ai-spinner"></span> Gemini is writing 20 flashcards…';

  const prompt = `You are creating study flashcards for a university CS student.
Topic: "${topic}"
Source material:
${rawText.slice(0, 3000)}

INSTRUCTIONS:
- Generate exactly 20 flashcards
- Cover: key definitions, concepts, formulas, comparisons, processes
- Front (q): short, clear question
- Back (a): concise answer, 1-3 sentences

Return ONLY a raw JSON array. No markdown. No explanation. Start with [ and end with ]:
[{"q":"What is X?","a":"X is... It works by...","topic":"${topic}"}]`;

  const raw = await geminiGenerate(prompt, statusEl);
  const items = _extractJSON(raw);

  if (!Array.isArray(items) || items.length === 0) throw new Error('Gemini returned invalid flashcard data');

  if (!APP_DATA.flashcards[courseId]) APP_DATA.flashcards[courseId] = [];
  APP_DATA.flashcards[courseId] = APP_DATA.flashcards[courseId].filter(f => f.topic !== topic);
  APP_DATA.flashcards[courseId].push(...items);
  if (statusEl) statusEl.innerHTML = `✅ ${items.length} flashcards generated for "${topic}"`;
  return items.length;
}

async function parseNotesWithGemini(rawText, topic, statusEl) {
  if (statusEl) statusEl.innerHTML = '<span class="ai-spinner"></span> Gemini is parsing and structuring notes…';

  const prompt = `You are an expert at processing raw lecture notes into structured study material.
Topic: "${topic}"
Raw notes:
${rawText.slice(0, 4000)}

TASK: Parse these notes into structured JSON. Auto-detect headings, subheadings, definitions, formulas, examples, and exam tips.

Return ONLY raw JSON (no markdown, no fences, no explanation). Start with { and end with }:
{"title":"${topic}","summary":"2-3 sentence overview","sections":[{"type":"heading","heading":"Section Name","content":"Section Name"},{"type":"paragraph","content":"text here"},{"type":"definition","heading":"Term Name","content":"definition text"},{"type":"formula","content":"formula here"},{"type":"tip","content":"exam tip here"},{"type":"example","content":"example here"},{"type":"keypoint","content":"important point"},{"type":"list","heading":"optional","items":["item1","item2"]}],"examTips":["tip1","tip2"],"keyTerms":[{"term":"word","definition":"meaning"}]}`;

  const raw = await geminiGenerate(prompt, statusEl);
  const parsed = _extractJSON(raw);
  if (!parsed.sections) throw new Error('Invalid notes structure from Gemini');
  if (statusEl) statusEl.innerHTML = `✅ Notes structured into ${parsed.sections.length} sections`;
  return parsed;
}

// Plain text generation (for Ask AI in notes page)
async function geminiAsk(prompt) {
  return await geminiGenerate(prompt, null);
}

// ─── Sync status indicator ───────────────────────────────────────────────────
function _notifySyncStatus() {
  document.querySelectorAll('#syncStatus, .sync-pill').forEach(el => {
    const map = {
      idle:    ['', ''],
      loading: ['⟳ Syncing…', '#a1a1aa'],
      saving:  ['⟳ Saving…', '#a1a1aa'],
      saved:   ['✓ Synced', '#22c55e'],
      loaded:  ['✓ Live', '#22c55e'],
      offline: ['⚠ Offline', '#f59e0b'],
      error:   ['✕ Error', '#ef4444']
    };
    const [txt, color] = map[_syncStatus] || ['', ''];
    el.textContent = txt;
    el.style.color = color;
  });
}

function _toast(msg, type = 'success') {
  if (typeof showToast === 'function') showToast(msg, type);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCourse(id)  { return APP_DATA.courses.find(c => c.id === id); }

function getNextExam() {
  const now = new Date();
  return APP_DATA.courses
    .filter(c => new Date(c.examDate) > now)
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))[0] || null;
}

function formatDate(s) {
  return new Date(s).toLocaleDateString('en-PK', { weekday:'short', month:'short', day:'numeric' });
}
function formatTime(s) {
  return new Date(s).toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' });
}
function daysUntil(s) {
  return Math.ceil((new Date(s) - new Date()) / 86400000);
}

// ─── Read tracking (localStorage) ────────────────────────────────────────────
function markRead(courseId, topic) {
  const key = `read_${courseId}`;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  if (!list.includes(topic)) { list.push(topic); localStorage.setItem(key, JSON.stringify(list)); }
}
function unmarkRead(courseId, topic) {
  const key = `read_${courseId}`;
  const list = JSON.parse(localStorage.getItem(key) || '[]').filter(t => t !== topic);
  localStorage.setItem(key, JSON.stringify(list));
}
function isRead(courseId, topic) {
  return JSON.parse(localStorage.getItem(`read_${courseId}`) || '[]').includes(topic);
}
function getReadList(courseId) {
  return JSON.parse(localStorage.getItem(`read_${courseId}`) || '[]');
}

function showToast(msg, type='success') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id='toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.cssText = `background:${type==='error'?'#1a0a0a':'#0a1a0a'};border:1px solid ${type==='error'?'rgba(239,68,68,.3)':'rgba(34,197,94,.3)'};padding:12px 20px;border-radius:8px;font-size:13px;color:${type==='error'?'#ef4444':'#22c55e'};position:fixed;bottom:24px;right:24px;z-index:9999;transform:translateX(120%);transition:transform .3s cubic-bezier(.16,1,.3,1);box-shadow:0 10px 30px rgba(0,0,0,.5)`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => { t.style.transform = 'translateX(0)'; });
  setTimeout(() => { t.style.transform = 'translateX(120%)'; setTimeout(() => t.remove(), 400); }, 3500);
}

function toggleMobileNav() {
  document.getElementById('mobileNav')?.classList.toggle('open');
}

// Boot
loadData();
