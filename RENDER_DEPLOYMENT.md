# LA KOMIKA Theatre System - Render Deployment Guide

Complete guide to deploying both backend and frontend on Render.com.

## 📋 Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com) (free tier available)
3. **Environment Variables**: Have your JWT_SECRET ready

## 🚀 Part 1: Deploy Backend

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository

### Step 2: Configure Backend Service

Use these settings:

- **Name**: `lakomika-theatre-backend`
- **Region**: Frankfurt (or closest to you)
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free

### Step 3: Environment Variables

Add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Sets production mode |
| `JWT_SECRET` | (generate strong secret) | Used for token signing |
| `PORT` | `10000` | Render default port |

To generate a strong JWT_SECRET:
```bash
# In PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))
```

### Step 4: Deploy Backend

1. Click **"Create Web Service"**
2. Wait for initial deployment (2-5 minutes)
3. Once deployed, note your backend URL:
   - Will be something like: `https://lakomika-theatre-backend.onrender.com`

### Step 5: Test Backend

Visit: `https://your-backend-url.onrender.com/api/health`

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "LA KOMIKA Theatre System Backend"
}
```

## 🎨 Part 2: Deploy Frontend

### Step 1: Update Frontend Configuration

Before deploying, update the backend URL in your local repository:

1. Edit `frontend/.env.production`:
   ```env
   VITE_API_URL=https://your-actual-backend-url.onrender.com/api
   ```

2. Commit and push changes:
   ```bash
   git add frontend/.env.production
   git commit -m "Update production API URL"
   git push
   ```

### Step 2: Create Static Site

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repository (same repo)

### Step 3: Configure Frontend Service

Use these settings:

- **Name**: `lakomika-theatre-frontend`
- **Region**: Frankfurt (same as backend)
- **Branch**: `main`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Plan**: Free

### Step 4: Environment Variables

Add environment variable:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://your-backend-url.onrender.com/api` |

### Step 5: Configure Rewrites (Important!)

Add this rewrite rule for React Router:

1. In the Static Site settings, find **"Redirects/Rewrites"**
2. Add:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`

### Step 6: Deploy Frontend

1. Click **"Create Static Site"**
2. Wait for deployment (2-5 minutes)
3. Your app will be live at: `https://lakomika-theatre-frontend.onrender.com`

## ✅ Verification

### Test Backend
1. Visit health endpoint: `/api/health`
2. Try login from frontend

### Test Frontend
1. Open your frontend URL
2. Try logging in:
   - Admin: `matus`
   - Usher: `NatyJeBoss2025`
   - Actor: `kulisa25`
3. Check calendar functionality
4. Verify mobile responsiveness

## 🔄 Automatic Deployments

Render automatically redeploys when you push to GitHub:

- **Backend**: Redeploys on any change to `backend/` folder
- **Frontend**: Redeploys on any change to `frontend/` folder

To disable auto-deploy:
- Go to Settings → "Auto-Deploy" → Turn off

## 🗄️ Database Persistence

The SQLite database (`theater.db`) is stored in the service's file system.

**Important**: Render's free tier services spin down after inactivity. The database persists, but:
- First request after spin-down takes 30-50 seconds
- To keep it always active, upgrade to a paid plan

### Database Backup

To backup your database:

1. Connect to Render Shell:
   ```bash
   # From Render Dashboard → Shell
   cat theater.db | base64
   ```

2. Copy the output and save locally

3. To restore, decode and upload

## 🐛 Troubleshooting

### Backend Issues

**"Application failed to respond"**
- Check logs in Render Dashboard
- Verify PORT environment variable is set
- Ensure all dependencies installed

**"CORS errors"**
- Verify frontend URL is allowed in CORS settings
- Check `server.js` CORS configuration includes `.onrender.com`

**"Database errors"**
- Check if `theater.db` file exists
- Look for SQLite errors in logs
- May need to delete and recreate on first deploy

### Frontend Issues

**"Failed to fetch" or network errors**
- Verify `VITE_API_URL` matches your backend URL exactly
- Include `/api` at the end of the URL
- Check browser console for exact error

**404 on refresh**
- Ensure rewrite rule is configured
- Check Publish Directory is set to `dist`

**Blank page**
- Check browser console for errors
- Verify build completed successfully
- Check if `dist/` folder was created in build logs

### Performance

**Slow first request**
- Free tier services spin down after 15 min inactivity
- First request takes 30-50 seconds to spin up
- Subsequent requests are fast

## 💰 Costs

### Free Tier Includes:
- ✅ 750 hours/month per service
- ✅ Automatic SSL certificates
- ✅ Git-based deploys
- ✅ Unlimited bandwidth

### Limitations:
- ⚠️ Services spin down after inactivity
- ⚠️ 512 MB RAM
- ⚠️ Shared CPU

### Upgrade Options:
- **Starter ($7/month)**: Always on, more resources
- **Standard ($25/month)**: Better performance
- See [Render Pricing](https://render.com/pricing)

## 🔐 Security Best Practices

1. **JWT_SECRET**: Use a strong, random secret
2. **HTTPS**: Automatically enabled by Render
3. **Environment Variables**: Never commit secrets to Git
4. **CORS**: Keep restricted to your domains

## 📊 Monitoring

### Check Service Health

**Backend**:
```bash
curl https://your-backend-url.onrender.com/api/health
```

**Frontend**:
- Visit your frontend URL
- Should load without errors

### View Logs

1. Go to Render Dashboard
2. Select your service
3. Click "Logs" tab
4. Real-time logs show all requests and errors

## 🔄 Updates & Maintenance

### Deploy New Version

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update feature X"
   git push
   ```
3. Render automatically deploys

### Manual Deploy

1. Go to service in Dashboard
2. Click "Manual Deploy" → "Deploy latest commit"

### Rollback

1. Go to "Events" tab
2. Find previous successful deploy
3. Click "Rollback to this version"

## 🆘 Support Resources

- **Render Docs**: https://render.com/docs
- **Community**: https://community.render.com
- **Status**: https://status.render.com

## 📝 Checklist

Backend Setup:
- [ ] Repository connected
- [ ] Build/Start commands configured
- [ ] Environment variables set
- [ ] Health check responds
- [ ] CORS allows frontend domain

Frontend Setup:
- [ ] API URL updated in .env.production
- [ ] Build command configured
- [ ] Publish directory set to `dist`
- [ ] Rewrite rule configured
- [ ] Frontend loads successfully
- [ ] Login works
- [ ] Calendar functions properly

---

**Your LA KOMIKA Theatre System is now deployed! 🎭**

Backend: `https://lakomika-theatre-backend.onrender.com`
Frontend: `https://lakomika-theatre-frontend.onrender.com`
