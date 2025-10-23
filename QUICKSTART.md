# Quick Start - Deploy LA KOMIKA Theatre System

## 🚀 Deploy in 3 Steps

### Step 1: Push to GitHub (5 minutes)

```powershell
# Navigate to project
cd C:\Users\matus\worker-scheduler-app

# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "LA KOMIKA Theatre System - Ready for deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/theatre-system.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend (5 minutes)

1. Go to [render.com](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Name**: `lakomika-theatre-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `JWT_SECRET`: Generate with `[System.Guid]::NewGuid().ToString()`
   - `PORT`: `10000`
6. Click **Create Web Service**
7. **Save the URL** (e.g., `https://lakomika-theatre-backend.onrender.com`)

### Step 3: Deploy Frontend (5 minutes)

1. Update `frontend/.env.production` with your backend URL:
   ```env
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```

2. Commit and push:
   ```powershell
   git add frontend/.env.production
   git commit -m "Update backend URL"
   git push
   ```

3. On Render:
   - Click **New +** → **Static Site**
   - Connect same repo
   - Settings:
     - **Name**: `lakomika-theatre-frontend`
     - **Root Directory**: `frontend`
     - **Build**: `npm install && npm run build`
     - **Publish**: `dist`
   - Add Rewrite Rule:
     - Source: `/*`
     - Destination: `/index.html`
     - Action: `Rewrite`
   - Click **Create Static Site**

## ✅ Done!

Your app is live at:
- **Frontend**: `https://lakomika-theatre-frontend.onrender.com`
- **Backend**: `https://lakomika-theatre-backend.onrender.com`

## 🔐 Login Credentials

- **Admin**: `matus`
- **Usher**: `NatyJeBoss2025`
- **Actor**: `kulisa25`

## 📚 Full Documentation

For detailed instructions, troubleshooting, and advanced configuration:
- See `RENDER_DEPLOYMENT.md`
- See `README.md`
- See `DEPLOYMENT_SUMMARY.md`

## 🐛 Issues?

1. Check backend health: Visit `/api/health` endpoint
2. Check logs: Render Dashboard → Your Service → Logs
3. See troubleshooting: `RENDER_DEPLOYMENT.md`

---

**Total time**: ~15 minutes
**Cost**: $0 (Free tier)
