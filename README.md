# IANWC Parking Alert — GitHub + Vercel Setup

## Your file structure (upload all of these to GitHub)
```
ianwc-parking-alert/
├── api/
│   └── alert.js          ← Vercel serverless function (the backend)
├── public/
│   ├── admin.html         ← Open on your phone to fire alerts
│   └── display.html       ← Open on the TV
├── package.json
└── vercel.json
```

---

## Step 1 — Push to GitHub (5 min)

1. Go to https://github.com → sign in (or create a free account)
2. Click **"New repository"**
   - Name it: `ianwc-parking-alert`
   - Keep it **Public** (required for free Vercel)
   - Click **Create repository**
3. On the next page click **"uploading an existing file"**
4. Upload ALL files maintaining the folder structure:
   - Drag the entire `ianwc-parking-alert` folder, OR
   - Create folders manually: click "Create new file", type `api/alert.js`, paste content, repeat for each file
5. Click **Commit changes**

---

## Step 2 — Deploy on Vercel (3 min)

1. Go to https://vercel.com → sign in with GitHub
2. Click **"Add New Project"**
3. Find and click **Import** next to your `ianwc-parking-alert` repo
4. Leave all settings as default → click **Deploy**
5. Wait ~30 seconds → Vercel gives you a URL like `ianwc-parking-alert.vercel.app`

---

## Step 3 — Add Vercel KV (free storage, 2 min)

Vercel KV is their built-in Redis — it stores the alert data between your phone and the TV.

1. In your Vercel project dashboard → click **"Storage"** tab
2. Click **"Create Database"** → select **KV**
3. Name it `parking-kv` → click **Create**
4. Click **"Connect to Project"** → select your project → **Connect**
5. That's it — Vercel automatically adds the KV environment variables to your project

---

## Step 4 — Redeploy (30 seconds)

After connecting KV, trigger one more deploy so it picks up the new env vars:
1. In Vercel dashboard → **Deployments** → click the `...` menu on the latest deployment → **Redeploy**

---

## You're live! Your URLs:

| Page | URL |
|------|-----|
| **Admin (your phone)** | `https://your-project.vercel.app/admin` |
| **TV Display** | `https://your-project.vercel.app/display` |

---

## How to use

1. Open `/display` on the TV browser — bookmark it, set it as the homepage
2. Open `/admin` on your phone — bookmark it to your home screen
3. When a car is illegally parked:
   - Tap the vehicle photo zone → take a photo
   - Tap the plate photo zone → take a close-up
   - Tap **FIRE ALERT ON TV**
4. The TV switches from standby to the full alert display **within 3 seconds**
5. After 90 seconds it auto-returns to standby — or you can cancel early

---

## Updating the app later

Just edit files in GitHub → Vercel auto-deploys within 30 seconds. No commands needed.

---

## Costs

Everything used here is **100% free**:
- GitHub: free public repos
- Vercel: free hobby tier (generous limits)
- Vercel KV: free tier (30,000 requests/month — you'd need thousands of alerts to hit this)
