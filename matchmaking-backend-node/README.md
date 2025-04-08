# Matchmaking Application Deployment Guide

## Overview
This is a matchmaking application with CAS authentication for IIIT students. It consists of a Node.js backend and a React frontend.

## Backend Deployment on Render

### 1. Create MongoDB Atlas Database
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster (Free tier is sufficient)
3. Set up database access:
   - Create a new database user with password
   - Note the username and password for later
4. Set up network access:
   - Allow access from anywhere (IP: 0.0.0.0/0)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Select "Connect your application"
   - Copy the connection string (it will look like: `mongodb+srv://username:password@cluster0.mongodb.net/...`)

### 2. Deploy Backend to Render
1. Sign up at [Render](https://render.com/)
2. Create a new Web Service:
   - Connect your GitHub repository
   - Name: `matchmaking-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   
3. Set environment variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (Render may override this, it's fine)
   - `MONGODB_URI`: Your MongoDB Atlas connection string (replace `username`, `password` with actual values)
   - `SESSION_SECRET`: A random secure string (generate one at [random.org](https://www.random.org/strings/))

4. Deploy the service and note your Render URL (e.g., `https://matchmaking-backend.onrender.com`)

### 3. Update Code with Actual URLs

After deployment, you need to update these values in your code:

1. In the backend's `index.js`:
   - Replace `https://matchmaking-backend.onrender.com` with your actual Render URL
   - Replace `https://your-frontend-url.vercel.app` with your actual frontend URL

2. In your frontend code:
   - Update all API calls to use your Render backend URL instead of localhost

## Important Notes

### CAS Authentication
Make sure your CAS settings in the deployed application match exactly:
- The `service_url` in `cas.CasAuthentication` must be your Render URL

### CORS Configuration
Ensure your CORS configuration includes your actual frontend domain after deployment.

### Cookie Settings
Secure cookies and proper sameSite values are set for production.

### Monitoring
After deployment, monitor the Render logs to ensure connections to MongoDB Atlas and CAS are working properly.