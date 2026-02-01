import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole, seedSuperAdmin } from "./auth";
import { 
  insertCourseSchema, 
  insertLessonSchema, 
  insertEnrollmentSchema, 
  insertCollegeSchema, 
  insertCourseApprovalLogSchema, 
  insertFeaturedProfileSchema, 
  updateHomeStatsSchema, 
  updateAdminDashboardStatsConfigSchema, 
  insertDiscountCouponSchema, 
  updateDiscountCouponSchema 
} from "@shared/schema";
import { z } from "zod";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import bcrypt from "bcryptjs";
import multer from "multer";
import PDFDocument from "pdfkit";

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

function getR2Client(): S3Client | null {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

// Backblaze B2 configuration (for video hosting via Cloudflare CDN)
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const B2_ENDPOINT_RAW = process.env.B2_ENDPOINT || "";
const B2_ENDPOINT = B2_ENDPOINT_RAW.startsWith("http") ? B2_ENDPOINT_RAW : `https://${B2_ENDPOINT_RAW}`;
const B2_REGION = process.env.B2_REGION || "eu-central-003";
const CDN_BASE_URL = process.env.CDN_BASE_URL;

function getB2Client(): S3Client | null {
  if (!B2_KEY_ID || !B2_APP_KEY || !B2_ENDPOINT_RAW) {
    console.log("[B2] Client not configured - missing credentials");
    return null;
  }
  return new S3Client({
    region: B2_REGION,
    endpoint: B2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APP_KEY,
    },
  });
}

