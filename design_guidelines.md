# Design Guidelines: University E-Learning Platform

## Design Approach

**Selected Approach:** Design System (Material Design-inspired with educational refinement)

**Rationale:** This is a utility-focused educational platform requiring clear information hierarchy, multiple role-based dashboards, data-heavy interfaces, and stable, trustworthy design patterns. The system prioritizes usability, accessibility, and scalability over visual experimentation.

**Core Principles:**
- Clear information hierarchy for complex course/enrollment data
- Professional, academic aesthetic that builds institutional trust
- Consistent patterns across role-based dashboards
- Accessibility-first approach for diverse student populations

---

## Typography

**Primary Font:** Inter (via Google Fonts CDN)
- Headings: 600 weight
- Body: 400 weight
- Labels/UI: 500 weight

**Type Scale:**
- Page Titles (H1): text-3xl md:text-4xl font-semibold
- Section Headers (H2): text-2xl md:text-3xl font-semibold
- Card Titles (H3): text-xl font-semibold
- Subsections (H4): text-lg font-medium
- Body Text: text-base
- Secondary/Meta: text-sm
- Small Print: text-xs

---

## Layout System

**Spacing Units:** Use Tailwind units of **2, 4, 6, 8, 12, 16, 20** for consistency
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-20
- Card gaps: gap-4 to gap-6
- Margin between sections: mb-8 to mb-16

**Container Strategy:**
- Public pages: max-w-7xl mx-auto px-4
- Dashboard content: max-w-6xl mx-auto px-6
- Forms/Detailed content: max-w-3xl

**Grid Patterns:**
- Course cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Dashboard widgets: grid-cols-1 lg:grid-cols-2 gap-6
- Admin tables: Full-width responsive tables with horizontal scroll

---

## Component Library

### Navigation
**Public Header:**
- Sticky navigation (sticky top-0 z-50)
- Logo left, nav links center, auth buttons right
- Desktop: Horizontal menu / Mobile: Hamburger menu
- College logo displayed when student is logged in

**Dashboard Sidebar:**
- Fixed left sidebar (w-64 on desktop, collapsible on mobile)
- Role-based menu items with icons (Heroicons via CDN)
- Active state indication with subtle background
- User profile section at bottom with role badge

### Cards & Content Blocks

**Course Card:**
- Elevated card with subtle shadow (shadow-md hover:shadow-lg transition)
- Aspect ratio 16:9 placeholder/thumbnail area at top
- College badge in top-right corner
- Title, brief description, teacher name
- Status badge for teachers/admins (DRAFT/PENDING/PUBLISHED)
- Enrollment count for teachers
- Clear CTA button at bottom

**Lesson List Item:**
- Horizontal layout with icon (video/text/file/link indicator)
- Lesson title and order number
- Lock icon with reduced opacity for locked content
- Unlock state shows full content access

**Locked Content UI:**
- Centered lock icon (large, 80px)
- "Content Locked" heading
- Clear message: "You must be enrolled to view this lesson"
- Prominent "Contact Teacher" button (mailto link)
- No content preview or hints

### Forms & Inputs

**Standard Input Fields:**
- Label above input (text-sm font-medium mb-2)
- Input with border, rounded corners (rounded-lg)
- Focus state with enhanced border
- Error states with red border and message below
- Consistent height: h-12

**College Selection (Signup):**
- Radio card pattern: Large clickable cards showing college name, logo, and brief description
- 3 cards in grid (grid-cols-1 md:grid-cols-3 gap-4)
- Selected state with prominent border and background treatment
- Required field with validation

**Action Buttons:**
- Primary CTA: Solid background, semibold text, px-6 py-3, rounded-lg
- Secondary: Outline style with border
- Danger (reject/delete): Red treatment
- Icon + text for dashboard actions

### Data Display

**Statistics Cards (Admin/Teacher Dashboard):**
- Grid of metric cards showing key numbers
- Large number (text-4xl font-bold)
- Label below (text-sm)
- Icon in corner
- Subtle background treatment

