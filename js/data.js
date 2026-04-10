// ─── BCS 3A Platform v4 — Data & Cloud Sync ──────────────────────────────────

const APP_DATA = {
  meta: { university:"COMSATS University Islamabad", class:"BCS Section A", semester:"3rd Semester", session:"Spring 2026" },
  courses: [
    { id:"dld",  code:"CSC202", name:"Fundamentals of Digital Logic Design", short:"DLD",     teacher:"Muhammad Bilal Qasim", icon:"⚡", color:"dld",  examDate:"2026-04-14T14:00:00", examEnd:"2026-04-14T15:30:00", room:"CL-05, CL-06" },
    { id:"se",   code:"CSC301", name:"Software Engineering",                  short:"SE",      teacher:"Ch. Anwar Shaukat",    icon:"🛠", color:"se",   examDate:"2026-04-15T10:20:00", examEnd:"2026-04-15T11:50:00", room:"210, 106, 107" },
    { id:"ds",   code:"CSC211", name:"Data Structures",                       short:"DS",      teacher:"Dr. Inayat-ur-Rehman", icon:"🌲", color:"ds",   examDate:"2026-04-16T15:50:00", examEnd:"2026-04-16T17:20:00", room:"G-05" },
    { id:"calc", code:"MTH101", name:"Calculus and Analytic Geometry",        short:"Calculus",teacher:"Dr. Saqib Zia",        icon:"∫",  color:"calc", examDate:"2026-04-20T10:20:00", examEnd:"2026-04-20T11:50:00", room:"CL-07, CL-08" },
    { id:"db",   code:"CSC221", name:"Database Systems",                      short:"DB",      teacher:"Dr. Rubina Adnan",     icon:"🗄", color:"db",   examDate:"2026-04-21T14:00:00", examEnd:"2026-04-21T15:30:00", room:"CL-09, CL-10" }
  ],
  // notes[courseId][topicName] = { markdown: "# Heading\n**bold**...", summary:"" }
  notes:         {},
  // quizzes[courseId] = [ {q, opts:["A.x","B.y","C.z","D.w"], ans:0, exp:"", topic:"", difficulty:"easy|medium|hard"} ]
  quizzes:       {},
  // flashcards[courseId] = [ {q, a, topic} ]
  flashcards:    {},
  announcements: [],  // [ {id, type, msg, date} ]
  resources:     {},  // { courseId: [{title, url, type, topic, uploadedAt}] }
  presence:      {}   // { sessionId: {name, page, ts} }
};

// ─── Cloud (JSONBin) ──────────────────────────────────────────────────────────
const PRESENCE_BIN_ID = '69d90713aaba882197e49e22';
const BIN_ID     = '69d6d7a9aaba882197da5ce4';
const MASTER_KEY = '$2a$10$71mUhVOOXOpiRPD96MDIDenFdtAoL9GG5B7Z8yqijyH.Fx6xCQWJ6';

let _syncStatus = 'idle';

async function saveData() {
  _syncStatus = 'saving'; _notifySyncStatus();
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method:'PUT', headers:{'Content-Type':'application/json','X-Master-Key':MASTER_KEY},
      body: JSON.stringify(APP_DATA)
    });
    _syncStatus = res.ok ? 'saved' : 'error';
    if (res.ok) _toast('✅ Saved & deployed to all students.');
    else        _toast('❌ Save failed.','error');
  } catch(e) { _syncStatus='error'; _toast('❌ Network error.','error'); }
  _notifySyncStatus();
}

async function loadData() {
  _syncStatus = 'loading'; _notifySyncStatus();
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
      { headers:{'X-Master-Key':MASTER_KEY} });
    if (res.ok) {
      const { record } = await res.json();
      if (record.notes)         APP_DATA.notes         = record.notes         || {};
      if (record.quizzes)       APP_DATA.quizzes       = record.quizzes       || {};
      if (record.flashcards)    APP_DATA.flashcards    = record.flashcards    || {};
      if (record.announcements) APP_DATA.announcements = record.announcements || [];
      if (record.resources)     APP_DATA.resources     = record.resources     || {};
      if (record.presence)      APP_DATA.presence      = record.presence      || {};
      if (record.courses) {
        record.courses.forEach(rc => {
          const lc = APP_DATA.courses.find(c => c.id === rc.id);
          if (lc) { if(rc.examDate)lc.examDate=rc.examDate; if(rc.examEnd)lc.examEnd=rc.examEnd; if(rc.room)lc.room=rc.room; }
        });
      }
      _syncStatus = 'loaded';
    } else { _syncStatus = 'offline'; }
  } catch(e) { _syncStatus = 'offline'; }
  _notifySyncStatus();
  _pingPresence();
  if (typeof onDataLoaded === 'function') onDataLoaded();
}

// ─── Presence ────────────────────────────────────────────────────────────────
// ─── Presence ────────────────────────────────────────────────────────────────
const _SID  = (() => { let i=sessionStorage.getItem('bcs_sid'); if(!i){i='u'+Math.random().toString(36).slice(2,8);sessionStorage.setItem('bcs_sid',i);} return i; })();

