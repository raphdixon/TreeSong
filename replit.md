# DemoTree - Music Demo Sharing Platform

## Overview

DemoTree is a public music sharing platform where musicians can upload their demos and receive emoji reactions from listeners. The application enforces first-listen restrictions to ensure full song completion before allowing interaction, then enables emoji reactions to be placed at specific timeline positions. Features a retro Windows 95 aesthetic using the 98.css library.

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

### Emoji Reaction System
- Emoji reactions placed at specific audio timeline positions  
- First-listen restriction preventing skipping until track completion
- Session-based listen tracking for restriction enforcement
- Always-visible emoji picker window with popular music emojis

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
- July 05, 2025. Desktop Environment with Floating Windows 95-Style Track Windows
  - Completely redesigned feed to display floating Windows 95-style windows on desktop background
  - Implemented automatic track jumping on scroll with smooth transitions between tracks  
  - Added Windows 95 taskbar with track counter, upload/login buttons, and retro digital clock
  - Enhanced responsive design with desktop arrow navigation and mobile touch controls
  - Added smooth scroll wheel navigation that automatically jumps between tracks
  - Each track displays in its own retro-styled floating window with authentic Windows 95 aesthetics
  - Removed all remaining BPM functionality and cleaned up player interface completely
  - Emoji picker always visible for immediate reactions on first listen
  - Desktop environment supports keyboard navigation (arrows, spacebar) for track jumping
- July 04, 2025. Major transformation: Built TikTok-like music discovery platform  
  - Created vertical scrolling newsfeed with Windows 95 aesthetics (/feed)
  - Implemented recommendation algorithm (emoji reactions + recency + randomness)
  - Added keyboard navigation (arrow keys) and auto-track advance
  - Built public track discovery with /api/tracks/public endpoint
  - Updated app routing to make feed the main page for logged-in users
  - Removed all BPM detection features to focus on discovery
  - Added TikTok-style CSS with retro Windows 95 design elements
  - Transformed from team collaboration to public music discovery
- July 04, 2025. Fixed database isolation - users now only see tracks from their team
  - Updated routes to use authenticated user's teamId instead of hardcoded values
  - Removed BPM field from database schema completely
- July 03, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```