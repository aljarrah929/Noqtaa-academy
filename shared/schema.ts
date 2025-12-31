import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"]);
export const courseStatusEnum = pgEnum("course_status", ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED"]);
export const contentTypeEnum = pgEnum("content_type", ["video", "text", "link", "file"]);
export const approvalActionEnum = pgEnum("approval_action", ["APPROVE", "REJECT"]);
export const joinRequestStatusEnum = pgEnum("join_request_status", ["PENDING", "APPROVED", "REJECTED"]);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Colleges table
export const colleges = pgTable("colleges", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  themeName: varchar("theme_name", { length: 100 }).notNull(),
  primaryColor: varchar("primary_color", { length: 7 }).notNull(),
  secondaryColor: varchar("secondary_color", { length: 7 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table with native authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: text("profile_image_url"),
  role: userRoleEnum("role").notNull().default("STUDENT"),
  collegeId: integer("college_id").references(() => colleges.id),
  isActive: boolean("is_active").notNull().default(true),
  publicId: varchar("public_id", { length: 8 }).unique(),
  passwordResetLastSentAt: timestamp("password_reset_last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  collegeId: integer("college_id").notNull().references(() => colleges.id),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  status: courseStatusEnum("status").notNull().default("DRAFT"),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lessons table
export const lessons = pgTable("lessons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  content: text("content"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enrollments table
export const enrollments = pgTable("enrollments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Course Approval Logs table
export const courseApprovalLogs = pgTable("course_approval_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  action: approvalActionEnum("action").notNull(),
  actorUserId: varchar("actor_user_id").notNull().references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Join Requests table (student requests to join a course with payment receipt)
export const joinRequests = pgTable(
  "join_requests",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    message: text("message"),
    receiptKey: varchar("receipt_key", { length: 500 }).notNull(),
    receiptMime: varchar("receipt_mime", { length: 100 }).notNull(),
    receiptSize: integer("receipt_size").notNull(),
    status: joinRequestStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at").defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (table) => [
    index("idx_join_request_course_student_status").on(table.courseId, table.studentId, table.status),
    index("idx_join_request_status").on(table.status),
  ]
);

// Featured Profiles table (for home page display)
export const featuredProfiles = pgTable("featured_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 80 }).notNull(),
  title: varchar("title", { length: 80 }),
  bio: text("bio"),
  imageUrl: varchar("image_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Home Stats table (single-row config for landing page stats)
export const homeStats = pgTable("home_stats", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  stat1Value: varchar("stat1_value", { length: 20 }).notNull().default("50+"),
  stat1Label: varchar("stat1_label", { length: 60 }).notNull().default("Quality Courses"),
  stat1Icon: varchar("stat1_icon", { length: 50 }).notNull().default("BookOpen"),
  stat2Value: varchar("stat2_value", { length: 20 }).notNull().default("1000+"),
  stat2Label: varchar("stat2_label", { length: 60 }).notNull().default("Active Students"),
  stat2Icon: varchar("stat2_icon", { length: 50 }).notNull().default("Users"),
  stat3Value: varchar("stat3_value", { length: 20 }).notNull().default("30+"),
  stat3Label: varchar("stat3_label", { length: 60 }).notNull().default("Expert Teachers"),
  stat3Icon: varchar("stat3_icon", { length: 50 }).notNull().default("GraduationCap"),
  stat4Value: varchar("stat4_value", { length: 20 }).notNull().default("3"),
  stat4Label: varchar("stat4_label", { length: 60 }).notNull().default("Colleges"),
  stat4Icon: varchar("stat4_icon", { length: 50 }).notNull().default("Award"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id),
});

// Admin Dashboard Stats Config table (single-row config for admin dashboard stats)
export const adminDashboardStatsConfig = pgTable("admin_dashboard_stats_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  mode: varchar("mode", { length: 20 }).notNull().default("AUTO"),
  pendingApprovalsValue: varchar("pending_approvals_value", { length: 50 }).notNull().default("0"),
  totalTeachersValue: varchar("total_teachers_value", { length: 50 }).notNull().default("0"),
  publishedCoursesValue: varchar("published_courses_value", { length: 50 }).notNull().default("0"),
  totalStudentsValue: varchar("total_students_value", { length: 50 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id),
});

// Relations
export const collegesRelations = relations(colleges, ({ many }) => ({
  users: many(users),
  courses: many(courses),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  college: one(colleges, {
    fields: [users.collegeId],
    references: [colleges.id],
  }),
  teacherCourses: many(courses),
  enrollments: many(enrollments),
  approvalLogs: many(courseApprovalLogs),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  college: one(colleges, {
    fields: [courses.collegeId],
    references: [colleges.id],
  }),
  teacher: one(users, {
    fields: [courses.teacherId],
    references: [users.id],
  }),
  lessons: many(lessons),
  enrollments: many(enrollments),
  approvalLogs: many(courseApprovalLogs),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [enrollments.createdByUserId],
    references: [users.id],
  }),
}));

export const courseApprovalLogsRelations = relations(courseApprovalLogs, ({ one }) => ({
  course: one(courses, {
    fields: [courseApprovalLogs.courseId],
    references: [courses.id],
  }),
  actor: one(users, {
    fields: [courseApprovalLogs.actorUserId],
    references: [users.id],
  }),
}));

export const joinRequestsRelations = relations(joinRequests, ({ one }) => ({
  course: one(courses, {
    fields: [joinRequests.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [joinRequests.studentId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCollegeSchema = createInsertSchema(colleges).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  collegeId: z.number().int().positive("Please select a college"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  createdAt: true,
});

export const insertCourseApprovalLogSchema = createInsertSchema(courseApprovalLogs).omit({
  id: true,
  createdAt: true,
});

export const insertJoinRequestSchema = createInsertSchema(joinRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertFeaturedProfileSchema = createInsertSchema(featuredProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHomeStatsSchema = createInsertSchema(homeStats).omit({
  id: true,
  updatedAt: true,
});

export const updateHomeStatsSchema = createInsertSchema(homeStats).omit({
  id: true,
  updatedAt: true,
  updatedByUserId: true,
});

export const updateAdminDashboardStatsConfigSchema = createInsertSchema(adminDashboardStatsConfig).omit({
  id: true,
  updatedAt: true,
  updatedByUserId: true,
}).extend({
  mode: z.enum(["AUTO", "MANUAL"]).optional(),
  pendingApprovalsValue: z.string().max(50).regex(/^\d+$/, "Must be a non-negative integer").optional(),
  totalTeachersValue: z.string().max(50).regex(/^\d+$/, "Must be a non-negative integer").optional(),
  publishedCoursesValue: z.string().max(50).regex(/^\d+$/, "Must be a non-negative integer").optional(),
  totalStudentsValue: z.string().max(50).regex(/^\d+$/, "Must be a non-negative integer").optional(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCollege = z.infer<typeof insertCollegeSchema>;
export type College = typeof colleges.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertCourseApprovalLog = z.infer<typeof insertCourseApprovalLogSchema>;
export type CourseApprovalLog = typeof courseApprovalLogs.$inferSelect;
export type InsertFeaturedProfile = z.infer<typeof insertFeaturedProfileSchema>;
export type FeaturedProfile = typeof featuredProfiles.$inferSelect;
export type InsertHomeStats = z.infer<typeof insertHomeStatsSchema>;
export type UpdateHomeStats = z.infer<typeof updateHomeStatsSchema>;
export type HomeStats = typeof homeStats.$inferSelect;
export type UpdateAdminDashboardStatsConfig = z.infer<typeof updateAdminDashboardStatsConfigSchema>;
export type AdminDashboardStatsConfig = typeof adminDashboardStatsConfig.$inferSelect;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;
export type JoinRequest = typeof joinRequests.$inferSelect;

// Extended types for frontend
export type JoinRequestWithRelations = JoinRequest & {
  course?: CourseWithRelations;
  student?: UserWithCollege;
};
export type CourseWithRelations = Course & {
  college?: College;
  teacher?: User;
  lessons?: Lesson[];
  enrollments?: Enrollment[];
  _count?: {
    enrollments: number;
    lessons: number;
  };
};

export type UserWithCollege = User & {
  college?: College;
};
