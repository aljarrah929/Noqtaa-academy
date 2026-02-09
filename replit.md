# Noqtaa Academy - University E-Learning Platform

## Overview

A scalable university e-learning platform (MVP) for paid academic courses targeting university students across multiple colleges. The platform features strict role-based access control with five user roles (Student, Teacher, Admin, Super Admin, Accountant) and supports three colleges (Pharmacy, Engineering, IT) with distinct visual themes.

Key features:
- Course browsing with locked lesson content for non-enrolled students
- Teacher course creation with admin approval workflow
- Role-based dashboards for students, teachers, and administrators
- College-specific theming with custom primary/secondary colors
- Email-only communication between students and teachers (mailto links)
- External payment handling (no in-platform payment processing)
- Content protection: dynamic watermarking, anti-copy CSS, screenshot/shortcut blocking

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

**Authentication Flow (2FA via Email)**:
1. User submits email/password to `POST /api/auth/login`
2. Server validates credentials, generates 6-digit OTP, saves to DB (5-min expiry), sends via Resend
3. Server returns `{ requireOtp: true, userId }` (no session created yet)
4. Frontend switches to OTP input step
5. User enters code, submits to `POST /api/auth/verify-otp` with `{ userId, otp }`
6. Server validates OTP + expiry, clears OTP fields, creates session, returns user object

**Route Structure**:
- `/api/auth/*` - Authentication endpoints (login, signup, verify-otp, forgot-password, reset-password)
- `/api/colleges/*` - College CRUD operations
- `/api/courses/*` - Course management with approval workflow
- `/api/lessons/*` - Lesson content management
- `/api/enrollments/*` - Student enrollment management
- `/api/join-requests/*` - Join request management (student enrollment requests)
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
- `joinRequests` - Student enrollment requests with payment receipt uploads
  - Status workflow: PENDING → APPROVED/REJECTED
  - Stores receipt file metadata (receiptKey, receiptMime, receiptSize)
- `courseApprovalLogs` - Audit trail for course approval decisions
- `sessions` - PostgreSQL-backed session storage

### Role-Based Access Control
- **STUDENT**: Browse courses, view enrolled content, access student dashboard
- **TEACHER**: Create/edit own courses, submit for approval, manage lesson content, upload videos to Cloudflare Stream
- **ADMIN**: Approve/reject courses, manage teachers within assigned college
- **SUPER_ADMIN**: Full system access, manage all users/roles, manage colleges, upload videos
- **ACCOUNTANT**: Read-only access to enrollment statistics grouped by college, PDF report download (`/accountant` dashboard)

### Accountant API Endpoints
- `GET /api/accountant/enrollments` - Returns enrollment stats grouped by college (requires ACCOUNTANT or SUPER_ADMIN role)
- `GET /api/accountant/enrollments.pdf` - Generates English PDF enrollment report (requires ACCOUNTANT or SUPER_ADMIN role)

### Join Request API Endpoints
Student endpoints:
- `GET /api/join-requests/me?courseId=X` - Get student's join request status for a course
- `POST /api/join-requests/presign-receipt` - Get presigned R2 URL for receipt upload (requires STUDENT role)
- `POST /api/join-requests` - Create new join request with receipt metadata (requires STUDENT role)

Teacher/Admin endpoints:
- `GET /api/join-requests` - List all join requests (teachers see own courses, admins see all)
- `POST /api/join-requests/:id/approve` - Approve request and enroll student (teachers only for own courses)
- `POST /api/join-requests/:id/reject` - Reject request (teachers only for own courses)
- `GET /api/join-requests/:id/receipt` - Get presigned download URL for receipt image/PDF

Join Request Flow:
1. Student visits course detail page and clicks "Request to Join"
2. Student uploads payment receipt (JPG, PNG, or PDF, max 10MB) via presigned R2 URL
3. Student submits request with optional message
4. Teacher views pending requests at `/teacher/join-requests`
5. Teacher reviews receipt and approves or rejects
6. On approval, student is automatically enrolled in the course

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

### Content Protection
- **WatermarkOverlay** (`client/src/components/WatermarkOverlay.tsx`): Single moving text element showing user phone/email + publicId, opacity 0.4, white with text shadow, repositions randomly every 5s
- **Global Screenshot Detection** (`client/src/App.tsx`): PrintScreen keyup listener attached to `window` in AppContent component; shows fullscreen red overlay for 10s; calls `POST /api/security/report-screenshot` with userId; works on every page when user is logged in
- **useContentProtection** (`client/src/hooks/useContentProtection.ts`): Legacy hook (no longer used); content protection (right-click, Ctrl+S/P blocking, anti-copy CSS) now inline in LessonDetail
- **Anti-Copy CSS** (`client/src/index.css`): `body.content-protected` class disables text selection and image dragging; applied via hook on LessonDetail page
- **Violation Reporting**: `POST /api/security/report-screenshot` endpoint accepts `{ userId }`, looks up user details, and sends email alert to `support@noqtaa.cloud` via Resend
- **Integration**: Watermark applied on LessonDetail page and inside ProtectedVideo component and iframe video containers (Cloudflare/YouTube)

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
- **Max Size**: 1GB per video
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