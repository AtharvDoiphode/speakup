# Deploying SpeakUp to Render

SpeakUp runs as **one** Render web service: the Express server answers `/api/*` and serves the built React app (`client/dist`) for every other page, on the same address. `render.yaml` describes it.

## 1. MongoDB Atlas: allow Render to connect

Render's free plan has no fixed outgoing IP address, so Atlas must accept connections from anywhere:

1. Atlas → your project → **Network Access** → **Add IP Address**.
2. Choose **Allow access from anywhere** (`0.0.0.0/0`) → Confirm.
3. Make sure the database user in your connection string has a strong password. That password is now the only lock on the database.

## 2. Create the service from the blueprint

1. Push this repo to GitHub.
2. Render → **New** → **Blueprint** → pick the repo. Render reads `render.yaml`: one free web service in Singapore, `npm run build`, `npm start`, health check `/api/health`.
3. Render asks for each secret marked `sync: false`. Paste the values below.

## 3. Environment variables to paste into Render

| Key | What to paste |
|---|---|
| `MONGODB_URI` | Your Atlas connection string (`mongodb+srv://…/speakup?…`), the same one as `MONGO_URI` in `server/.env` |
| `JWT_SECRET` | A **new** random string of at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. Don't reuse your local one. |
| `GEMINI_API_KEY` | Your key from aistudio.google.com |
| `ADMIN_EMAIL` | The email that becomes admin when it registers |
| `CLIENT_ORIGIN` | Your Render address, e.g. `https://speakup.onrender.com` (no trailing slash). You can only fill this in after Render shows the URL; until then, paste a placeholder and update it. |
| `SIGNUP_CODE` | The family signup code. It's used only the first time; after that the admin changes it in Settings. |

These are already set in `render.yaml` and need no action: `NODE_ENV=production`, `NODE_VERSION=24`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` and `APP_TIMEZONE=Asia/Kolkata`. Render sets `PORT` itself.

If a required value is missing or `JWT_SECRET` is too short, the deploy log shows `Server settings are not valid:` and names each problem.

## 4. Check it

- Open `https://<your-app>.onrender.com/api/health`. You should see `{"status":"ok","uptime":…,"db":"connected"}`.
- **Register the admin account first**, before you share the signup code. `ADMIN_EMAIL` only becomes admin while no admin exists yet. If you use the same Atlas database as on your laptop, your existing admin account is already there and simply logs in.
- Refresh on a deep page (e.g. `/history`). It should still load.
- **Rate limit check (once).** The login limit (20 tries per 15 minutes) must count each person separately, which depends on how many proxies Render puts in front of the app (the server assumes one):
  1. On your laptop, open the login page with DevTools → Network.
  2. Try a wrong password once and look at the `RateLimit` response header of the `login` request. It ends in `r=19`.
  3. On your phone **on mobile data** (not your Wi-Fi), try a wrong password once.
  4. Try once more on the laptop. If it says `r=18`, the counts are separate, which is correct. If it says `r=17`, everyone shares one count. In that case, tell me and we'll raise the `trust proxy` number in `server/src/app.js`.

## 5. Optional: keep it awake with UptimeRobot

A free Render service sleeps after 15 minutes without traffic, and the first visit then takes about a minute (the app shows "Waking the server up…").

1. uptimerobot.com → **New monitor** → type **HTTP(s)**.
2. URL: `https://<your-app>.onrender.com/api/health`, interval **5 minutes**.

The health check makes no database query, so the pings cost nothing. Note that Render's free plan has a monthly limit on running hours; one always-on service fits within it.
