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
- Emoji reactions placed at specific audio timeline positions with random vertical heights
- Immediate access to emoji reactions without restrictions
- Always-visible emoji picker window with popular music emojis
- Global volume control affecting all tracks simultaneously

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

### Emoji Reaction Flow
1. User clicks emoji from always-visible picker → Reaction placed at current playback time
2. Reaction stored in database with time position and random vertical height
3. Emoji appears immediately on waveform timeline
4. Global volume control affects all audio tracks simultaneously

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
- July 07, 2025. Removed Legacy Username Field from Entire Codebase
  - Completely removed the username field from database schema, storage interface, and all UI components
  - Username was a legacy field from pre-Replit Auth that was no longer being populated
  - Updated artist page routing from `/artist/:username` to `/artist/:userId` for consistency
  - Modified feed page to link to artist pages using uploaderUserId instead of username
  - Removed all creatorUsername references from Track interfaces and display logic
  - Database migration successfully completed, removing unused track_listens table
- July 07, 2025. Fixed Artist Name Display in All UI Components
  - Fixed issue where tracks were showing "Unknown Artist" instead of the artist name
  - The username field is empty for Replit Auth users (legacy field from previous auth system)
  - Updated feed and artist pages to prioritize creatorArtistName over creatorUsername
  - Backend no longer defaults empty usernames to "Unknown Artist"
  - Frontend components consistently check artistName first before falling back to username
- July 07, 2025. Fixed Emoji Persistence Issue & Enhanced Real-Time Updates
  - Fixed emoji reactions disappearing when scrolling away and back to a track
  - Separated track switching logic from emoji data loading logic
  - Emojis now persist properly when navigating between tracks
  - Added real-time emoji counter showing "X/10" format above emoji picker
  - Moved pagination controls below emoji grid for better UX
  - Enhanced emoji state management for better user experience
- July 07, 2025. MP3-Only Upload Restriction & Enhanced Windows 95 Dialogue Boxes
  - Restricted file uploads to MP3 format only for consistency and performance
  - Updated frontend validation to only accept MP3 files with improved error messages
  - Updated backend multer configuration to validate MP3 files by extension and MIME type
  - Enhanced Windows 95 styling for upload modal with authentic grey backdrop and inset borders
  - Improved share modal styling with proper Windows 95 dialogue box appearance
  - Updated upload UI text to clearly indicate "MP3 files only (Max 50MB)"
  - All dialogue boxes now use consistent Windows 95 aesthetic with proper fonts and spacing
- July 07, 2025. Real Waveform Generation Implementation
  - Replaced fake/generated waveforms with real audio analysis using FFmpeg
  - Waveforms now accurately reflect actual audio content of each track
  - Implemented server-side waveform generation during file upload
  - Waveform data stored in database for fast retrieval (no regeneration on page load)
  - Using fluent-ffmpeg to extract PCM audio data and generate 300 peak points
  - Waveforms cached permanently for optimal performance
  - Frontend fetches pre-generated waveform data via /api/tracks/:id/waveform endpoint
- July 07, 2025. Removed First-Listen Restrictions & Enhanced Volume Control
  - Completely removed first-listen restriction system allowing immediate emoji reactions
  - Eliminated all listen tracking functionality (trackListens table, routes, components)
  - Enhanced global volume control in Windows 95 taskbar with cleaner popup interface
  - Removed 50% and 100% preset buttons from volume popup, keeping only Mute
  - Made close button smaller and later removed it entirely for cleaner UX
  - Volume popup now toggles properly when clicking speaker icon again
  - All tracks now support immediate seeking and emoji placement without restrictions
- July 05, 2025. Replit Auth Integration Complete
  - Replaced JWT-based authentication with Replit Auth (OpenID Connect)
  - Updated database schema to support Replit user data (id, email, firstName, lastName, profileImageUrl)
  - Added sessions table for secure session management with PostgreSQL store
  - Installed and configured passport, openid-client, express-session packages
  - Updated all protected routes to use Replit Auth middleware
  - Modified frontend to use new authentication endpoints (/api/login, /api/logout, /api/auth/user)
  - Users can now log in with their Replit accounts seamlessly
- July 05, 2025. Pixel-Perfect Windows 95 Audio Player UI Transformation
  - Completely rebuilt interface to match authentic Windows 95 aesthetic
  - Implemented 16-color Win95 palette (#000080 navy, #C0C0C0 gray, #FFFFFF white)
  - Added Press Start 2P bitmap font throughout entire interface
  - Created authentic 3D beveled buttons with proper outset/inset borders
  - Redesigned waveform with Win95 blue bars (#0000FF) on white background
  - Built compact audio player window with classic title bar and window controls
  - Implemented 4x3 emoji reaction grid below waveform area
  - Added digital time display with retro green-on-black monospace styling
  - Removed all modern UI elements and rounded corners for sharp pixel-perfect edges
  - Applied aggressive CSS overrides to ensure Win95 styling takes priority
- July 05, 2025. Universal Feed Homepage - Made feed accessible to all users
  - Changed homepage routing so all users (logged in and out) see the music discovery feed
  - Login page now only accessible via login button in taskbar
  - Removed redundant taskbar from main app since feed has its own
  - Feed shows "Login" button for visitors and "Upload" button for authenticated users
- July 05, 2025. Comprehensive Security & Performance Refactor
  - Added rate limiting to authentication endpoints (5 requests per 15 minutes)
  - Fixed JWT_SECRET environment validation with proper TypeScript typing
  - Removed all comment-related dead code (routes, UI components, email templates)
  - Eliminated N+1 query pattern in public tracks API (reduced from N+1 to 2 queries)
  - Removed 33 unused dependencies (~700KB+ bundle reduction):
    * 14 unused Radix UI components (@radix-ui/react-*)
    * realtime-bpm-analyzer (since BPM functionality was removed)
    * memoizee, memorystore and their 16 transitive dependencies
  - Fixed all TypeScript compilation errors with proper null checks
  - Implemented batch emoji reaction fetching for optimal performance
  - Enhanced Express type definitions for better req.user safety
- July 05, 2025. Mobile-First Compact UI Redesign with Fixed Height Layout
  - Redesigned from desktop-first to mobile-first single-screen player interface
  - Fixed waveform height (120px desktop, 140px mobile) to prevent distortion
  - Created perfect 4x8 emoji grid (32 emojis) with responsive layouts
  - Desktop: 8 columns × 4 rows, Mobile: 4 columns × 8 rows
  - Removed popup tooltips and section headers for cleaner interface
  - Fixed container heights (450px desktop, 450px mobile) showing desktop behind
  - Eliminated separate emoji reactions section, emojis appear only on waveform
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