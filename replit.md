# BookWise - AI-Powered Reading Tracker

## Overview

BookWise is a comprehensive book library management application with AI-powered features, gamification, and social elements. Users can track their reading, get AI-generated summaries and quizzes, earn badges for achievements, discover new books through personalized recommendations, and collaborate with friends through book clubs. The application features a React frontend with a Node.js/Express backend, using PostgreSQL for data persistence and OpenAI integrations for AI-powered features.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2026)

### New Features
- **Gamification System**: Badge system with 5 tiers (bronze, silver, gold, platinum, diamond) for quizzes completed, books added, books read, and daily streaks
- **User Stats Tracking**: Daily streak tracking, total quizzes completed, books added/read counts
- **Notifications**: In-app notification system for badge awards, streak milestones, and recommendations
- **Book Clubs**: Social feature allowing users to create clubs, invite members via code, and chat
- **Enhanced Quiz System**: Now generates 10 questions with mixed types (true/false, multiple choice, select-all)
- **Favorites System**: Mark books as favorites with heart icon, filter library by favorites
- **View Controls**: Grid/list toggle, sorting (title, author, date, rating, status), grouping (author, status, genre)
- **AI Grouping**: Smart thematic grouping of books using AI analysis
- **External Book Search**: Search for books from Google Books/Open Library directly in search bar
- **Starter Books**: New users automatically receive "Cosmos" and "Moby Dick" to get started

### UI Improvements
- Navigation bar now includes notification bell with unread count
- Book cards show favorite status with heart icon
- Badges page displays all achievements with progress bars
- Book clubs page with member management and messaging

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful endpoints under /api/* namespace
- **Authentication**: Replit Auth with OpenID Connect, session-based using connect-pg-simple

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit with `db:push` command
- **Key Tables**: 
  - Core: users, sessions, books, quizzes, recommendations, conversations, messages
  - Gamification: userStats, badges, notifications
  - Social: bookClubs, bookClubMembers, bookClubMessages

### Authentication & Authorization
- Replit OpenID Connect integration
- Session storage in PostgreSQL (sessions table)
- Middleware pattern with `isAuthenticated` checks on protected routes

### AI Integrations (via Replit AI Integrations)
- **Chat**: OpenAI GPT-5.1 for generating book summaries, chapter summaries, and recommendations
- **Image**: GPT-image-1 for image generation/analysis (book cover scanning)
- **Quiz Generation**: 10 mixed-type questions (true/false, multiple choice, select-all)
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components including shadcn/ui
    pages/        # Route pages (Home, BookDetail, Quiz, Badges, BookClubs, etc.)
    hooks/        # Custom React hooks (use-books, use-badges, use-notifications)
    lib/          # Utilities (queryClient, auth-utils)
server/           # Express backend
  routes.ts       # All API route handlers
  storage.ts      # Database access layer with 30+ methods
  replit_integrations/  # AI feature modules (auth, chat, image, audio)
shared/           # Shared code (schema, routes, models)
```

### API Design
- Route definitions in `shared/routes.ts` with Zod validation schemas
- Type-safe API contracts shared between frontend and backend
- Query invalidation pattern for optimistic UI updates

### Key API Endpoints
- Books: CRUD, AI summary, chapter summaries, chat, quiz generation
- Badges: List user badges
- User Stats: Get/update stats, streak tracking
- Notifications: List, unread count, mark read
- Book Clubs: Create, join, list, messages
- External Books: Search Google Books/Open Library
- Recommendations: Generate AI-powered suggestions, personalized feed

## Badge System

Badge types and tiers:
- **Quiz Master**: Complete quizzes (1/5/10/20/50 for bronze/silver/gold/platinum/diamond)
- **Collector**: Add books (1/5/10/20/50)
- **Bookworm**: Read books (1/5/10/20/50)
- **Dedicated Reader**: Daily streaks (3/7/14/30/100 days)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and migrations
- **connect-pg-simple**: PostgreSQL session store for Express

### AI Services (Replit AI Integrations)
- **OpenAI API**: Chat completions, image generation, speech processing
- Required env vars: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Authentication
- **Replit Auth**: OpenID Connect provider
- Required env vars: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

### Key NPM Packages
- **Frontend**: @tanstack/react-query, wouter, framer-motion, date-fns, lucide-react, canvas-confetti
- **Backend**: express, passport, express-session, zod, drizzle-orm
- **Shared**: zod (validation), drizzle-zod (schema generation)

### External APIs
- Google Books API: For fetching book covers and metadata
- Open Library API: Alternative book cover source
