# BCS 3A Platform — v3

## ⚠️ IMPORTANT: Deployment Options (Read This First)

The AI features use the Gemini API. How well they work depends on WHERE you deploy.

---

### ✅ Option A: GitHub Pages (RECOMMENDED — AI works 100%)

GitHub Pages has NO AI Gateway, NO interception. The Gemini API works directly.

1. Create a free account at github.com
2. Create a new repository (e.g. `bcs3a`)
3. Upload all files from this folder
4. Go to Settings → Pages → Source: Deploy from branch → main → / (root)
5. Your site is live at `https://yourusername.github.io/bcs3a`

**AI works instantly. No extra configuration needed.**

---

### ✅ Option B: Netlify (AI works via Edge Function)

The site includes a Netlify Edge Function (`netlify/edge-functions/gemini-proxy.js`)
that bypasses Netlify's AI Gateway. Deploy like this:

1. Go to netlify.com → Add new site → Deploy manually
2. Drag the entire `bcs3a-v3` FOLDER onto Netlify's deploy area
3. Wait for deploy to complete
4. **If AI still doesn't work:** Go to Site Settings → AI Gateway → **Disable** it
5. Redeploy (Deploys tab → Trigger deploy)

---

### ✅ Option C: Any other static host

Vercel, Cloudflare Pages, Firebase Hosting, Surge.sh — all work fine.
Just upload the files. AI works directly from the browser.

---

## Admin Panel

Password: `bcs3a2026`

## How to Use AI Features

1. Go to Admin → Notes Builder
2. Select a course, type a topic name
3. Paste your lecture notes/slides content
4. Click **"✦ Process Notes + Generate All"**
5. Gemini will structure the notes AND generate 15 MCQs + 20 flashcards
6. Everything deploys to students automatically

## File Structure

```
bcs3a-v3/
├── index.html                          Dashboard
├── notes.html                          Immersive reading
├── quiz.html                           AI-generated MCQs
├── flashcards.html                     Flashcard study
├── admin.html                          Command Center
├── css/main.css                        Full UI system
├── js/data.js                          Data + Gemini AI
├── netlify/edge-functions/
│   └── gemini-proxy.js                 Netlify proxy (auto-used on Netlify)
├── netlify.toml                        Netlify config
└── README.md                           This file
```
