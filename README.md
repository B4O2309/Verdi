# Verdi

A full-stack real-time chat application — direct messages, group chats, and a friend system, built solo from scratch over ~2.5 months.

## What it does

Users can create an account, add friends, and chat in real-time through direct conversations or multi-member group chats. Messages support emoji reactions, replies, image attachments, and in-conversation search. Everything updates live without page refreshes.

## Tech stack

**Frontend** — TypeScript

- React 19, Vite
- TailwindCSS 4
- Zustand — client state
- Socket.io Client — real-time events
- React Router 7, React Hook Form, Zod
- Axios, Radix UI, Lucide React

**Backend** — JavaScript

- Node.js, Express
- MongoDB + Mongoose
- Socket.io — WebSocket server
- JWT with automatic token refresh
- Passport.js — Google OAuth 2.0
- Cloudinary — image hosting
- Nodemailer — OTP emails
- bcrypt, Swagger UI

## Features

### Authentication
- Register with email + password, or sign in with Google
- JWT-based sessions with silent token refresh
- Forgot password flow: enter email → receive 6-digit OTP → reset password
- Passwords hashed with bcrypt

### Messaging
- Direct messages and group chats, both in real-time via Socket.io
- Reply to a specific message with a quoted preview
- Emoji reactions on any message
- Image uploads in chat (stored on Cloudinary)
- In-conversation search with keyword highlight
- Infinite scroll through message history
- Read/unread tracking with per-user "seen" indicators
- Delete a message (removes it only for you)
- Hide or delete a whole conversation

### Friend system
- Send, accept, and decline friend requests
- Live toast notifications when a request is accepted
- View a user's profile card inline without leaving the chat

### Groups
- Create a group from your friends list, name it, add members
- Member avatars shown in the conversation header
- Any member can view the full member list

### Profile & settings
- Update display name, username, email, phone, bio, avatar
- Light / dark mode toggle
- Online status toggle (show or hide your active state)
- Change password from inside the app
- Block users (blocked users cannot message you)
- Active sessions list
- Permanent account deletion

## Project structure

```
frontend/                   React + TypeScript (Vite)
  src/
    pages/                  SignInPage, SignUpPage, ChatAppPage, GoogleCallbackPage
    components/
      auth/                 Login / register forms
      chat/                 Message list, input, reactions, search
      sidebar/              Conversation list, group list
      profile/              Profile & settings modal
      friendRequest/        Friend request panel
      addFriendModal/       Add friend UI
      newGroupChat/         Group creation flow
      createNewChat/        New DM flow
      skeleton/             Loading skeletons
      ui/                   Shared primitive components
    stores/                 Zustand stores (auth, chat, friend, block, socket, theme, user)
    services/               API call wrappers (auth, chat, friend, user)
    hooks/                  use-mobile.ts
    lib/                    Axios instance, utilities
    types/                  Shared TypeScript types
    assets/

backend/                    Node.js + Express (JavaScript)
  src/
    server.js               Entry point
    swagger.json            OpenAPI spec
    controllers/            authController, conversationController, messageController,
                            friendController, blockController, userController
    routes/                 authRoute, conversationRoute, messageRoute,
                            friendRoute, blockRoute, userRoute
    models/                 User, Conversation, Message, Friend, FriendRequest,
                            Block, OTP, Session
    socket/                 index.js — Socket.io event handlers
    middlewares/            Auth guards, error handler
    libs/                   db.js — MongoDB connection
    utils/                  messageHelper.js
```

## Getting started

**Prerequisites:** Node.js 18+, MongoDB (local or Atlas), a Cloudinary account, a Google OAuth app, and an email account for Nodemailer.

```bash
# 1. Clone
git clone https://github.com/B4O2309/Verdi.git
cd Verdi

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Configure environment variables
#    backend/.env   — see backend/.env.example
#    frontend/.env  — see frontend/.env.example

# 4. Run
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open `http://localhost:5173`.

**Environment variables (backend)**

```
PORT=
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_USER=
EMAIL_PASS=
CLIENT_URL=http://localhost:5173
```

## API docs

With the backend running, open `http://localhost:4000/api-docs` for the full Swagger UI reference.

## Known limitations

- No push notifications — alerts only appear while the tab is open
- No message editing — delete is for the sender only
- Groups have no admin role; any member can add others
- Mobile layout is not optimised (desktop-first build)

## Development timeline

Built solo between **February 6 and April 16, 2026** — 25 commits across auth, real-time messaging, group chats, friend system, notifications, and final polish.

## License

MIT
