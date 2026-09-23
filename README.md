# Kai – AI Powered Mental Health Well-being Assistant

[![Repository](https://img.shields.io/badge/GitHub-Kai--Version--1.0-183b46?logo=github)](https://github.com/shalini355/Kai-Version-1.0)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-246b78)](https://github.com/shalini355/Kai-Version-1.0/tree/main/client)
[![Backend](https://img.shields.io/badge/backend-Express%20%2B%20MongoDB-3c8c83)](https://github.com/shalini355/Kai-Version-1.0/tree/main/server)

Kai is a full-stack, AI-powered mental wellness platform for a B.Tech final year project. It provides an empathetic conversational assistant in English and Hinglish, mood tracking, guided wellness activities, private journaling, and access to mental health resources in a private, non-judgmental space.

> **Disclaimer:** Kai is not a substitute for professional mental health care. If you or someone you know is in crisis, contact local emergency services, a licensed professional, or a verified mental health helpline immediately. See the in-app Resources page.

Repository: https://github.com/shalini355/Kai-Version-1.0

## Features

- **AI chat:** Context-aware English and Hinglish conversations powered by Mistral AI.
- **Crisis safety:** Server-side crisis-language detection with a Resources escalation path.
- **Mood tracker:** Daily check-ins with notes and 7-day or 30-day Recharts trends.
- **Private journal:** Create, edit, and delete entries scoped to the logged-in user.
- **Guided breathing:** Frontend-only animated box-breathing timer.
- **Daily affirmations:** A rotating curated affirmation shown once per day.
- **Secure authentication:** JWT access and refresh cookies with bcrypt password hashing.
- **Privacy controls:** Rate limiting, Helmet, restricted CORS, validation, and centralized errors.

## Tech Stack

- **Frontend:** React, Vite, React Router, Axios, Tailwind CSS tooling, Recharts, Lucide React
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, express-validator
- **AI:** Official `@mistralai/mistralai` SDK with `mistral-large-latest` primary and `mistral-small-latest` fallback
- **Testing:** Jest and Supertest

## Project Structure

```text
KAI Version 1.0/
├── client/
│   ├── src/
│   │   ├── App.jsx          # Routes, auth shell, and feature views
│   │   ├── api.js           # Axios client and refresh handling
│   │   ├── affirmations.js  # Daily affirmation data
│   │   └── index.css        # Responsive visual system
│   ├── .env.example
│   └── package.json
├── server/
│   ├── src/
│   │   ├── app.js           # Express middleware and API routes
│   │   ├── auth.js          # Registration, login, refresh, and logout
│   │   ├── chat.js          # Mistral integration and crisis detection
│   │   ├── config.js        # Environment configuration
│   │   ├── middleware.js    # Auth guard and error handling
│   │   ├── models.js        # User, Message, Mood, and Journal schemas
│   │   └── server.js        # MongoDB connection and server startup
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── SYSTEM_ARCHITECTURE.md
├── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20 or later
- npm
- MongoDB local instance or MongoDB Atlas account
- Mistral AI API key for live AI responses

## Setup

Clone the repository:

```powershell
git clone https://github.com/shalini355/Kai-Version-1.0.git
cd Kai-Version-1.0
```

Copy the environment templates:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Install dependencies:

```powershell
npm install --prefix client
npm install --prefix server
```

Fill in `server/.env` before starting the API. Never commit real `.env` files or API keys. No seed data is required; MongoDB collections are created on first write.

## Environment Variables

### `server/.env`

| Variable | Description |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `MISTRAL_API_KEY` | Mistral key used only by the backend |
| `JWT_SECRET` | Long random access-token secret |
| `JWT_REFRESH_SECRET` | Long random refresh-token secret |
| `PORT` | Backend port, normally `5000` |
| `CLIENT_ORIGIN` | Frontend origin used by CORS |
| `NODE_ENV` | `development` or `production` |

### `client/.env`

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API URL, normally `http://localhost:5000/api` |

Never put the Mistral key in the client environment or expose it through a `VITE_` variable.

## Run Locally

Start the backend in one terminal:

```powershell
npm run server:dev
```

Start the frontend in a second terminal:

```powershell
npm run client:dev
```

Open `http://localhost:5173`.

If another project uses port `5173`, run Kai on `5174`:

```powershell
Set-Location client
npm run dev -- --port 5174
```

Then set this in `server/.env` and restart the backend:

```env
CLIENT_ORIGIN=http://localhost:5174
```

## Tests and Build

```powershell
npm run server:test
npm run client:build
```

The backend tests cover protected authentication routes, protected chat routes, and crisis-language detection. The frontend build verifies the production bundle.

## System Architecture

See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for the folder structure, data flow, ER diagram, and Mermaid diagrams.

```text
User (Browser) <-> React Frontend <-> Express Backend <-> MongoDB
                                      |
                                      +--> Mistral AI API
```

The frontend sends credentials using httpOnly cookies. The backend verifies the user, scopes personal-data queries by user id, checks crisis language before AI calls, and stores chat responses in MongoDB. The Mistral API key remains on the server.

## Resources

The in-app Resources page provides emergency-support guidance and professional-support placeholders. Replace placeholders such as `[ADD VERIFIED CURRENT NUMBER]` with verified, current local information before presenting the project publicly.

## Security and Privacy

- Passwords are hashed with bcryptjs.
- Access and refresh tokens are stored in httpOnly cookies.
- Personal records are scoped by authenticated user id.
- Auth and chat routes are rate-limited.
- Helmet and restricted CORS are enabled.
- Chat and journal content is not logged by the application in production.
- Use HTTPS and strong unique secrets in production.
- Revoke and replace any API key that has been exposed.

## License

This project is intended for personal, educational, and non-commercial use.