function getVideoCdnUrl(objectKey: string): string {
  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL}/${objectKey}`;
  }
  return `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${objectKey}`;
}

function buildVideoObjectKey(courseId: number | string, fileName: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `videos/${courseId}/${ts}-${safeFileName}`;
}

async function verifyObjectExistsInB2(b2Client: S3Client, objectKey: string): Promise<boolean> {
  if (!B2_BUCKET_NAME) return false;
  try {
    const command = new HeadObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: objectKey,
    });
    await b2Client.send(command);
    return true;
  } catch (error: any) {
    return false;
  }
}

async function verifyCdnUrlAccessible(cdnUrl: string): Promise<boolean> {
  try {
    const response = await fetch(cdnUrl, { method: "HEAD" });
    return response.status === 200 || response.status === 206;
  } catch (error: any) {
    return false;
  }
}

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "zip", "png", "jpg", "jpeg"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  await seedSuperAdmin();

  // Migrate existing users without public IDs
  try {
    const migratedCount = await storage.migrateUsersWithoutPublicId();
    if (migratedCount > 0) {
      console.log(`Migrated ${migratedCount} users with public IDs`);
    }
  } catch (error) {
    console.error("Error migrating users with public IDs:", error);
  }

  // ==================== AUTH & USERS ====================

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUserWithCollege(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/user/college", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { collegeId } = req.body;
      if (!collegeId || typeof collegeId !== "number") {
        return res.status(400).json({ message: "Valid college ID is required" });
      }
      const college = await storage.getCollegeById(collegeId);
      if (!college) {
        return res.status(404).json({ message: "College not found" });
      }
      const user = await storage.updateUserCollege(userId, collegeId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user college:", error);
      res.status(500).json({ message: "Failed to update college" });
    }
  });

  // ==================== COLLEGES ====================

  app.get("/api/colleges", async (_req, res) => {
    try {
      const collegeList = await storage.getColleges();
      res.json(collegeList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch colleges" });
    }
  });

  app.get("/api/colleges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const college = await storage.getCollegeById(id);
      if (!college) return res.status(404).json({ message: "College not found" });
      res.json(college);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch college" });
    }
  });

  app.post("/api/colleges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "super_admin") {
        return res.status(403).json({ message: "Only super admins can create colleges" });
      }
      const data = insertCollegeSchema.parse(req.body);
      const college = await storage.createCollege(data);
      res.status(201).json(college);
    } catch (error) {
      res.status(500).json({ message: "Failed to create college" });
    }
  });

  app.patch("/api/colleges/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "super_admin") {
        return res.status(403).json({ message: "Only super admins can update colleges" });
      }
      const id = parseInt(req.params.id);
      const data = insertCollegeSchema.partial().parse(req.body);
      const college = await storage.updateCollege(id, data);
      if (!college) return res.status(404).json({ message: "College not found" });
      res.json(college);
    } catch (error) {
      res.status(500).json({ message: "Failed to update college" });
    }
  });

  app.delete("/api/colleges/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "super_admin") {
        return res.status(403).json({ message: "Only super admins can delete colleges" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteCollege(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete college" });
    }
  });

  // ==================== COURSES (Unified & Protected) ====================

  app.get("/api/courses", async (req, res) => {
    try {
      const collegeId = req.query.collegeId ? parseInt(req.query.collegeId as string) : undefined;
      const status = req.query.status as any;
      let courseList = await storage.getCourses(collegeId, status);
      if (!req.query.status) {
        courseList = courseList.filter(c => c.status === "PUBLISHED");
      }
      res.json(courseList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/featured", async (_req, res) => {
    try {
      const courseList = await storage.getCourses(undefined, "PUBLISHED");
      res.json(courseList.slice(0, 6));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // 🔥 [NEW] Unified Create Course Endpoint
  // Handles both Admin (Instant Publish) and Instructor (Pending Approval)
  app.post("/api/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const { title, description, price, collegeId, teacherId } = req.body;

      if (!user) return res.status(401).json({ message: "Unauthorized" });

      // 1. Block Students and Accountants
      if (user.role === "student" || user.role === "accountant") {
        return res.status(403).json({ message: "Not authorized to create courses" });
      }

      // 2. Determine Status and Owner based on Role
      let status = "PENDING_APPROVAL"; // Default for instructors
      let assignedTeacherId = userId; // Default owner is self
      let assignedCollegeId = user.collegeId;

      // Admin/Super Admin Logic
      if (user.role === "admin" || user.role === "super_admin") {
        status = "PUBLISHED"; // Admins publish instantly
        if (teacherId) assignedTeacherId = teacherId; // Can assign to other instructors
        if (collegeId) assignedCollegeId = collegeId; // Can override college
      }

      // Instructor Logic (Must have a college)
      if (user.role === "instructor" && !assignedCollegeId) {
        return res.status(400).json({ message: "Instructor must belong to a college to create courses" });
      }

      const data = insertCourseSchema.parse({
        title,
        description,
        price: (user.role === "admin" || user.role === "super_admin") ? price : 0, // Instructors cannot set price
        collegeId: assignedCollegeId,
        teacherId: assignedTeacherId,
        status,
      });

      const course = await storage.createCourse(data);
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // 🔥 [NEW] Protected Update Course Endpoint
  app.patch("/api/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);

      if (!course) return res.status(404).json({ message: "Course not found" });

      const isAdmin = user?.role === "admin" || user?.role === "super_admin";
      const isOwner = course.teacherId === userId;

      // Strict Authorization check
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized to update this course" });
      }

      let data = insertCourseSchema.partial().parse(req.body);

      // ⛔ Security: Instructors cannot change Price or Status directly
      if (!isAdmin) {
        delete (data as any).price;
        delete (data as any).status; 
      }

      const updated = await storage.updateCourse(id, data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  app.delete("/api/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);

      if (!course) return res.status(404).json({ message: "Course not found" });

      const isAdmin = user?.role === "admin" || user?.role === "super_admin";

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can delete courses" });
      }

      await storage.deleteCourse(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Approval Endpoints (Admin Only)
  app.post("/api/courses/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Only admins can approve courses" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateCourse(id, { status: "PUBLISHED" });
      await storage.createCourseApprovalLog({
        courseId: id,
        action: "APPROVE",
        actorUserId: userId,
        reason: req.body.reason,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve course" });
    }
  });

  app.post("/api/courses/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Only admins can reject courses" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateCourse(id, { status: "REJECTED" });
      await storage.createCourseApprovalLog({
        courseId: id,
        action: "REJECT",
        actorUserId: userId,
        reason: req.body.reason,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject course" });
    }
  });

  // ==================== LESSONS ====================

  app.get("/api/courses/:id/lessons", async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const lessonList = await storage.getLessonsByCourse(courseId);
      res.json(lessonList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.post("/api/courses/:id/lessons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourseById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      if (course.teacherId !== userId) return res.status(403).json({ message: "Only the course owner can add lessons" });
      const data = insertLessonSchema.parse({ ...req.body, courseId });
      const lesson = await storage.createLesson(data);
      res.status(201).json(lesson);
    } catch (error) {
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  // 🔥 [NEW] Secure Lesson Access Endpoint (The Accountant Block)
  app.get("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) return res.status(401).json({ message: "Unauthorized" });

      // 1. ⛔ BLOCK ACCOUNTANTS
      if (user.role === "accountant") {
        return res.status(403).json({ message: "Accountants cannot view course content" });
      }

      const lesson = await storage.getLessonById(id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });

      // 2. ✅ SUPER ADMIN (God Mode)
      if (user.role === "super_admin") {
        return res.json(lesson);
      }

      const course = await storage.getCourseById(lesson.courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });

      // 3. Check specific role access
      let hasAccess = false;
      let isCourseLocked = false;

      if (user.role === "admin") {
        hasAccess = user.collegeId === course.collegeId;
      } else if (user.role === "instructor") {
        hasAccess = course.teacherId === userId;
      } else if (user.role === "student") {
        const enrolled = await storage.isEnrolled(userId, lesson.courseId);
        if (enrolled && course.isLocked) {
           isCourseLocked = true;
           hasAccess = false;
        } else {
           hasAccess = enrolled;
        }
      }

      if (isCourseLocked) {
        const { content, ...rest } = lesson;
        return res.json({ ...rest, content: null, locked: true, courseLocked: true });
      }

      if (!hasAccess) {
        const { content, ...rest } = lesson;
        return res.json({ ...rest, content: null, locked: true });
      }

      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  app.patch("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const lesson = await storage.getLessonById(id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      const course = await storage.getCourseById(lesson.courseId);
      if (!course || course.teacherId !== userId) return res.status(403).json({ message: "Only the course owner can update lessons" });
      const data = insertLessonSchema.partial().parse(req.body);
      const updated = await storage.updateLesson(id, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const lesson = await storage.getLessonById(id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      const course = await storage.getCourseById(lesson.courseId);
      if (!course || course.teacherId !== userId) return res.status(403).json({ message: "Only the course owner can delete lessons" });
      await storage.deleteLesson(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // ==================== ENROLLMENTS ====================

  app.get("/api/courses/:id/enrollments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourseById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "admin" || user?.role === "super_admin";
      if (!isOwner && !isAdmin) return res.status(403).json({ message: "Not authorized to view enrollments" });
      const enrollmentList = await storage.getEnrollmentsByCourse(courseId);
      res.json(enrollmentList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.post("/api/courses/:id/enrollments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourseById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "admin" || user?.role === "super_admin";
      if (!isOwner && !isAdmin) return res.status(403).json({ message: "Only teachers and admins can enroll students" });
      const { studentId } = req.body;
      const studentUser = await storage.getUser(studentId);
      if (!studentUser) return res.status(404).json({ message: "Student not found" });
      if (studentUser.role !== "student") return res.status(400).json({ message: "This user is not a student account" });
      const alreadyEnrolled = await storage.isEnrolled(studentId, courseId);
      if (alreadyEnrolled) return res.status(400).json({ message: "Student is already enrolled" });
      const enrollment = await storage.createEnrollment({
        courseId,
        studentId,
        createdByUserId: userId,
      });
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });

  app.delete("/api/courses/:courseId/enrollments/:studentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.courseId);
      const studentId = req.params.studentId;
      const course = await storage.getCourseById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "admin" || user?.role === "super_admin";
      if (!isOwner && !isAdmin) return res.status(403).json({ message: "Unauthorized" });
      const studentUser = await storage.getUser(studentId);
      if (!studentUser) return res.status(404).json({ message: "Student not found" });
      const isEnrolled = await storage.isEnrolled(studentId, courseId);
      if (!isEnrolled) return res.status(404).json({ message: "Student not enrolled" });
      await storage.deleteEnrollmentByStudentAndCourse(studentId, courseId);
      res.status(200).json({ message: "Student removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove student" });
    }
  });

  app.get("/api/my/enrollments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enrollmentList = await storage.getEnrollmentsByStudent(userId);
      res.json(enrollmentList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // ==================== TEACHER ENDPOINTS ====================

  app.get("/api/teacher/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseList = await storage.getCoursesByTeacher(userId);
      res.json(courseList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/teacher/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getTeacherStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.patch("/api/teacher/courses/:courseId/lock", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.courseId);
      const { isLocked } = req.body;
      const course = await storage.getCourseById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      if (course.status !== "PUBLISHED") return res.status(400).json({ message: "Only published courses can be locked" });
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "admin" || user?.role === "super_admin";
      if (!isOwner && !isAdmin) return res.status(403).json({ message: "You can only lock/unlock your own courses" });
      const updated = await storage.updateCourseLockStatus(courseId, isLocked);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update course lock status" });
    }
  });

  // ==================== ADMIN ENDPOINTS ====================

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Only admins can view stats" });
      }
      const collegeId = user.role === "admin" ? user.collegeId || undefined : undefined;
      const stats = await storage.getAdminStats(collegeId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Only admins can view pending courses" });
      }
      const collegeId = user.role === "admin" ? user.collegeId || undefined : undefined;
      const pending = await storage.getPendingCourses(collegeId);
      res.json(pending);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending courses" });
    }
  });

  app.get("/api/admin/teachers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Only admins can view teachers" });
      }
      const collegeId = user.role === "admin" ? user.collegeId || undefined : undefined;
      const teachers = await storage.getTeachersWithStats(collegeId);
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  app.get("/api/admin/instructors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Only admins can view potential instructors" });
      }
      const allUsers = await storage.getAllUsers();
      let instructors = allUsers;
      if (user.role === "admin" && user.collegeId) {
        instructors = allUsers.filter(u => u.collegeId === user.collegeId);
      }
      res.json(instructors.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        collegeId: u.collegeId,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructors" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "super_admin") {
        return res.status(403).json({ message: "Only super admins can view all users" });
      }
      const userList = await storage.getAllUsers();
      res.json(userList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "super_admin") {
        return res.status(403).json({ message: "Only super admins can change user roles" });
      }
      const targetId = req.params.id;
      const { role, collegeId } = req.body;
      const updated = await storage.updateUserRole(targetId, role, collegeId);
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get("/api/students", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "instructor" && user.role !== "admin" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const allUsers = await storage.getAllUsers();
      const students = allUsers.filter(u => u.role === "student");
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/users/search", isAuthenticated, async (req: any, res) => {
    try {
      const query = req.query.query as string;
      const user = req.user;
      if (!query || query.trim().length === 0) return res.json([]);
      if (!["instructor", "admin", "super_admin"].includes(user.role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const results = await storage.searchUsers(query.trim(), user.role, 5);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // ==================== ACCOUNTANT ====================
  // 🔥 [NEW] Accountant Specific Stats Endpoint (View Only)
  app.get("/api/accountant/enrollments", requireRole("accountant", "super_admin"), async (req: any, res) => {
    try {
      const allColleges = await storage.getColleges();
      const allCourses = await storage.getCourses();
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      let totalEnrollments = 0;
      let totalCourses = 0;
      let totalStudents = new Set<string>();

      const allEnrollments = await storage.getEnrollments();
      allEnrollments.forEach(e => totalStudents.add(e.studentId));

      const colleges = allColleges.map(college => {
        const collegeCourses = allCourses.filter(c => c.collegeId === college.id && c.status === "PUBLISHED");
        const courses = collegeCourses.map(course => {
          const enrollmentCount = course._count?.enrollments || 0;
          totalEnrollments += enrollmentCount;
          totalCourses++;
          const teacher = userMap.get(course.teacherId);
          const instructorName = teacher 
            ? `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() || teacher.email || "Unknown"
            : "Unknown";
          return {
            id: course.id,
            title: course.title,
            enrollments: enrollmentCount,
            instructorName,
            price: (course as any).price || 0,
          };
        });
        return { id: college.id, name: college.name, courses };
      }).filter(college => college.courses.length > 0);

      res.json({
        totals: {
          totalEnrollments,
          totalCourses,
          totalColleges: colleges.length,
          totalStudents: totalStudents.size,
        },
        colleges,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollment data" });
    }
  });

  // ==================== COUPONS ====================

  app.get("/api/coupons", requireRole("accountant", "super_admin"), async (req: any, res) => {
    try {
      const coupons = await storage.getDiscountCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  app.get("/api/coupons/:id", requireRole("accountant", "super_admin"), async (req: any, res) => {
    try {
      const coupon = await storage.getDiscountCouponById(parseInt(req.params.id));
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupon" });
    }
  });

  app.post("/api/coupons", requireRole("accountant", "super_admin"), async (req: any, res) => {
    try {
      const data = insertDiscountCouponSchema.parse(req.body);
      const existing = await storage.getDiscountCouponByCode(data.code);
      if (existing) return res.status(400).json({ message: "Coupon code already exists" });
      const coupon = await storage.createDiscountCoupon({
        ...data,
        createdByUserId: req.user.id,
      });
      res.status(201).json(coupon);
    } catch (error) {
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  app.patch("/api/coupons/:id", requireRole("accountant", "super_admin"), async (req: any, res) => {
    try {
      const couponId = parseInt(req.params.id);
      const existing = await storage.getDiscountCouponById(couponId);
      if (!existing) return res.status(404).json({ message: "Coupon not found" });
      const data = updateDiscountCouponSchema.parse(req.body);
      if (data.code && data.code.toUpperCase() !== existing.code) {
        const codeConflict = await storage.getDiscountCouponByCode(data.code);
        if (codeConflict) return res.status(400).json({ message: "Coupon code already exists" });
      }
      const updated = await storage.updateDiscountCoupon(couponId, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  app.delete("/api/coupons/:id", requireRole("accountant", "super_admin"), async (req: any, res) => {
    try {
      const couponId = parseInt(req.params.id);
      const existing = await storage.getDiscountCouponById(couponId);
      if (!existing) return res.status(404).json({ message: "Coupon not found" });
      await storage.deleteDiscountCoupon(couponId);
      res.json({ message: "Coupon deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}