**Approval Queue Table:**
- Full-width responsive table
- Columns: Course Title, Teacher, College, Submitted Date, Actions
- Row hover states
- Action buttons (Approve/Reject) in dedicated column
- Status badges for current state

**Teacher Statistics Table:**
- Columns: Teacher Name, Email, Courses Created, Total Students
- Sortable headers
- Clean alternating row pattern

### Status Indicators

**Course Status Badges:**
- DRAFT: Neutral (gray background)
- PENDING_APPROVAL: Warning (yellow/orange)
- PUBLISHED: Success (green)
- REJECTED: Danger (red)
- Pill shape (rounded-full px-3 py-1 text-xs font-medium)

**Role Badges:**
- Similar styling to status badges
- Displayed in user profile section and admin tables

---

## College Theming System

**Theme Application:**
- Theme applied to students only based on collegeId
- Non-students see neutral default theme
- Theming affects: header, primary buttons, section accents, active states

**Theming Elements:**
- Apply college primaryColor to: header background, primary buttons, active nav items, section highlights
- Apply college secondaryColor to: hover states, secondary accents
- Display college logoUrl in header when student logged in
- Use CSS custom properties for easy theme switching

**Neutral Theme (Default):**
- Professional blue-gray palette
- Clean, academic feel

---

## Page-Specific Layouts

### Home Page (Public)
- Hero section (h-96): Large heading, subtitle, dual CTAs (Browse Courses / Login)
- Featured courses section (3-column grid)
- College highlights section (3-column cards with college info)
- Simple footer with links and contact

### Course Catalog
- Filter sidebar (desktop) / filter dropdown (mobile)
- College filter chips (all, Pharmacy, Engineering, IT)
- Course grid (responsive 1/2/3 columns)
- Empty state when no results

### Course Detail Page
- Course header: Title, description, teacher info, college badge
- Lesson list (ordered, numbered)
- Sidebar: Enrollment status, teacher contact card
- If enrolled: "You're enrolled" message
- If not enrolled: "Contact teacher to enroll" CTA

### Dashboards
**Student Dashboard:**
- "My Enrolled Courses" grid
- Empty state with friendly illustration if no courses
- Quick stats at top (total courses enrolled)

**Teacher Dashboard:**
- Two-tab layout: "My Courses" / "Create Course"
- Course cards with edit/submit for approval actions
- Student enrollment modal/panel
- Course creation form (title, description, college selection)

**Admin Dashboard:**
- Top stats: Pending approvals count, total teachers, total courses
- Approval queue table (prominent)
- Teachers list with stats
- Action modals for approve/reject with reason field

**Super Admin Dashboard:**
- Additional sections for role management and college CRUD
- User management table with role assignment dropdown
- College management cards (edit/delete)

---

## Icons & Assets

**Icon Library:** Heroicons (via CDN) - outline for general use, solid for active/filled states

**Key Icons:**
- Lock/Unlock: For content access states
- User/Users: Profiles and enrollment
- Academic Cap: Courses and learning
- Checkmark/X: Approval actions
- Pencil: Edit actions
- Trash: Delete actions
- Eye: View/Preview

**Images:**
- **Hero Section:** Professional education-themed image showing students collaborating or in lecture hall (1920x600px)
- **Course Thumbnails:** Placeholder images or college-specific imagery
- **College Cards:** College building/logo images
- No large background images in dashboards (keep functional and fast)

---

## Animations

**Minimal Motion:**
- Card hover: subtle shadow transition (transition-shadow duration-200)
- Button hover: slight scale (hover:scale-105 transition-transform)
- Modal/drawer: Simple fade-in
- No page transitions or scroll animations

---

**Accessibility Notes:**
- Maintain 4.5:1 contrast ratios throughout
- All interactive elements keyboard accessible
- Form labels always present
- Status communicated by text, not color alone
- ARIA labels for icon-only buttons