# TreeNote - Audio Collaboration Platform

## Overview

TreeNote is a web application that allows musicians and audio professionals to upload audio tracks, visualize waveforms with optional BPM grid overlays, and collaborate through time-coded comments. The application features a retro Windows 95 aesthetic using the 98.css library and provides both authenticated team collaboration and public sharing capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: 
  - Tailwind CSS for modern utilities
  - 98.css library for Windows 95 retro aesthetic
  - Shadcn/ui components for consistent UI elements
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Audio Visualization**: WaveSurfer.js for waveform display and interaction
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **File Storage**: Local filesystem in `/uploads` directory
- **Email**: SendGrid integration for team invitations

### Key Technologies
- **Database ORM**: Drizzle with Neon PostgreSQL
- **File Upload**: Multer middleware with 50MB limit
- **Audio Processing**: Realtime BPM Analyzer for tempo detection
- **Password Hashing**: bcrypt for secure authentication
- **Session Management**: Express sessions with PostgreSQL store

## Key Components

### Authentication System
- JWT-based authentication with HTTP-only cookies
- User registration with email verification
- Team-based access control
- Invitation system for team collaboration

### Audio Processing Pipeline
1. **File Upload**: Supports MP3, WAV, and OGG formats up to 50MB
2. **BPM Detection**: Automatic tempo analysis using Realtime BPM Analyzer
3. **Waveform Generation**: Client-side visualization with WaveSurfer.js
4. **Beat Grid Overlay**: Visual tempo grid aligned to detected or manual BPM

### Comment System
- Time-coded comments linked to specific audio positions
- Real-time collaboration features
- Public and private comment visibility
- Email notifications for new comments

### Sharing Mechanism
- Public share links with unique tokens
- Read-only access for non-team members
- Secure token-based authentication for shared content

## Data Flow

### User Registration/Login Flow
1. User submits credentials → Backend validates → JWT token generated
2. Token stored in HTTP-only cookie → Frontend auth state updated
3. Protected routes check authentication status via `/api/me` endpoint

### Audio Upload Flow
1. File selected → Multer processes upload → File saved to `/uploads`
2. Metadata stored in database with team association
3. Optional BPM analysis performed client-side
4. User redirected to player page for immediate playback

### Comment Creation Flow
1. User clicks on waveform → Comment popup appears
2. Comment submitted with time position → Stored in database
3. Email notifications sent to team members
4. Comments rendered as markers on waveform

### Sharing Flow
1. User requests share link → Unique token generated
2. Public URL created with token → Share record stored in database
3. Public access grants read-only view without authentication

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/**: Accessible UI component primitives
- **wavesurfer.js**: Audio waveform visualization
- **realtime-bpm-analyzer**: Audio tempo detection

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and development experience
- **ESBuild**: Fast JavaScript bundling for production

### External Services
- **SendGrid**: Email delivery for invitations and notifications
- **Neon**: Managed PostgreSQL database hosting

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: ESBuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for token signing
- `SENDGRID_API_KEY`: API key for email service
- `SENDGRID_FROM_EMAIL`: Sender email address

### File Management
- Audio files stored in local `/uploads` directory
- File cleanup service removes files after 21 days
- Metadata retained in database with deletion timestamps

### Production Considerations
- Express serves both API routes (`/api/*`) and static frontend
- File upload limits enforced at both client and server level
- Database connection pooling for scalability
- Error handling and logging throughout application

## Changelog

```
Changelog:
- July 03, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```