async function _pingPresence() {
  const now = Date.now();
  try {
    // 1. Fetch ONLY the presence data from your NEW bin
    const res = await fetch(`https://api.jsonbin.io/v3/b/${PRESENCE_BIN_ID}/latest`, { headers: {'X-Master-Key': MASTER_KEY} });
    let liveData = { presence: {} };
    if (res.ok) {
       const json = await res.json();
       liveData = json.record || { presence: {} };
    }

    // 2. Clean up old inactive users
    Object.keys(liveData.presence).forEach(k => { if (now - liveData.presence[k].ts > 180000) delete liveData.presence[k]; });

    // 3. Add current user
    liveData.presence[_SID] = { 
       name: localStorage.getItem('bcs_name') || 'Student', 
       page: document.title.split('—')[0].trim(), 
       ts: now 
    };

    // 4. Save ONLY back to the NEW presence bin
    await fetch(`https://api.jsonbin.io/v3/b/${PRESENCE_BIN_ID}`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
       body: JSON.stringify(liveData)
    });

    APP_DATA.presence = liveData.presence;
  } catch(e) {}
}
setInterval(_pingPresence, 90000);
function getOnlineCount() { const n=Date.now(); return Object.values(APP_DATA.presence||{}).filter(p=>n-p.ts<180000).length; }

// ─── Sync status pill ─────────────────────────────────────────────────────────
function _notifySyncStatus() {
  const MAP = { idle:['',''], loading:['⟳ Syncing…','#a1a1aa'], saving:['⟳ Saving…','#a1a1aa'], saved:['✓ Synced','#22c55e'], loaded:['✓ Live','#22c55e'], offline:['⚠ Offline','#f59e0b'], error:['✕ Error','#ef4444'] };
  document.querySelectorAll('#syncStatus,.sync-pill').forEach(el => {
    const [t,c] = MAP[_syncStatus]||['',''];
    el.textContent = t; el.style.color = c;
  });
}

// ─── Gemini AI — ONLY for "Ask about notes" feature ──────────────────────────
// Notes, MCQs, and flashcards are uploaded manually (markdown + JSON).
// AI is only used for the student "Ask AI" chat in the reading view.
function getGeminiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

async function geminiAsk(prompt) {
  const key = getGeminiKey();
  if (!key) throw new Error('No Gemini API key set. Go to aistudio.google.com/app/apikey to get a free key, then paste it in Admin → Settings.');

  // Try models in order — gemini-2.0-flash-lite is free & fast as of 2025
  const MODELS = ['gemini-2.0-flash-lite','gemini-1.5-flash','gemini-2.0-flash'];
  let lastErr = 'Unknown';

  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.6,maxOutputTokens:1024} })
      });
      if (res.status===404) { lastErr=`Model ${model} not available`; continue; }
      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        lastErr = (e.error&&e.error.message)||`HTTP ${res.status}`;
        // quota / key error — stop trying models
        if (res.status===400||res.status===403) throw new Error(lastErr);
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) { lastErr='Empty response'; continue; }
      return text;
    } catch(e) {
      if (e.message===lastErr) throw e; // already a hard error
      lastErr = e.message; continue;
    }
  }
  throw new Error(lastErr);
}

