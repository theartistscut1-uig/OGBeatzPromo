# MusicForge

MusicForge is a YouTube-first creator console built with React, Vite, and Azure-backed services.

## What Works

- Local browser storage for app data
- YouTube connect flow from the app
- YouTube upload workflow from the Post tab
- YouTube comments loading and replies
- Azure Function App routes for platform actions

Instagram code is still present, but YouTube is the primary workflow.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure frontend env

Create `.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
# Azure Function App root URL. The app appends /api automatically.
# VITE_AZURE_FUNCTION_APP_URL=https://func-ogbeatz-api.azurewebsites.net

# Optional: only set this if your API is not hosted alongside the frontend.
# VITE_API_BASE_URL=http://localhost:8787/api
```

### 3. Configure server env

Create `.env.local`:

```env
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:8787/api/auth/instagram/callback
APP_URL=http://localhost:5173
POSTGRES_CONNECTION_STRING=your_postgres_connection_string
AZURE_STORAGE_CONNECTION_STRING=your_storage_connection_string
# Optional:
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
OPENAI_API_KEY=your_ai_key
```

These server values are needed for the backend API to sync app data to PostgreSQL and uploads to Blob Storage.

### 4. Start the app

Run these in separate terminals:

```bash
npm run api
```

```bash
npm run dev
```

## Backend

MusicForge uses the local backend in `api/` for development and the Azure Function App in production for:

- PostgreSQL-backed app data sync
- Blob Storage uploads
- Instagram login
- Instagram account sync
- Instagram publishing
- Instagram inbox replies
- YouTube comments
- YouTube uploads

The frontend talks to `/api` by default in local development and to the Azure Function App when `VITE_AZURE_FUNCTION_APP_URL` is set.

## Azure Deployment

This repo can deploy the frontend to Azure Static Web Apps.

The workflow uses GitHub Actions in `.github/workflows/deploy-azure-static-web-app.yml`.

Add this repository secret:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN
VITE_GOOGLE_CLIENT_ID
VITE_AZURE_FUNCTION_APP_URL
```
