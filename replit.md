# University E-Learning Platform

## Overview

A scalable university e-learning platform (MVP) for paid academic courses targeting university students across multiple colleges. The platform features strict role-based access control with four user roles (Student, Teacher, Admin, Super Admin) and supports three colleges (Pharmacy, Engineering, IT) with distinct visual themes.

Key features:
- Course browsing with locked lesson content for non-enrolled students
- Teacher course creation with admin approval workflow
- Role-based dashboards for students, teachers, and administrators
- College-specific theming with custom primary/secondary colors
- Email-only communication between students and teachers (mailto links)
- External payment handling (no in-platform payment processing)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite with hot module replacement

**Design Pattern**: Material Design-inspired with educational refinement, emphasizing clear information hierarchy for complex course/enrollment data and consistent patterns across role-based dashboards.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Style**: RESTful JSON API under `/api` prefix
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

**Route Structure**:
- `/api/auth/*` - Authentication endpoints
- `/api/colleges/*` - College CRUD operations
- `/api/courses/*` - Course management with approval workflow
- `/api/lessons/*` - Lesson content management
- `/api/enrollments/*` - Student enrollment management
- `/api/users/*` - User management (admin only)
- `/api/stream/*` - Cloudflare Stream video upload integration

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema synchronization
- **Auto-Initialization**: `server/db-init.ts` ensures required colleges exist on startup (prevents FK constraint errors)

**Core Entities**:
- `users` - Extended Replit Auth users with roles and college associations
  - Has `publicId` field: Unique identifier format `XXNNNNNN` (2-letter college code + 6 random digits)
  - College codes: PH (Pharmacy), EN (Engineering), IT (IT), XX (no college/admins)
- `colleges` - College definitions with theme colors
- `courses` - Courses with status workflow (DRAFT → PENDING_APPROVAL → PUBLISHED/REJECTED)
- `lessons` - Course content with ordering and content types (video, text, link, file)
- `enrollments` - Student-course relationships
- `courseApprovalLogs` - Audit trail for course approval decisions
- `sessions` - PostgreSQL-backed session storage

### Role-Based Access Control
- **STUDENT**: Browse courses, view enrolled content, access student dashboard
- **TEACHER**: Create/edit own courses, submit for approval, manage lesson content, upload videos to Cloudflare Stream
- **ADMIN**: Approve/reject courses, manage teachers within assigned college
- **SUPER_ADMIN**: Full system access, manage all users/roles, manage colleges, upload videos

### Client-Server Communication
- **Data Fetching**: TanStack Query with automatic caching and refetching
- **API Client**: Custom `apiRequest` utility with credentials and error handling
- **Type Sharing**: Zod schemas generated from Drizzle for runtime validation

## External Dependencies

### Authentication
- **Replit OIDC**: Primary authentication provider via `openid-client`
- **Passport.js**: Session-based authentication middleware

### Database
- **PostgreSQL**: Primary data store (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: PostgreSQL session store

### UI Framework
- **Radix UI**: Headless component primitives (dialogs, dropdowns, tabs, etc.)
- **shadcn/ui**: Pre-styled component library built on Radix
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first CSS framework

### Video Hosting
**Option 1: Cloudflare Stream** (managed video encoding)
- **Endpoint**: `POST /api/stream/create-upload` - Creates direct upload URL
- **Access**: TEACHER and SUPER_ADMIN roles only
- **Required Secrets**: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_TOKEN`

**Option 2: Backblaze B2 + Cloudflare CDN** (cost-effective self-hosted) - **ACTIVE**
- **Presign Endpoint**: `POST /api/b2/video/presign` - Creates presigned PUT URL for direct B2 upload
- **Proxy Endpoint**: `POST /api/b2/video/upload` - Backend proxy upload (multipart/form-data fallback for CORS)
- **Verify Endpoint**: `POST /api/b2/video/verify` - Verifies object exists in B2 after upload
- **Access**: TEACHER and SUPER_ADMIN roles only
- **Max Size**: 500MB per video
- **Object Key Format**: `videos/<courseId>/<timestamp>-<safeFileName>` (generated via `buildVideoObjectKey()`)
- **CDN URL Format**: `https://media.cpeacademy.online/<objectKey>` (stored in DB only after verification)
- **Upload Flow with Verification**:
  1. Frontend requests presigned URL → receives `uploadUrl`, `cdnUrl`, `objectKey`
  2. Frontend tries direct PUT to B2
  3. After PUT success, frontend calls `/api/b2/video/verify` with `objectKey`
  4. Backend uses HeadObjectCommand to verify object exists in B2
  5. If verification fails → falls back to proxy upload via backend
  6. Proxy upload also verifies object exists before returning success
  7. Only after B2 verification succeeds is the CDN URL considered valid
- **Video Player Error Handling**: Shows visible "Video Unavailable" error with retry button if video fails to load
- **Required Secrets**:
  - `B2_KEY_ID`: Backblaze B2 application key ID
  - `B2_APP_KEY`: Backblaze B2 application key secret
  - `B2_BUCKET_NAME`: Name of the B2 bucket (CPE-academy)
  - `B2_ENDPOINT`: S3-compatible endpoint (e.g., `s3.eu-central-003.backblazeb2.com` - https:// added automatically)
  - `B2_REGION`: Region for S3 compatibility (e.g., `eu-central-003`)
  - `CDN_BASE_URL`: Cloudflare CDN URL (`https://media.cpeacademy.online`)

### File Storage
- **Cloudflare R2**: S3-compatible object storage for lesson files
- **Endpoints**:
  - `POST /api/r2/presign` - Creates presigned PUT URL for direct upload
  - `GET /api/r2/download?key=...` - Secure file download with access control
- **Access**: TEACHER and SUPER_ADMIN can upload; download requires course ownership, enrollment, or admin role
- **File Types**: pdf, doc, docx, ppt, pptx, zip, png, jpg, jpeg (max 100MB)
- **Required Secrets**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Object Key Format**: `courses/<courseId>/<timestamp>-<safeFileName>`

### Environment Requirements
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `REPL_ID`: Replit environment identifier (auto-provided in Replit)
- `ISSUER_URL`: OIDC issuer URL (defaults to Replit OIDC)
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID for Stream API
- `CLOUDFLARE_STREAM_TOKEN`: API token with Stream permissions