# APEX Training App — Deployment Guide

## Quick Deploy to Vercel (Free, 5 minutes)

### Step 1 — Create GitHub account
Go to https://github.com and create a free account if you don't have one.

### Step 2 — Create new repository
1. Click the "+" icon → "New repository"
2. Name it: `apex-training`
3. Set to **Public**
4. Click "Create repository"

### Step 3 — Upload files
1. Click "uploading an existing file"
2. Upload ALL files from this folder maintaining the folder structure:
   - index.html
   - manifest.json
   - sw.js
   - src/ (entire folder)
   - icons/ (entire folder)
3. Click "Commit changes"

### Step 4 — Deploy to Vercel
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Select your `apex-training` repository
5. Click "Deploy" — no settings needed

### Step 5 — Add to phone home screen
**iPhone (Safari):**
1. Open your Vercel URL in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add"

**Android (Chrome):**
1. Open your Vercel URL in Chrome
2. Tap the three dots menu
3. Tap "Add to Home Screen"
4. Tap "Add"

The app now works like a native app — full screen, no browser bar, offline support.

## Your App URL
After deployment, your URL will be: https://apex-training.vercel.app
(or similar — Vercel shows you the exact URL)

## Data
All your training data is stored in your phone's browser storage.
It stays on your phone — no account needed, no cloud, no subscription.

## Updating the App
If you want to add features later, just update the files on GitHub
and Vercel automatically redeploys within 30 seconds.