// ─── Markdown → HTML renderer ─────────────────────────────────────────────────
// Converts ChatGPT-style markdown to rich HTML. No external libraries needed.
function renderMarkdown(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inOrderedList = false;
  let inTable = false;
  let tableHeader = false;

  const escHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const inlineFormat = s => s
    .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>')
    .replace(/~~(.+?)~~/g,'<del>$1</del>')
    .replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank" class="note-link">$1</a>');

  const closeList = () => {
    if (inList)        { html += '</ul>'; inList = false; }
    if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
    if (inTable)       { html += '</tbody></table>'; inTable = false; tableHeader = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) { closeList(); html += ''; continue; }

    // Headings
    if (/^#{6}\s/.test(trimmed)) { closeList(); html += `<h6 class="note-h6">${inlineFormat(trimmed.slice(7))}</h6>`; continue; }
    if (/^#{5}\s/.test(trimmed)) { closeList(); html += `<h5 class="note-h5">${inlineFormat(trimmed.slice(6))}</h5>`; continue; }
    if (/^#{4}\s/.test(trimmed)) { closeList(); html += `<h4 class="note-h4">${inlineFormat(trimmed.slice(5))}</h4>`; continue; }
    if (/^#{3}\s/.test(trimmed)) { closeList(); html += `<h3 class="note-h3">${inlineFormat(trimmed.slice(4))}</h3>`; continue; }
    if (/^#{2}\s/.test(trimmed)) { closeList(); html += `<h2 class="note-h2">${inlineFormat(trimmed.slice(3))}</h2>`; continue; }
    if (/^#{1}\s/.test(trimmed)) { closeList(); html += `<h1 class="note-h1">${inlineFormat(trimmed.slice(2))}</h1>`; continue; }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(trimmed)) { closeList(); html += '<hr class="note-hr">'; continue; }

    // Code block
    if (trimmed.startsWith('```')) {
      closeList();
      const lang = trimmed.slice(3).trim();
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += escHtml(lines[i]) + '\n';
        i++;
      }
      html += `<pre class="note-code-block"><code>${code.trimEnd()}</code></pre>`;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      closeList();
      html += `<blockquote class="note-blockquote">${inlineFormat(trimmed.slice(2))}</blockquote>`;
      continue;
    }

    // Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1,-1).split('|').map(c => c.trim());
      // Check if this is the separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        tableHeader = false; // next rows are body
        continue;
      }
      if (!inTable) {
        closeList();
        html += '<table class="note-table"><thead><tr>';
        cells.forEach(c => { html += `<th>${inlineFormat(c)}</th>`; });
        html += '</tr></thead><tbody>';
        inTable = true; tableHeader = true;
        continue;
      }
      if (tableHeader) {
        // Still in head
        html += '<tr>'; cells.forEach(c => { html += `<th>${inlineFormat(c)}</th>`; }); html += '</tr>';
      } else {
        html += '<tr>'; cells.forEach(c => { html += `<td>${inlineFormat(c)}</td>`; }); html += '</tr>';
      }
      continue;
    } else if (inTable) { closeList(); }

    // Unordered list
    if (/^[-*+]\s/.test(trimmed)) {
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (!inList) { html += '<ul class="note-ul">'; inList = true; }
      html += `<li>${inlineFormat(trimmed.replace(/^[-*+]\s/,''))}</li>`;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (!inOrderedList) { html += '<ol class="note-ol">'; inOrderedList = true; }
      html += `<li>${inlineFormat(trimmed.replace(/^\d+\.\s/,''))}</li>`;
      continue;
    }

    // Special callout patterns (from ChatGPT output)
    if (/^\*\*(Note|Important|Warning|Tip|Key Point|Definition|Formula|Example):\*\*/i.test(trimmed)) {
      closeList();
      const typeMatch = trimmed.match(/^\*\*(\w[\w\s]*):\*\*/i);
      const type = typeMatch[1].toLowerCase();
      const rest = inlineFormat(trimmed.replace(/^\*\*[\w\s]*:\*\*\s*/i,''));
      const cls = type.includes('note')||type.includes('import') ? 'callout-info'
                : type.includes('warn')                          ? 'callout-warn'
                : type.includes('tip')||type.includes('key')     ? 'callout-tip'
                : type.includes('def')                           ? 'callout-def'
                : type.includes('form')                          ? 'callout-formula'
                :                                                  'callout-example';
      html += `<div class="note-callout ${cls}"><span class="callout-label">${typeMatch[1]}</span>${rest}</div>`;
      continue;
    }

    // Regular paragraph
    closeList();
    if (trimmed) html += `<p class="note-p">${inlineFormat(trimmed)}</p>`;
  }

  closeList();
  return html;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getNextExam() {
  const now = new Date();
  return APP_DATA.courses.filter(c=>new Date(c.examDate)>now).sort((a,b)=>new Date(a.examDate)-new Date(b.examDate))[0]||null;
}
function formatDate(s) { return new Date(s).toLocaleDateString('en-PK',{weekday:'short',month:'short',day:'numeric'}); }
function formatTime(s) { return new Date(s).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}); }
function daysUntil(s) { return Math.ceil((new Date(s)-new Date())/86400000); }

function markRead(courseId,topic) { const k=`read_${courseId}`;const l=JSON.parse(localStorage.getItem(k)||'[]');if(!l.includes(topic)){l.push(topic);localStorage.setItem(k,JSON.stringify(l));} }
function unmarkRead(courseId,topic) { const k=`read_${courseId}`;localStorage.setItem(k,JSON.stringify(JSON.parse(localStorage.getItem(k)||'[]').filter(t=>t!==topic))); }
function isRead(courseId,topic) { return JSON.parse(localStorage.getItem(`read_${courseId}`)||'[]').includes(topic); }
function getReadList(courseId) { return JSON.parse(localStorage.getItem(`read_${courseId}`)||'[]'); }

function showToast(msg,type='success') {
  let c=document.getElementById('_toasts');
  if(!c){c=document.createElement('div');c.id='_toasts';c.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';document.body.appendChild(c);}
  const t=document.createElement('div');
  t.style.cssText=`background:${type==='error'?'#200':'#020'};border:1px solid ${type==='error'?'#ef4444':'#22c55e'};color:${type==='error'?'#ef4444':'#22c55e'};padding:12px 18px;border-radius:8px;font-size:13px;font-family:var(--font-body,sans-serif);transform:translateX(120%);transition:transform .3s ease;box-shadow:0 8px 24px rgba(0,0,0,.6)`;
  t.textContent=msg; c.appendChild(t);
  requestAnimationFrame(()=>t.style.transform='translateX(0)');
  setTimeout(()=>{t.style.transform='translateX(120%)';setTimeout(()=>t.remove(),400);},3500);
}
function _toast(m,t){showToast(m,t);}
function toggleMobileNav(){document.getElementById('mobileNav')?.classList.toggle('open');}

// Boot
loadData();
