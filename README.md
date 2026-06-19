# Pulse — Free Messaging App

A modern, mobile-first real-time messaging app built with **Next.js**, **Tailwind CSS**, **SQLite**, and **Socket.io**. Completely free to run — no paid services required.

## Features

- Real-time messaging with WebSockets
- User registration & authentication
- Mobile-first UI (WhatsApp-style navigation)
- Online status & typing indicators
- Search users & start new conversations
- Unread message badges
- Smooth animations & dark theme

## Quick Start

```bash
cd messaging-app
npm install
npm run db:push
npm run db:seed
npm run dev
```

This starts **two servers**:
- Next.js app → [http://localhost:3000](http://localhost:3000)
- WebSocket server → port 3001 (real-time messaging)

Or run them separately:

```bash
npm run dev:next    # port 3000
npm run dev:socket  # port 3001
```

### Demo accounts

| Username | Password |
|----------|----------|
| alice    | demo123  |
| bob      | demo123  |
| carol    | demo123  |

Open two browser windows (or use incognito) with different accounts to test real-time chat.

## Tech Stack

| Layer      | Technology        | Cost   |
|------------|-------------------|--------|
| Frontend   | Next.js + React   | Free   |
| Styling    | Tailwind CSS v4   | Free   |
| Database   | SQLite + Prisma   | Free   |
| Real-time  | Socket.io         | Free   |
| Auth       | JWT + bcrypt      | Free   |

## Scripts

- `npm run dev` — Start dev server with WebSockets
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run db:push` — Sync database schema
- `npm run db:seed` — Seed demo users

## Project Structure

```
messaging-app/
├── socket-server.ts       # WebSocket server (port 3001)
├── scripts/
│   ├── dev.mjs            # Run both servers in dev
│   └── start.mjs          # Run both servers in production
├── prisma/
│   ├── schema.prisma      # Database models
│   └── seed.ts            # Demo data
└── src/
    ├── app/               # Pages & API routes
    ├── components/        # UI components
    ├── hooks/             # Socket.io hook
    └── lib/               # Auth, DB, utils
```
