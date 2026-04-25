import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole, seedSuperAdmin } from "./auth";
import { insertCourseSchema, insertLessonSchema, insertEnrollmentSchema, insertCollegeSchema, insertUniversitySchema, insertMajorSchema, insertCourseApprovalLogSchema, insertFeaturedProfileSchema, updateHomeStatsSchema, updateAdminDashboardStatsConfigSchema, quizQuestions } from "@shared/schema";
import { z } from "zod";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import bcrypt from "bcryptjs";
import multer from "multer";
import PDFDocument from "pdfkit";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { sendEmail } from "./email";
import { db } from "./db";
import { eq, and, count, sql } from "drizzle-orm";
import { users, courses, colleges } from "@shared/schema";

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
  console.log("[B2] Creating S3Client with endpoint:", B2_ENDPOINT, "region:", B2_REGION);
  return new S3Client({
    region: B2_REGION,
    endpoint: B2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APP_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED", // <-- هذا هو سطر الحل السحري
  });
}

function getVideoCdnUrl(objectKey: string): string {
  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL}/${objectKey}`;
  }
  return `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${objectKey}`;
}

// SINGLE SOURCE OF TRUTH: Build video object key
// Format: videos/<courseId>/<timestamp>-<sanitizedFilename>
// No bucket name prefix - the bucket is already "CPE-academy"
function buildVideoObjectKey(courseId: number | string, fileName: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  // Sanitize filename: keep only alphanumeric, dots, underscores, hyphens
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `videos/${courseId}/${ts}-${safeFileName}`;
}

// Verify object exists in B2 bucket using HeadObject
async function verifyObjectExistsInB2(b2Client: S3Client, objectKey: string): Promise<boolean> {
  if (!B2_BUCKET_NAME) return false;
  
  try {
    const command = new HeadObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: objectKey,
    });
    await b2Client.send(command);
    console.log("[B2 Verify] Object exists:", objectKey);
    return true;
  } catch (error: any) {
    console.log("[B2 Verify] Object NOT found:", objectKey, error?.message || error);
    return false;
  }
}

// Verify CDN URL returns 200/206 (optional additional check)
async function verifyCdnUrlAccessible(cdnUrl: string): Promise<boolean> {
  try {
    const response = await fetch(cdnUrl, { method: "HEAD" });
    const ok = response.status === 200 || response.status === 206;
    console.log("[CDN Verify]", cdnUrl, "status:", response.status, "ok:", ok);
    return ok;
  } catch (error: any) {
    console.log("[CDN Verify] Error:", cdnUrl, error?.message || error);
    return false;
  }
}

// Allowed file types for upload
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

  app.patch("/api/auth/user/path", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { universityId, collegeId, majorId } = req.body;
      
      if (!universityId || !collegeId || !majorId) {
        return res.status(400).json({ message: "University, college, and major are required" });
      }

      const university = await storage.getUniversityById(universityId);
      if (!university) {
        return res.status(400).json({ message: "Invalid university" });
      }

      const college = await storage.getCollegeById(collegeId);
      if (!college || college.universityId !== universityId) {
        return res.status(400).json({ message: "Invalid college for selected university" });
      }

      const major = await storage.getMajorById(majorId);
      if (!major || major.collegeId !== collegeId) {
        return res.status(400).json({ message: "Invalid major for selected college" });
      }
      
      const user = await storage.updateUserPath(userId, universityId, collegeId, majorId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userWithCollege = await storage.getUserWithCollege(userId);
      res.json(userWithCollege);
    } catch (error) {
      console.error("Error updating user path:", error);
      res.status(500).json({ message: "Failed to update academic path" });
    }
  });

  app.get("/api/universities", async (_req, res) => {
    try {
      const universityList = await storage.getUniversities();
      res.json(universityList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch universities" });
    }
  });

  app.get("/api/universities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const university = await storage.getUniversityById(id);
      if (!university) {
        return res.status(404).json({ message: "University not found" });
      }
      res.json(university);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch university" });
    }
  });

  app.get("/api/universities/:id/colleges", async (req, res) => {
    try {
      const universityId = parseInt(req.params.id);
      const collegeList = await storage.getCollegesByUniversity(universityId);
      res.json(collegeList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch colleges" });
    }
  });

  app.get("/api/majors", async (req, res) => {
    try {
      const collegeId = req.query.collegeId ? parseInt(req.query.collegeId as string) : undefined;
      const universityId = req.query.universityId ? parseInt(req.query.universityId as string) : undefined;
      const majorList = await storage.getMajors(collegeId, universityId);
      res.json(majorList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch majors" });
    }
  });

  app.get("/api/majors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const major = await storage.getMajorById(id);
      if (!major) {
        return res.status(404).json({ message: "Major not found" });
      }
      res.json(major);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch major" });
    }
  });

  app.post("/api/universities", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can create universities" });
      }
      const data = insertUniversitySchema.parse(req.body);
      const university = await storage.createUniversity(data);
      res.status(201).json(university);
    } catch (error) {
      console.error("Error creating university:", error);
      res.status(500).json({ message: "Failed to create university" });
    }
  });

  app.patch("/api/universities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can update universities" });
      }
      const id = parseInt(req.params.id);
      const data = insertUniversitySchema.partial().parse(req.body);
      const university = await storage.updateUniversity(id, data);
      if (!university) {
        return res.status(404).json({ message: "University not found" });
      }
      res.json(university);
    } catch (error) {
      console.error("Error updating university:", error);
      res.status(500).json({ message: "Failed to update university" });
    }
  });

  app.delete("/api/universities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can delete universities" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteUniversity(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting university:", error);
      res.status(500).json({ message: "Failed to delete university" });
    }
  });

  app.post("/api/majors", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can create majors" });
      }
      const data = insertMajorSchema.parse(req.body);
      const college = await storage.getCollegeById(data.collegeId);
      if (!college) {
        return res.status(400).json({ message: "Invalid college" });
      }
      const major = await storage.createMajor(data);
      res.status(201).json(major);
    } catch (error) {
      console.error("Error creating major:", error);
      res.status(500).json({ message: "Failed to create major" });
    }
  });

  app.patch("/api/majors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can update majors" });
      }
      const id = parseInt(req.params.id);
      const data = insertMajorSchema.partial().parse(req.body);
      const major = await storage.updateMajor(id, data);
      if (!major) {
        return res.status(404).json({ message: "Major not found" });
      }
      res.json(major);
    } catch (error) {
      console.error("Error updating major:", error);
      res.status(500).json({ message: "Failed to update major" });
    }
  });

  app.delete("/api/majors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can delete majors" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMajor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting major:", error);
      res.status(500).json({ message: "Failed to delete major" });
    }
  });

  app.get("/api/colleges", async (_req, res) => {
    try {
      const collegeList = await storage.getColleges();
      res.json(collegeList);
    } catch (error) {
      console.error("Error fetching colleges:", error);
      res.status(500).json({ message: "Failed to fetch colleges" });
    }
  });

  app.get("/api/colleges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const college = await storage.getCollegeById(id);
      if (!college) {
        return res.status(404).json({ message: "College not found" });
      }
      res.json(college);
    } catch (error) {
      console.error("Error fetching college:", error);
      res.status(500).json({ message: "Failed to fetch college" });
    }
  });

  app.post("/api/colleges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can create colleges" });
      }
      const data = insertCollegeSchema.parse(req.body);
      const college = await storage.createCollege(data);
      res.status(201).json(college);
    } catch (error) {
      console.error("Error creating college:", error);
      res.status(500).json({ message: "Failed to create college" });
    }
  });

  app.patch("/api/colleges/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can update colleges" });
      }
      const id = parseInt(req.params.id);
      const data = insertCollegeSchema.partial().parse(req.body);
      const college = await storage.updateCollege(id, data);
      if (!college) {
        return res.status(404).json({ message: "College not found" });
      }
      res.json(college);
    } catch (error) {
      console.error("Error updating college:", error);
      res.status(500).json({ message: "Failed to update college" });
    }
  });

  app.delete("/api/colleges/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can delete colleges" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteCollege(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting college:", error);
      res.status(500).json({ message: "Failed to delete college" });
    }
  });

  app.get("/api/courses", async (req: any, res) => {
    try {
      const collegeId = req.query.collegeId ? parseInt(req.query.collegeId as string) : undefined;
      const majorId = req.query.majorId ? parseInt(req.query.majorId as string) : undefined;
      const universityId = req.query.universityId ? parseInt(req.query.universityId as string) : undefined;
      const requestedStatus = req.query.status as any;
      
      const user = req.user;
      const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
      
      let courseList = await storage.getCourses(collegeId, undefined, majorId, universityId);
      
      if (isAdmin && requestedStatus) {
        courseList = courseList.filter(c => c.status === requestedStatus);
      } else if (!isAdmin) {
        courseList = courseList.filter(c => c.status === "PUBLISHED");
      }
      
      res.json(courseList);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/featured", async (_req, res) => {
    try {
      const courseList = await storage.getCourses(undefined, "PUBLISHED");
      res.json(courseList.slice(0, 6));
    } catch (error) {
      console.error("Error fetching featured courses:", error);
      res.status(500).json({ message: "Failed to fetch featured courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post("/api/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can create courses" });
      }
      const data = insertCourseSchema.parse({ ...req.body, teacherId: req.body.teacherId || userId });
      const course = await storage.createCourse(data);
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.patch("/api/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      const isOwner = course.teacherId === userId;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized to update this course" });
      }
      
      const data = insertCourseSchema.partial().parse(req.body);
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
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can delete courses" });
      }
      
      await storage.deleteCourse(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  app.post("/api/courses/:id/submit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.teacherId !== userId) {
        return res.status(403).json({ message: "Only the course owner can submit for approval" });
      }
      
      if (course.status !== "DRAFT" && course.status !== "REJECTED") {
        return res.status(400).json({ message: "Course is not in a submittable state" });
      }
      
      const updated = await storage.updateCourse(id, { status: "PENDING_APPROVAL" });
      res.json(updated);
    } catch (error) {
      console.error("Error submitting course:", error);
      res.status(500).json({ message: "Failed to submit course" });
    }
  });

  app.post("/api/courses/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can approve courses" });
      }
      
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.status !== "PENDING_APPROVAL") {
        return res.status(400).json({ message: "Course is not pending approval" });
      }
      
      const updated = await storage.updateCourse(id, { status: "PUBLISHED" });
      await storage.createCourseApprovalLog({
        courseId: id,
        action: "APPROVE",
        actorUserId: userId,
        reason: req.body.reason,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error approving course:", error);
      res.status(500).json({ message: "Failed to approve course" });
    }
  });

  app.post("/api/courses/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can reject courses" });
      }
      
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.status !== "PENDING_APPROVAL") {
        return res.status(400).json({ message: "Course is not pending approval" });
      }
      
      const updated = await storage.updateCourse(id, { status: "REJECTED" });
      await storage.createCourseApprovalLog({
        courseId: id,
        action: "REJECT",
        actorUserId: userId,
        reason: req.body.reason,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting course:", error);
      res.status(500).json({ message: "Failed to reject course" });
    }
  });

  app.get("/api/courses/:id/lessons", async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const lessonList = await storage.getLessonsByCourse(courseId);
      res.json(lessonList);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.post("/api/courses/:id/lessons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourseById(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.teacherId !== userId) {
        return res.status(403).json({ message: "Only the course owner can add lessons" });
      }
      
      const data = insertLessonSchema.parse({ ...req.body, courseId });
      const lesson = await storage.createLesson(data);
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.get("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      
      const lesson = await storage.getLessonById(id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Get course to check access
      const course = await storage.getCourseById(lesson.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if user has access to content
      const user = await storage.getUser(userId);
      let hasAccess = false;
      let isCourseLocked = false;
      
      console.log("[Lesson Access Debug]", {
        lessonId: id,
        userId,
        userRole: user?.role,
        courseTeacherId: course.teacherId,
        courseIsLocked: course.isLocked,
        lessonContent: lesson.content?.substring(0, 100),
        lessonContentType: lesson.contentType,
      });
      
      if (user) {
        if (user.role === "SUPER_ADMIN") {
          // Super admins have access to all content
          hasAccess = true;
        } else if (user.role === "ADMIN") {
          // Admins have access to content in their college
          hasAccess = user.collegeId === course.collegeId;
        } else if (user.role === "TEACHER") {
          // Teachers have access to their own courses
          hasAccess = course.teacherId === userId;
        } else {
          // Students need to be enrolled AND course not locked
          const enrolled = await storage.isEnrolled(userId, lesson.courseId);
          console.log("[Lesson Access Debug] Student enrollment check:", { userId, courseId: lesson.courseId, enrolled });
          if (enrolled && course.isLocked) {
            // Enrolled but course is locked by teacher
            isCourseLocked = true;
            hasAccess = false;
          } else {
            hasAccess = enrolled;
          }
        }
      }
      
      console.log("[Lesson Access Debug] Final access decision:", { hasAccess, isCourseLocked });
      
      // If course is locked for this enrolled student
      if (isCourseLocked) {
        const { content, ...lessonWithoutContent } = lesson;
        return res.json({ ...lessonWithoutContent, content: null, locked: true, courseLocked: true });
      }
      
      // If no access, return lesson without content (for metadata/navigation)
      if (!hasAccess) {
        const { content, ...lessonWithoutContent } = lesson;
        return res.json({ ...lessonWithoutContent, content: null, locked: true });
      }
      
      console.log("[Lesson Access Debug] Returning full lesson with content:", { lessonId: id, contentLength: lesson.content?.length });
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
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      const course = await storage.getCourseById(lesson.courseId);
      if (!course || course.teacherId !== userId) {
        return res.status(403).json({ message: "Only the course owner can update lessons" });
      }
      
      const data = insertLessonSchema.partial().parse(req.body);
      const updated = await storage.updateLesson(id, data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating lesson:", error);
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const lesson = await storage.getLessonById(id);
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      const course = await storage.getCourseById(lesson.courseId);
      if (!course || course.teacherId !== userId) {
        return res.status(403).json({ message: "Only the course owner can delete lessons" });
      }
      
      await storage.deleteLesson(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  app.get("/api/courses/:id/enrollments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourseById(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to view enrollments" });
      }
      
      const enrollmentList = await storage.getEnrollmentsByCourse(courseId);
      res.json(enrollmentList);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.post("/api/courses/:id/enrollments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourseById(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (user?.role === "TEACHER") {
        return res.status(403).json({ message: "Teachers cannot enroll students. Please contact an Admin." });
      }
      
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can enroll students" });
      }
      
      const { studentId } = req.body;
      
      // Validate studentId exists and is a student
      const studentUser = await storage.getUser(studentId);
      if (!studentUser) {
        return res.status(404).json({ message: "Student not found" });
      }
      if (studentUser.role !== "STUDENT") {
        return res.status(400).json({ message: "This user is not a student account" });
      }
      
      const alreadyEnrolled = await storage.isEnrolled(studentId, courseId);
      if (alreadyEnrolled) {
        return res.status(400).json({ message: "Student is already enrolled" });
      }
      
      const enrollment = await storage.createEnrollment({
        courseId,
        studentId,
        createdByUserId: userId,
      });
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });

  // Teacher can remove students from their own courses
  app.delete("/api/courses/:courseId/enrollments/:studentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.courseId);
      const studentId = req.params.studentId;
      
      // Check course exists
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (user?.role === "TEACHER") {
        return res.status(403).json({ message: "Teachers cannot remove students. Please contact an Admin." });
      }
      
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can remove students" });
      }
      
      // Check student exists and is a student
      const studentUser = await storage.getUser(studentId);
      if (!studentUser) {
        return res.status(404).json({ message: "Student not found" });
      }
      if (studentUser.role !== "STUDENT") {
        return res.status(400).json({ message: "User is not a student" });
      }
      
      // Check enrollment exists
      const isEnrolled = await storage.isEnrolled(studentId, courseId);
      if (!isEnrolled) {
        return res.status(404).json({ message: "Student not enrolled" });
      }
      
      // Delete enrollment by student and course
      await storage.deleteEnrollmentByStudentAndCourse(studentId, courseId);
      res.status(200).json({ message: "Student removed successfully" });
    } catch (error) {
      console.error("Error removing student from course:", error);
      res.status(500).json({ message: "Failed to remove student" });
    }
  });

  app.delete("/api/enrollments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      
      const canDelete = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!canDelete) {
        return res.status(403).json({ message: "Only admins can remove enrollments" });
      }
      
      await storage.deleteEnrollment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting enrollment:", error);
      res.status(500).json({ message: "Failed to delete enrollment" });
    }
  });

  app.get("/api/enrollments/check/:courseId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseId = parseInt(req.params.courseId);
      const enrolled = await storage.isEnrolled(userId, courseId);
      res.json({ enrolled });
    } catch (error) {
      console.error("Error checking enrollment:", error);
      res.status(500).json({ message: "Failed to check enrollment" });
    }
  });

  app.get("/api/my/enrollments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enrollmentList = await storage.getEnrollmentsByStudent(userId);
      res.json(enrollmentList);
    } catch (error) {
      console.error("Error fetching my enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get("/api/enrollments/my-courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enrollmentList = await storage.getEnrollmentsByStudent(userId);
      const courseList = enrollmentList.map(e => e.course);
      res.json(courseList);
    } catch (error) {
      console.error("Error fetching my courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/teacher/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseList = await storage.getCoursesByTeacher(userId);
      res.json(courseList);
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/teacher/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getTeacherStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Teacher toggle course lock
  app.patch("/api/teacher/courses/:courseId/lock", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.courseId);
      const { isLocked } = req.body;
      
      if (typeof isLocked !== "boolean") {
        return res.status(400).json({ message: "isLocked must be a boolean" });
      }
      
      // Check course exists
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Only PUBLISHED courses can be locked
      if (course.status !== "PUBLISHED") {
        return res.status(400).json({ message: "Only published courses can be locked/unlocked" });
      }
      
      // Check authorization: teacher owns course or is admin
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "You can only lock/unlock your own courses" });
      }
      
      // Update course lock status
      const updated = await storage.updateCourseLockStatus(courseId, isLocked);
      res.json(updated);
    } catch (error) {
      console.error("Error toggling course lock:", error);
      res.status(500).json({ message: "Failed to update course lock status" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can view stats" });
      }
      
      const collegeId = user.role === "ADMIN" ? user.collegeId || undefined : undefined;
      const stats = await storage.getAdminStats(collegeId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can view pending courses" });
      }
      
      const collegeId = user.role === "ADMIN" ? user.collegeId || undefined : undefined;
      const pending = await storage.getPendingCourses(collegeId);
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending courses:", error);
      res.status(500).json({ message: "Failed to fetch pending courses" });
    }
  });

  app.get("/api/admin/teachers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can view teachers" });
      }
      
      const collegeId = user.role === "ADMIN" ? user.collegeId || undefined : undefined;
      const teachers = await storage.getTeachersWithStats(collegeId);
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  app.get("/api/admin/teachers/:id/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can view teacher courses" });
      }
      const teacherId = req.params.id;
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.role !== "TEACHER") {
        return res.status(404).json({ message: "Teacher not found" });
      }
      if (user.role === "ADMIN" && user.collegeId && teacher.collegeId !== user.collegeId) {
        return res.status(403).json({ message: "You can only view teachers in your college" });
      }
      const result = await storage.getTeacherCourses(teacherId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      res.status(500).json({ message: "Failed to fetch teacher courses" });
    }
  });

  app.get("/api/admin/teachers/:id/students", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can view teacher students" });
      }
      const teacherId = req.params.id;
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.role !== "TEACHER") {
        return res.status(404).json({ message: "Teacher not found" });
      }
      if (user.role === "ADMIN" && user.collegeId && teacher.collegeId !== user.collegeId) {
        return res.status(403).json({ message: "You can only view teachers in your college" });
      }
      const result = await storage.getTeacherStudents(teacherId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching teacher students:", error);
      res.status(500).json({ message: "Failed to fetch teacher students" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can view all users" });
      }
      
      const userList = await storage.getAllUsers();
      res.json(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can change user roles" });
      }
      
      const targetId = req.params.id;
      const { role, collegeId } = req.body;
      
      console.log("[ROLE UPDATE] Target:", targetId, "New role:", role, "CollegeId:", collegeId);
      
      const updated = await storage.updateUserRole(targetId, role, collegeId);
      if (!updated) {
        console.log("[ROLE UPDATE] User not found:", targetId);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("[ROLE UPDATE] Success - Updated role:", updated.role);
      res.json(updated);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get("/api/students", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const allUsers = await storage.getAllUsers();
      const students = allUsers.filter(u => u.role === "STUDENT");
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // User search endpoint for enrollment
  app.get("/api/users/search", isAuthenticated, async (req: any, res) => {
    try {
      const query = req.query.query as string;
      const user = req.user;
      
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }
      
      // Only teachers, admins, and super admins can search
      if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const results = await storage.searchUsers(query.trim(), user.role, 5);
      res.json(results);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Featured Profiles - Public endpoint (active only)
  app.get("/api/featured-profiles", async (_req, res) => {
    try {
      const profiles = await storage.getFeaturedProfiles(true);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching featured profiles:", error);
      res.status(500).json({ message: "Failed to fetch featured profiles" });
    }
  });

  // Featured Profiles - Admin endpoints (SUPER_ADMIN only)
  app.get("/api/admin/featured-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can manage featured profiles" });
      }
      
      const profiles = await storage.getFeaturedProfiles(false);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching featured profiles:", error);
      res.status(500).json({ message: "Failed to fetch featured profiles" });
    }
  });

  app.post("/api/admin/featured-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can create featured profiles" });
      }
      
      const data = insertFeaturedProfileSchema.parse({
        ...req.body,
        createdByUserId: userId,
        updatedByUserId: userId,
      });
      const profile = await storage.createFeaturedProfile(data);
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating featured profile:", error);
      res.status(500).json({ message: "Failed to create featured profile" });
    }
  });

  app.patch("/api/admin/featured-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can update featured profiles" });
      }
      
      const id = parseInt(req.params.id);
      const data = insertFeaturedProfileSchema.partial().parse({
        ...req.body,
        updatedByUserId: userId,
      });
      const profile = await storage.updateFeaturedProfile(id, data);
      
      if (!profile) {
        return res.status(404).json({ message: "Featured profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating featured profile:", error);
      res.status(500).json({ message: "Failed to update featured profile" });
    }
  });

  app.delete("/api/admin/featured-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can delete featured profiles" });
      }
      
      const id = parseInt(req.params.id);
      await storage.deleteFeaturedProfile(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting featured profile:", error);
      res.status(500).json({ message: "Failed to delete featured profile" });
    }
  });

  // Home Stats - Public endpoint (returns stats or defaults)
  app.get("/api/public-stats", async (_req, res) => {
    try {
      const [coursesResult] = await db.select({ value: count() }).from(courses).where(eq(courses.status, "PUBLISHED"));
      const [studentsResult] = await db.select({ value: count() }).from(users).where(eq(users.role, "STUDENT"));
      const [teachersResult] = await db.select({ value: count() }).from(users).where(eq(users.role, "TEACHER"));
      const [collegesResult] = await db.select({ value: count() }).from(colleges);

      res.json({
        totalCourses: coursesResult.value,
        totalStudents: studentsResult.value,
        totalTeachers: teachersResult.value,
        totalColleges: collegesResult.value,
      });
    } catch (error) {
      console.error("Error fetching public stats:", error);
      res.status(500).json({ message: "Failed to fetch public stats" });
    }
  });

  app.get("/api/home-stats", async (_req, res) => {
    try {
      const stats = await storage.getOrCreateHomeStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching home stats:", error);
      res.status(500).json({ message: "Failed to fetch home stats" });
    }
  });

  // Home Stats - Admin endpoint (SUPER_ADMIN only)
  app.patch("/api/admin/home-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can update home stats" });
      }
      
      const parseResult = updateHomeStatsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const stats = await storage.updateHomeStats(parseResult.data, userId);
      res.json(stats);
    } catch (error) {
      console.error("Error updating home stats:", error);
      res.status(500).json({ message: "Failed to update home stats" });
    }
  });

  // Admin Dashboard Stats - returns stats based on config mode (AUTO or MANUAL)
  app.get("/api/admin/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only admins can view dashboard stats" });
      }
      
      const config = await storage.getOrCreateAdminDashboardStatsConfig();
      const collegeId = user.role === "ADMIN" ? user.collegeId || undefined : undefined;
      const computedStats = await storage.getAdminStats(collegeId);
      
      if (config.mode === "MANUAL") {
        res.json({
          mode: "MANUAL",
          pendingApprovals: config.pendingApprovalsValue,
          totalTeachers: config.totalTeachersValue,
          publishedCourses: config.publishedCoursesValue,
          totalStudents: config.totalStudentsValue,
          config,
        });
      } else {
        res.json({
          mode: "AUTO",
          pendingApprovals: String(computedStats.pendingApprovals),
          totalTeachers: String(computedStats.totalTeachers),
          publishedCourses: String(computedStats.totalCourses),
          totalStudents: String(computedStats.totalStudents),
          config,
        });
      }
    } catch (error) {
      console.error("Error fetching admin dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Admin Dashboard Stats Config - SUPER_ADMIN only update
  app.patch("/api/super-admin/admin-dashboard-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only super admins can update dashboard stats config" });
      }
      
      const parseResult = updateAdminDashboardStatsConfigSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const config = await storage.updateAdminDashboardStatsConfig(parseResult.data, userId);
      res.json(config);
    } catch (error) {
      console.error("Error updating admin dashboard stats config:", error);
      res.status(500).json({ message: "Failed to update dashboard stats config" });
    }
  });

  // Cloudflare Stream - Direct Creator Upload
  // Creates a direct upload URL for teachers to upload videos directly to Cloudflare
  app.post("/api/stream/create-upload", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers and super admins can upload videos" });
      }
      
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const apiToken = process.env.CLOUDFLARE_STREAM_TOKEN;
      
      if (!accountId || !apiToken) {
        console.error("Missing Cloudflare Stream configuration: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_STREAM_TOKEN not set");
        return res.status(500).json({ message: "Video upload service is not configured" });
      }
      
      const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`;
      
      const cfResponse = await fetch(cloudflareUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600,
          creator: user.email || userId,
          meta: {
            uploadedBy: userId,
            uploadedByEmail: user.email,
            uploadedAt: new Date().toISOString(),
          },
        }),
      });
      
      if (!cfResponse.ok) {
        const errorData = await cfResponse.json().catch(() => ({}));
        console.error("Cloudflare Stream API error:", cfResponse.status, errorData);
        return res.status(502).json({ 
          message: "Failed to create upload URL from video service",
          details: errorData.errors?.[0]?.message || "Unknown error"
        });
      }
      
      const data = await cfResponse.json();
      
      if (!data.success || !data.result) {
        console.error("Cloudflare Stream API returned unexpected response:", data);
        return res.status(502).json({ message: "Video service returned an unexpected response" });
      }
      
      res.json({
        uploadURL: data.result.uploadURL,
        uid: data.result.uid,
      });
    } catch (error) {
      console.error("Error creating Cloudflare Stream upload:", error);
      res.status(500).json({ message: "Failed to create video upload" });
    }
  });

  // Backblaze B2 - Presigned URL for video upload (served via Cloudflare CDN)
  app.post("/api/b2/video/presign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers and super admins can upload videos" });
      }
      
      const { fileName, contentType, courseId, fileSize } = req.body;
      
      if (!fileName || !contentType || !courseId) {
        return res.status(400).json({ message: "fileName, contentType, and courseId are required" });
      }
      
      // Validate video content type
      const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
      if (!allowedVideoTypes.includes(contentType)) {
        return res.status(400).json({ message: "Only video files (mp4, webm, mov, avi) are allowed" });
      }
      
      // Validate file size (1GB max for videos)
      const maxVideoSize = 1024 * 1024 * 1024;
      if (fileSize && fileSize > maxVideoSize) {
        return res.status(400).json({ message: "Video size exceeds 1GB limit" });
      }
      
      // Verify teacher owns this course or is super admin
      if (user.role === "TEACHER") {
        const course = await storage.getCourseById(courseId);
        if (!course || course.teacherId !== userId) {
          return res.status(403).json({ message: "You can only upload videos to your own courses" });
        }
      }
      
      console.log("[B2 Presign] Env check:", {
        B2_KEY_ID: !!B2_KEY_ID,
        B2_APP_KEY: !!B2_APP_KEY,
        B2_BUCKET_NAME: !!B2_BUCKET_NAME,
        B2_ENDPOINT: !!B2_ENDPOINT_RAW,
        B2_REGION: B2_REGION,
        CDN_BASE_URL: !!CDN_BASE_URL,
      });

      const b2Client = getB2Client();
      if (!b2Client || !B2_BUCKET_NAME) {
        console.log("[B2 Presign] Storage not configured");
        return res.status(503).json({ message: "Video storage not configured", errorCode: "B2_NOT_CONFIGURED" });
      }
      
      // Use SINGLE SOURCE OF TRUTH for object key generation
      const timestamp = Date.now();
      const objectKey = buildVideoObjectKey(courseId, fileName, timestamp);
      const cdnUrl = getVideoCdnUrl(objectKey);
      
      console.log("[B2 Presign] Generating URL for:", {
        bucket: B2_BUCKET_NAME,
        objectKey,
        cdnUrl,
        endpoint: B2_ENDPOINT,
        region: B2_REGION,
        contentType,
      });

      // Generate presigned PUT URL (30 minute expiry for large videos)
      const command = new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size, // 👈 هاد السطر هو الضربة القاضية اللي رح تجبر B2 يقبله
      });
      
      const uploadUrl = await getSignedUrl(b2Client, command, { expiresIn: 1800 });
      
      console.log("[B2 Presign] Success - objectKey:", objectKey, "cdnUrl:", cdnUrl);
      
      // Return objectKey so client can verify after upload
      res.json({
        uploadUrl,
        cdnUrl,
        objectKey,
      });
    } catch (error: any) {
      console.error("[B2 Presign] Error:", error?.message || error);
      console.error("[B2 Presign] Stack:", error?.stack);
      res.status(500).json({ 
        message: "Failed to create video upload URL", 
        errorCode: "B2_PRESIGN_FAILED",
        details: error?.message || "Unknown error"
      });
    }
  });

  // Backblaze B2 - Backend proxy upload (fallback for CORS issues)
  const videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only video files are allowed"));
      }
    },
  });

  app.post("/api/b2/video/upload", isAuthenticated, videoUpload.single("video"), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers and super admins can upload videos" });
      }

      const courseId = req.body.courseId;
      if (!courseId) {
        return res.status(400).json({ message: "courseId is required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No video file provided" });
      }

      // Verify teacher owns this course or is super admin
      if (user.role === "TEACHER") {
        const course = await storage.getCourseById(parseInt(courseId));
        if (!course || course.teacherId !== userId) {
          return res.status(403).json({ message: "You can only upload videos to your own courses" });
        }
      }

      const b2Client = getB2Client();
      if (!b2Client || !B2_BUCKET_NAME) {
        return res.status(503).json({ message: "Video storage not configured" });
      }

      // Use SINGLE SOURCE OF TRUTH for object key generation
      const timestamp = Date.now();
      const objectKey = buildVideoObjectKey(courseId, req.file.originalname, timestamp);
      const cdnUrl = getVideoCdnUrl(objectKey);

      console.log("[B2 Proxy Upload] Starting upload", {
        objectKey,
        cdnUrl,
        size: req.file.size,
        contentType: req.file.mimetype,
      });

      const command = new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: objectKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await b2Client.send(command);
      console.log("[B2 Proxy Upload] PutObject completed, verifying...");

      // VERIFY object exists in B2 before returning success
      const objectExists = await verifyObjectExistsInB2(b2Client, objectKey);
      if (!objectExists) {
        console.error("[B2 Proxy Upload] VERIFICATION FAILED - object not found after upload:", objectKey);
        return res.status(500).json({ 
          message: "Upload verification failed - file not found in storage",
          errorCode: "B2_VERIFY_FAILED"
        });
      }

      // Also verify CDN URL is accessible (may take a moment for propagation)
      const cdnAccessible = await verifyCdnUrlAccessible(cdnUrl);
      if (!cdnAccessible) {
        console.warn("[B2 Proxy Upload] CDN not immediately accessible, but B2 verified:", cdnUrl);
        // Don't fail - B2 verified, CDN may need propagation time
      }

      console.log("[B2 Proxy Upload] Success - verified", { objectKey, cdnUrl, objectExists, cdnAccessible });

      res.json({ cdnUrl, objectKey, verified: true });
    } catch (error: any) {
      console.error("[B2 Proxy Upload] Error:", error?.message || error);
      res.status(500).json({ message: "Failed to upload video", details: error?.message });
    }
  });

  // Backblaze B2 - Verify upload completed successfully (for direct uploads)
  app.post("/api/b2/video/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers and super admins can verify uploads" });
      }

      const { objectKey, cdnUrl } = req.body;
      if (!objectKey) {
        return res.status(400).json({ message: "objectKey is required" });
      }

      const b2Client = getB2Client();
      if (!b2Client || !B2_BUCKET_NAME) {
        return res.status(503).json({ message: "Video storage not configured" });
      }

      console.log("[B2 Verify] Checking object:", objectKey);

      // Verify object exists in B2
      const objectExists = await verifyObjectExistsInB2(b2Client, objectKey);
      if (!objectExists) {
        console.log("[B2 Verify] Object NOT found:", objectKey);
        return res.status(404).json({ 
          message: "Video file not found in storage",
          errorCode: "B2_OBJECT_NOT_FOUND",
          verified: false 
        });
      }

      // Also verify CDN URL is accessible
      const computedCdnUrl = cdnUrl || getVideoCdnUrl(objectKey);
      const cdnAccessible = await verifyCdnUrlAccessible(computedCdnUrl);
      
      console.log("[B2 Verify] Result:", { objectKey, objectExists, cdnAccessible, cdnUrl: computedCdnUrl });

      res.json({ 
        verified: true, 
        objectExists, 
        cdnAccessible,
        cdnUrl: computedCdnUrl 
      });
    } catch (error: any) {
      console.error("[B2 Verify] Error:", error?.message || error);
      res.status(500).json({ message: "Failed to verify upload", details: error?.message });
    }
  });

  // Cloudflare R2 - Presigned URL for file upload
  app.post("/api/r2/presign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers and super admins can upload files" });
      }
      
      const { fileName, contentType, courseId, fileSize } = req.body;
      
      if (!fileName || !contentType || !courseId) {
        return res.status(400).json({ message: "fileName, contentType, and courseId are required" });
      }
      
      // Validate file extension
      const ext = fileName.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({ 
          message: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` 
        });
      }
      
      // Validate content type
      if (!ALLOWED_FILE_TYPES.includes(contentType)) {
        return res.status(400).json({ message: "Content type not allowed" });
      }
      
      // Validate file size
      if (fileSize && fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({ message: "File size exceeds 100MB limit" });
      }
      
      // Verify course exists and user has access to upload
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Teachers can only upload to their own courses
      // Super admins can upload to any course (by design - full system access)
      if (user.role === "TEACHER" && course.teacherId !== userId) {
        console.warn(`[R2 UPLOAD DENIED] Teacher ${userId} attempted to upload to course ${courseId} owned by ${course.teacherId}`);
        return res.status(403).json({ message: "You can only upload files to your own courses" });
      }
      
      // Audit log for uploads
      console.log(`[R2 UPLOAD] User ${userId} (${user.role}) uploading file "${fileName}" to course ${courseId}`);
      
      const r2Client = getR2Client();
      if (!r2Client || !R2_BUCKET_NAME) {
        console.error("R2 configuration missing");
        return res.status(500).json({ message: "File storage service is not configured" });
      }
      
      // Create safe object key: courses/<courseId>/<timestamp>-<safeFileName>
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = Date.now();
      const objectKey = `courses/${courseId}/${timestamp}-${safeFileName}`;
      
      // Generate presigned PUT URL (10 minute expiry)
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
        ContentType: contentType,
      });
      
      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });
      
      // Use secure download endpoint instead of direct public URL
      const fileUrl = `/api/r2/download?key=${encodeURIComponent(objectKey)}`;
      
      res.json({
        uploadUrl,
        objectKey,
        fileUrl,
        fileName: safeFileName,
      });
    } catch (error) {
      console.error("Error creating R2 presigned URL:", error);
      res.status(500).json({ message: "Failed to create upload URL" });
    }
  });

  // Cloudflare R2 - Secure file download
  app.get("/api/r2/download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const key = req.query.key as string;
      if (!key) {
        return res.status(400).json({ message: "File key is required" });
      }
      
      // Validate key format strictly: courses/<courseId>/<timestamp>-<fileName>
      // Key must match the exact pattern we generate in presign
      const keyPattern = /^courses\/(\d+)\/\d+-[a-zA-Z0-9._-]+$/;
      const keyMatch = key.match(keyPattern);
      
      if (!keyMatch) {
        return res.status(400).json({ message: "Invalid file key format" });
      }
      
      const courseId = parseInt(keyMatch[1]);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({ message: "Invalid course ID in file key" });
      }
      
      // Check access: must be teacher of the course, enrolled student, admin, or super admin
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const isTeacher = user.role === "TEACHER" && course.teacherId === userId;
      const isSuperAdmin = user.role === "SUPER_ADMIN";
      const isAdmin = user.role === "ADMIN";
      
      let isEnrolledStudent = false;
      if (user.role === "STUDENT") {
        const enrollments = await storage.getEnrollmentsByStudent(userId);
        isEnrolledStudent = enrollments.some(e => e.courseId === courseId);
      }
      
      if (!isTeacher && !isSuperAdmin && !isAdmin && !isEnrolledStudent) {
        return res.status(403).json({ message: "You don't have access to this file" });
      }
      
      // Check if course is locked for enrolled students
      if (isEnrolledStudent && course.isLocked) {
        return res.status(403).json({ message: "Course is currently locked by the instructor" });
      }
      
      const r2Client = getR2Client();
      if (!r2Client || !R2_BUCKET_NAME) {
        return res.status(500).json({ message: "File storage service is not configured" });
      }
      
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });
      
      const response = await r2Client.send(command);
      
      if (!response.Body) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Extract filename from key (format: courses/<courseId>/<timestamp>-<fileName>)
      const keyParts = key.split("/");
      const fileName = keyParts[keyParts.length - 1].replace(/^\d+-/, "");
      
      res.setHeader("Content-Type", response.ContentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      if (response.ContentLength) {
        res.setHeader("Content-Length", response.ContentLength);
      }
      
      // Stream the file to response
      const stream = response.Body as NodeJS.ReadableStream;
      stream.pipe(res);
    } catch (error: any) {
      if (error.name === "NoSuchKey") {
        return res.status(404).json({ message: "File not found" });
      }
      console.error("Error downloading R2 file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Profile - Avatar presign endpoint
  const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
  app.post("/api/profile/avatar/presign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fileName, contentType, fileSize } = req.body;
      
      if (!fileName || !contentType) {
        return res.status(400).json({ message: "fileName and contentType are required" });
      }
      
      // Validate image type
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(contentType)) {
        return res.status(400).json({ message: "Only PNG, JPG, JPEG, and WebP files are allowed" });
      }
      
      // Validate file size on server
      if (fileSize && fileSize > MAX_AVATAR_SIZE) {
        return res.status(400).json({ message: "Avatar must be under 2MB" });
      }
      
      const r2Client = getR2Client();
      if (!r2Client || !R2_BUCKET_NAME) {
        console.error("R2 configuration missing for avatar upload");
        return res.status(500).json({ message: "File storage service is not configured" });
      }
      
      // Create safe object key: avatars/<userId>/<timestamp>-<safeFileName>
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = Date.now();
      const objectKey = `avatars/${userId}/${timestamp}-${safeFileName}`;
      
      // Generate presigned PUT URL (10 minute expiry)
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
        ContentType: contentType,
      });
      
      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });
      
      // For avatars, we'll generate a presigned GET URL that lasts longer
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
      });
      const fileUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 86400 * 7 }); // 7 days
      
      res.json({
        uploadUrl,
        objectKey,
        fileUrl,
      });
    } catch (error) {
      console.error("Error creating avatar presigned URL:", error);
      res.status(500).json({ message: "Failed to create upload URL" });
    }
  });

  // Profile - Avatar confirm endpoint
  app.post("/api/profile/avatar/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fileUrl } = req.body;
      
      if (!fileUrl) {
        console.log("[Avatar Confirm] Missing fileUrl in request body");
        return res.status(400).json({ message: "fileUrl is required" });
      }
      
      console.log(`[Avatar Confirm] Updating profile image for user ${userId}, URL length: ${fileUrl.length}`);
      
      // Update user's profile image URL
      const updatedUser = await storage.updateUserProfileImage(userId, fileUrl);
      
      if (!updatedUser) {
        console.error(`[Avatar Confirm] User ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[Avatar Confirm] Successfully updated profile image for user ${userId}`);
      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error("[Avatar Confirm] Error:", error?.message || error);
      console.error("[Avatar Confirm] Full error:", error);
      res.status(500).json({ message: error?.message || "Failed to update profile image" });
    }
  });

  // Profile - Change password endpoint
  app.post("/api/profile/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { newPassword, confirmPassword } = req.body;
      
      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: "New password and confirmation are required" });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update user's password
      await storage.updateUserPassword(userId, passwordHash);
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.patch("/api/profile/phone", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { phoneNumber } = req.body;

      if (!phoneNumber || typeof phoneNumber !== "string") {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const trimmed = phoneNumber.trim();
      if (trimmed.length < 5) {
        return res.status(400).json({ message: "Please enter a valid phone number" });
      }

      const updated = await storage.updateUserPhoneNumber(userId, trimmed);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, phoneNumber: updated.phoneNumber });
    } catch (error) {
      console.error("Error updating phone number:", error);
      res.status(500).json({ message: "Failed to update phone number" });
    }
  });

  // ============ JOIN REQUESTS ============
  
  // Multer config for join request receipt uploads (memory storage, 10MB max)
  const joinRequestReceiptUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      const allowedReceipt = ["image/png", "image/jpeg", "application/pdf"];
      if (allowedReceipt.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only PNG, JPG, and PDF files are allowed"));
      }
    },
  });
  
  // Log R2 configuration status on startup
  console.log(`[R2 Config] ACCOUNT_ID: ${R2_ACCOUNT_ID ? 'SET' : 'NOT SET'}`);
  console.log(`[R2 Config] ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID ? 'SET' : 'NOT SET'}`);
  console.log(`[R2 Config] SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`[R2 Config] BUCKET_NAME: ${R2_BUCKET_NAME || 'NOT SET'}`);

  // R2 Health Check - Admin only endpoint to verify R2 connectivity
  app.get("/api/admin/health/r2", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const r2Client = getR2Client();
      if (!r2Client) {
        return res.status(500).json({ 
          status: "ERROR",
          message: "R2 client not configured",
          details: {
            ACCOUNT_ID: R2_ACCOUNT_ID ? "SET" : "NOT SET",
            ACCESS_KEY_ID: R2_ACCESS_KEY_ID ? "SET" : "NOT SET",
            SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY ? "SET" : "NOT SET",
            BUCKET_NAME: R2_BUCKET_NAME || "NOT SET"
          }
        });
      }
      
      if (!R2_BUCKET_NAME) {
        return res.status(500).json({ 
          status: "ERROR",
          message: "R2_BUCKET_NAME not configured"
        });
      }
      
      // Try to put and delete a test object to verify permissions
      const testKey = `health-check/${Date.now()}.txt`;
      const testContent = "R2 health check - this file can be safely deleted";
      
      try {
        // Test PUT
        await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: testKey,
          Body: testContent,
          ContentType: "text/plain"
        }));
        
        // Test DELETE (cleanup)
        await r2Client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: testKey
        }));
        
        return res.json({ 
          status: "OK",
          message: "R2 connectivity verified",
          bucket: R2_BUCKET_NAME,
          permissions: ["PUT", "DELETE"]
        });
      } catch (uploadError: any) {
        console.error("[R2 Health] Upload test failed:", uploadError.message);
        return res.status(500).json({
          status: "ERROR",
          message: "R2 upload test failed",
          error: uploadError.message,
          code: uploadError.Code || uploadError.name
        });
      }
    } catch (error: any) {
      console.error("[R2 Health] Error:", error);
      return res.status(500).json({ status: "ERROR", message: error.message });
    }
  });

  // ==================== JOIN REQUEST ENDPOINTS ====================
  
  // Configuration
  const JOIN_REQUEST_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const JOIN_REQUEST_ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
  
  // Student - Get my join request status for a course
  app.get("/api/join-requests/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseId = parseInt(req.query.courseId as string);
      
      if (isNaN(courseId)) {
        console.log("[JoinRequest] Invalid courseId:", req.query.courseId);
        return res.status(400).json({ message: "Valid courseId is required" });
      }
      
      const request = await storage.getStudentJoinRequestForCourse(userId, courseId);
      
      if (!request) {
        return res.json({ exists: false, status: null });
      }
      
      res.json({
        exists: true,
        id: request.id,
        status: request.status,
        message: request.message,
        createdAt: request.createdAt,
        reviewedAt: request.reviewedAt,
      });
    } catch (error) {
      console.error("[JoinRequest] Error fetching status:", error);
      res.status(500).json({ message: "Failed to fetch join request status" });
    }
  });
  
  // Student - Create or update join request
  app.post("/api/join-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "STUDENT") {
        console.log("[JoinRequest] Non-student attempted to create request:", userId);
        return res.status(403).json({ message: "Only students can submit join requests" });
      }
      
      const { courseId, message, receiptKey, receiptMime, receiptSize } = req.body;
      
      // Validate courseId
      if (!courseId || isNaN(parseInt(courseId))) {
        return res.status(400).json({ message: "Valid courseId is required" });
      }
      
      const courseIdNum = parseInt(courseId);
      
      // Check course exists
      const course = await storage.getCourseById(courseIdNum);
      if (!course) {
        console.log("[JoinRequest] Course not found:", courseIdNum);
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if already enrolled
      const enrolled = await storage.isEnrolled(userId, courseIdNum);
      if (enrolled) {
        console.log("[JoinRequest] User already enrolled:", userId, courseIdNum);
        return res.status(400).json({ message: "You are already enrolled in this course" });
      }
      
      // Check for existing pending request
      const existingRequest = await storage.getStudentJoinRequestForCourse(userId, courseIdNum);
      if (existingRequest && existingRequest.status === "PENDING") {
        console.log("[JoinRequest] Pending request already exists:", existingRequest.id);
        return res.status(400).json({ message: "You already have a pending request for this course" });
      }
      
      // Validate receipt
      if (!receiptKey || !receiptMime || !receiptSize) {
        return res.status(400).json({ message: "Receipt file is required" });
      }
      
      if (!JOIN_REQUEST_ALLOWED_TYPES.includes(receiptMime)) {
        return res.status(400).json({ message: "Invalid file type. Allowed: JPG, PNG, PDF" });
      }
      
      if (receiptSize > JOIN_REQUEST_MAX_FILE_SIZE) {
        return res.status(400).json({ message: "File too large. Maximum size is 10 MB" });
      }
      
      // Create the join request
      const joinRequest = await storage.createJoinRequest({
        courseId: courseIdNum,
        studentId: userId,
        message: message || null,
        receiptKey,
        receiptMime,
        receiptSize,
        status: "PENDING",
      });
      
      console.log("[JoinRequest] Created request:", joinRequest.id, "for course:", courseIdNum, "by student:", userId);
      
      res.status(201).json({
        id: joinRequest.id,
        status: joinRequest.status,
        message: "Join request submitted successfully",
      });
    } catch (error) {
      console.error("[JoinRequest] Error creating request:", error);
      res.status(500).json({ message: "Failed to submit join request" });
    }
  });
  
  // Student - Get presigned URL for receipt upload
  app.post("/api/join-requests/presign-receipt", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "STUDENT") {
        return res.status(403).json({ message: "Only students can upload receipts" });
      }
      
      const { fileName, contentType, courseId } = req.body;
      
      if (!fileName || !contentType || !courseId) {
        return res.status(400).json({ message: "fileName, contentType, and courseId are required" });
      }
      
      if (!JOIN_REQUEST_ALLOWED_TYPES.includes(contentType)) {
        return res.status(400).json({ message: "Invalid file type. Allowed: JPG, PNG, PDF" });
      }
      
      const b2Client = getB2Client();
      if (!b2Client || !B2_BUCKET_NAME) {
        console.error("[JoinRequest] B2 not configured");
        return res.status(500).json({ message: "File storage service is not configured" });
      }
      
      // Generate unique key
      const timestamp = Date.now();
      const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const objectKey = `join-requests/${courseId}/${userId}/${timestamp}-${safeFileName}`;
      
      // Generate presigned PUT URL (10 minute expiry)
      const command = new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: objectKey,
        ContentType: contentType,
      });
      
      const uploadUrl = await getSignedUrl(b2Client, command, { expiresIn: 600 });
      
      console.log("[JoinRequest] Generated presigned URL for receipt (B2):", objectKey);
      
      res.json({
        uploadUrl,
        objectKey,
      });
    } catch (error) {
      console.error("[JoinRequest] Error generating presigned URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });
  
  // Student - Proxy upload receipt (fallback for CORS issues)
  app.post("/api/join-requests/upload-receipt", isAuthenticated, joinRequestReceiptUpload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "STUDENT") {
        return res.status(403).json({ message: "Only students can upload receipts" });
      }
      
      const file = req.file;
      const { courseId } = req.body;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      if (!courseId) {
        return res.status(400).json({ message: "courseId is required" });
      }
      
      if (!JOIN_REQUEST_ALLOWED_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Allowed: JPG, PNG, PDF" });
      }
      
      if (file.size > JOIN_REQUEST_MAX_FILE_SIZE) {
        return res.status(400).json({ message: "File too large. Maximum size is 10 MB" });
      }
      
      const b2Client = getB2Client();
      if (!b2Client || !B2_BUCKET_NAME) {
        console.error("[JoinRequest] B2 not configured for proxy upload");
        return res.status(500).json({ message: "File storage service is not configured" });
      }
      
      // Generate unique key
      const timestamp = Date.now();
      const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const objectKey = `join-requests/${courseId}/${userId}/${timestamp}-${safeFileName}`;
      
      // Upload to B2 via backend
      const command = new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      });
      
      await b2Client.send(command);
      
      console.log("[JoinRequest] Receipt uploaded via proxy (B2):", objectKey);
      
      res.json({
        objectKey,
        contentType: file.mimetype,
        size: file.size,
      });
    } catch (error) {
      console.error("[JoinRequest] Error uploading receipt via proxy:", error);
      res.status(500).json({ message: "Failed to upload receipt" });
    }
  });
  
  // Teacher/Admin - Get all join requests for their courses
  app.get("/api/join-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      let requests: any[] = [];
      
      if (user.role === "TEACHER") {
        requests = await storage.getJoinRequestsByTeacher(userId);
      } else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        // Admins can see all join requests, optionally filtered by courseId
        const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
        if (courseId) {
          requests = await storage.getJoinRequestsByCourse(courseId);
        } else {
          // Get all courses, then get requests for each
          const courses = await storage.getCourses();
          for (const course of courses) {
            const courseRequests = await storage.getJoinRequestsByCourse(course.id);
            requests.push(...courseRequests);
          }
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      console.log("[JoinRequest] Fetched", requests.length, "requests for user:", userId);
      res.json(requests);
    } catch (error) {
      console.error("[JoinRequest] Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch join requests" });
    }
  });
  
  // Teacher/Admin - Approve join request
  app.post("/api/join-requests/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.id);
      
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        return res.status(403).json({ message: "Only admins can approve join requests" });
      }
      
      const joinRequest = await storage.getJoinRequestById(requestId);
      if (!joinRequest) {
        console.log("[JoinRequest] Request not found:", requestId);
        return res.status(404).json({ message: "Join request not found" });
      }
      
      if (joinRequest.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      // Update status to approved
      await storage.updateJoinRequestStatus(requestId, "APPROVED");
      
      // Create enrollment
      await storage.createEnrollment({
        courseId: joinRequest.courseId,
        studentId: joinRequest.studentId,
        createdByUserId: userId,
      });
      
      console.log("[JoinRequest] Approved request:", requestId, "enrolled student:", joinRequest.studentId);
      
      res.json({ message: "Request approved and student enrolled successfully" });
    } catch (error) {
      console.error("[JoinRequest] Error approving request:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });
  
  // Teacher/Admin - Reject join request
  app.post("/api/join-requests/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.id);
      
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        return res.status(403).json({ message: "Only admins can reject join requests" });
      }
      
      const joinRequest = await storage.getJoinRequestById(requestId);
      if (!joinRequest) {
        console.log("[JoinRequest] Request not found:", requestId);
        return res.status(404).json({ message: "Join request not found" });
      }
      
      if (joinRequest.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      // Update status to rejected
      await storage.updateJoinRequestStatus(requestId, "REJECTED");
      
      console.log("[JoinRequest] Rejected request:", requestId);
      
      res.json({ message: "Request rejected" });
    } catch (error) {
      console.error("[JoinRequest] Error rejecting request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });
  
  // Teacher/Admin - Get receipt download URL
  app.get("/api/join-requests/:id/receipt", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.id);
      
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const joinRequest = await storage.getJoinRequestById(requestId);
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }
      
      // Teachers can only view receipts for their own courses
      if (user.role === "TEACHER") {
        const course = await storage.getCourseById(joinRequest.courseId);
        if (!course || course.teacherId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const b2Client = getB2Client();
      if (!b2Client || !B2_BUCKET_NAME) {
        return res.status(500).json({ message: "File storage service is not configured" });
      }
      
      // Generate presigned GET URL (1 hour expiry)
      const command = new GetObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: joinRequest.receiptKey,
      });
      
      const downloadUrl = await getSignedUrl(b2Client, command, { expiresIn: 3600 });
      
      console.log("[JoinRequest] Generated receipt URL for request (B2):", requestId);
      
      res.json({
        downloadUrl,
        mimeType: joinRequest.receiptMime,
        fileName: joinRequest.receiptKey.split("/").pop(),
      });
    } catch (error) {
      console.error("[JoinRequest] Error fetching receipt:", error);
      res.status(500).json({ message: "Failed to get receipt" });
    }
  });
  
  // Storage health check endpoint
  app.get("/api/admin/health/storage", requireRole("ADMIN", "SUPER_ADMIN"), async (req: any, res) => {
    try {
      const r2Client = getR2Client();
      if (!r2Client) {
        return res.status(500).json({
          status: "ERROR",
          message: "R2 client not configured",
          details: {
            ACCOUNT_ID: R2_ACCOUNT_ID ? "SET" : "NOT SET",
            ACCESS_KEY_ID: R2_ACCESS_KEY_ID ? "SET" : "NOT SET",
            SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY ? "SET" : "NOT SET",
            BUCKET_NAME: R2_BUCKET_NAME || "NOT SET",
          },
        });
      }
      
      if (!R2_BUCKET_NAME) {
        return res.status(500).json({
          status: "ERROR",
          message: "R2_BUCKET_NAME not configured",
        });
      }
      
      // Test write and delete
      const testKey = `health-check/${Date.now()}.txt`;
      const testContent = "health check";
      
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: testKey,
        Body: testContent,
        ContentType: "text/plain",
      }));
      
      await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: testKey,
      }));
      
      res.json({
        status: "OK",
        message: "Storage connectivity verified",
        bucket: R2_BUCKET_NAME,
      });
    } catch (error: any) {
      console.error("[Storage Health] Error:", error);
      res.status(500).json({
        status: "ERROR",
        message: error.message || "Storage health check failed",
      });
    }
  });
  
  // ==================== END JOIN REQUEST ENDPOINTS ====================

  // ==================== ACCOUNTANT ENDPOINTS ====================
  
  // Get enrollment statistics grouped by college
  app.get("/api/accountant/enrollments", requireRole("ACCOUNTANT", "SUPER_ADMIN"), async (req: any, res) => {
    try {
      // Get all colleges
      const allColleges = await storage.getColleges();
      
      // Get all published courses with enrollment counts (getCourses already includes _count)
      const allCourses = await storage.getCourses();
      
      // Build grouped structure
      let totalEnrollments = 0;
      let totalCourses = 0;
      
      const colleges = allColleges.map(college => {
        // Get courses for this college (published only)
        const collegeCourses = allCourses.filter(
          c => c.collegeId === college.id && c.status === "PUBLISHED"
        );
        
        // Group by college (no subject/tab since schema doesn't have it)
        const courses = collegeCourses.map(course => {
          const enrollmentCount = course._count?.enrollments || 0;
          totalEnrollments += enrollmentCount;
          totalCourses++;
          return {
            id: course.id,
            title: course.title,
            enrollments: enrollmentCount,
          };
        });
        
        return {
          id: college.id,
          name: college.name,
          courses,
        };
      }).filter(college => college.courses.length > 0);
      
      res.json({
        totals: {
          totalEnrollments,
          totalCourses,
          totalColleges: colleges.length,
        },
        colleges,
      });
    } catch (error) {
      console.error("Error fetching accountant enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollment data" });
    }
  });
  
  // Financial reports - course revenue data with instructor info
  app.get("/api/accountant/reports", requireRole("ACCOUNTANT", "SUPER_ADMIN"), async (req: any, res) => {
    try {
      const allCourses = await storage.getCourses();
      const publishedCourses = allCourses.filter(c => c.status === "PUBLISHED");

      const reports = publishedCourses.map(course => {
        const enrollmentCount = course._count?.enrollments || 0;
        const price = course.price || 0;
        const instructorName = course.instructorName ||
          (course.teacher ? `${course.teacher.firstName || ""} ${course.teacher.lastName || ""}`.trim() : "Unknown");

        return {
          courseId: course.id,
          title: course.title,
          instructorId: course.teacherId,
          instructorName,
          collegeName: course.college?.name || "N/A",
          price,
          studentCount: enrollmentCount,
          totalRevenue: price * enrollmentCount,
        };
      });

      const totalRevenue = reports.reduce((sum, r) => sum + r.totalRevenue, 0);
      const totalStudents = reports.reduce((sum, r) => sum + r.studentCount, 0);

      res.json({
        reports,
        totals: {
          totalRevenue,
          totalStudents,
          totalCourses: reports.length,
        },
      });
    } catch (error) {
      console.error("Error fetching accountant reports:", error);
      res.status(500).json({ message: "Failed to fetch financial reports" });
    }
  });

  // Generate PDF enrollment report
  app.get("/api/accountant/enrollments.pdf", requireRole("ACCOUNTANT", "SUPER_ADMIN"), async (req: any, res) => {
    try {
      // Get all colleges
      const allColleges = await storage.getColleges();
      
      // Get all published courses with enrollment counts (getCourses already includes _count)
      const allCourses = await storage.getCourses();
      
      // Build data
      let totalEnrollments = 0;
      let totalCourses = 0;
      
      const colleges = allColleges.map(college => {
        const collegeCourses = allCourses.filter(
          c => c.collegeId === college.id && c.status === "PUBLISHED"
        );
        
        const courses = collegeCourses.map(course => {
          const enrollmentCount = course._count?.enrollments || 0;
          totalEnrollments += enrollmentCount;
          totalCourses++;
          return {
            id: course.id,
            title: course.title,
            enrollments: enrollmentCount,
          };
        });
        
        return {
          id: college.id,
          name: college.name,
          courses,
        };
      }).filter(college => college.courses.length > 0);
      
      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers
      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="enrollment-report-${dateStr}.pdf"`);
      
      doc.pipe(res);
      
      // Title
      doc.fontSize(24).font("Helvetica-Bold").text("Enrollment Report", { align: "center" });
      doc.moveDown(0.5);
      
      // Generated date
      doc.fontSize(10).font("Helvetica").fillColor("#666666")
        .text(`Generated at: ${new Date().toLocaleString("en-US")}`, { align: "center" });
      doc.moveDown(1.5);
      
      // Summary section
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000").text("Summary");
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica")
        .text(`Total Enrollments: ${totalEnrollments}`)
        .text(`Total Courses: ${totalCourses}`)
        .text(`Total Colleges: ${colleges.length}`);
      doc.moveDown(1.5);
      
      // Divider
      doc.strokeColor("#cccccc").lineWidth(1)
        .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);
      
      // College sections
      for (const college of colleges) {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }
        
        // College name
        doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text(college.name);
        doc.moveDown(0.3);
        
        // Courses table header
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
        const headerY = doc.y;
        doc.text("Course Title", 50, headerY);
        doc.text("Enrollments", 450, headerY, { width: 80, align: "right" });
        doc.moveDown(0.3);
        
        // Underline
        doc.strokeColor("#dddddd").lineWidth(0.5)
          .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.3);
        
        // Course rows
        doc.fontSize(10).font("Helvetica").fillColor("#333333");
        for (const course of college.courses) {
          if (doc.y > 720) {
            doc.addPage();
          }
          const rowY = doc.y;
          // Truncate long titles
          const maxTitleWidth = 380;
          doc.text(course.title, 50, rowY, { width: maxTitleWidth, ellipsis: true });
          doc.text(String(course.enrollments), 450, rowY, { width: 80, align: "right" });
          doc.moveDown(0.5);
        }
        
        // College total
        const collegeTotal = college.courses.reduce((sum, c) => sum + c.enrollments, 0);
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
        const totalY = doc.y;
        doc.text("College Total:", 50, totalY);
        doc.text(String(collegeTotal), 450, totalY, { width: 80, align: "right" });
        doc.moveDown(1.5);
      }
      
      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica").fillColor("#999999")
        .text("This report is confidential and intended for authorized personnel only.", { align: "center" });
      
      doc.end();
    } catch (error) {
      console.error("Error generating PDF report:", error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  app.post("/api/security/report-screenshot", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }

      const user = await storage.getUser(String(userId));
      if (!user) {
        console.error(`[Security] report-screenshot: user not found for id=${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown";
      const phone = user.phoneNumber || "N/A";
      const email = user.email || "N/A";
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" });

      console.log(`[Security] Screenshot attempt by user: ${name} (${email}), sending alert email...`);

      const emailResult = await sendEmail({
        to: "support@noqtaa.cloud",
        subject: "SECURITY ALERT: Screenshot Attempt Detected",
        text: `User ${name} (Phone: ${phone}, Email: ${email}) attempted to take a screenshot at ${timestamp}. Please review their account.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #dc2626; padding: 16px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">SECURITY ALERT</h1>
              <p style="color: #fecaca; margin: 4px 0 0;">Screenshot Attempt Detected</p>
            </div>
            <div style="background: #fef2f2; padding: 24px; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; color: #991b1b;">User:</td><td style="padding: 8px 0;">${name}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #991b1b;">Phone:</td><td style="padding: 8px 0;">${phone}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #991b1b;">Email:</td><td style="padding: 8px 0;">${email}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #991b1b;">Public ID:</td><td style="padding: 8px 0;">${user.publicId || "N/A"}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #991b1b;">Timestamp:</td><td style="padding: 8px 0;">${timestamp}</td></tr>
              </table>
              <p style="margin-top: 16px; color: #7f1d1d; font-weight: bold;">Please review this user's account immediately.</p>
            </div>
          </div>
        `,
      });

      if (emailResult) {
        console.log(`[Security] Alert email sent successfully for user: ${email}`);
      } else {
        console.error(`[Security] Failed to send alert email for user: ${email}`);
      }

      res.json({ message: "Violation reported", emailSent: emailResult });
    } catch (error: any) {
      console.error("[Security] Error in report-screenshot:", error.message);
      res.status(500).json({ message: "Failed to report violation" });
    }
  });

  // ===== Quiz Builder / PDF-to-Quiz AI Generator =====

  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are accepted"));
      }
    },
  });

  app.post("/api/admin/generate-quiz-from-pdf",
    requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"),
    pdfUpload.single("pdfFile"),
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No PDF file uploaded" });
        }

        let extractedText: string;
        try {
          const parser = new PDFParse({ data: req.file.buffer });
          const textResult = await parser.getText();
          extractedText = textResult.text?.trim() || "";
          await parser.destroy();
        } catch (parseErr) {
          return res.status(400).json({
            message: "Could not read text from this PDF. Please ensure the PDF is text-based, not scanned images."
          });
        }
        if (!extractedText || extractedText.length < 50) {
          return res.status(400).json({
            message: "Could not extract enough text from the PDF. Please ensure the PDF is text-based and contains readable content, not scanned images."
          });
        }

        const truncatedText = extractedText.substring(0, 15000);

        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert academic quiz generator. Analyze the following academic text and generate multiple-choice questions based on the content. You MUST return a JSON object with a single key "questions" containing an array of question objects. Each question object must have:
- "question" (string): The question text
- "options" (array of exactly 4 strings): Four possible answers
- "correctAnswer" (string): Must exactly match one of the options
- "explanation" (string): A brief explanation of why the correct answer is right

Example response format:
{"questions": [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "Because..."}]}

Generate between 5 and 20 questions depending on the content length. Focus on key concepts, definitions, and important facts.`
            },
            {
              role: "user",
              content: truncatedText
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });

        const responseText = completion.choices[0]?.message?.content || "";

        let questions;
        try {
          const parsed = JSON.parse(responseText);
          questions = parsed.questions || parsed.quiz || (Array.isArray(parsed) ? parsed : []);
        } catch {
          return res.status(500).json({ message: "Failed to parse AI response. Please try again." });
        }

        const validQuestions = questions.filter((q: any) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.correctAnswer &&
          q.options.includes(q.correctAnswer)
        );

        if (validQuestions.length === 0) {
          return res.status(400).json({
            message: "The AI could not generate valid questions from this PDF content. Try a different document with clearer academic content."
          });
        }

        res.json({ questions: validQuestions });
      } catch (error: any) {
        console.error("[Quiz Generator] Error:", error.message);
        res.status(500).json({ message: "Failed to generate quiz. Please try again." });
      }
    }
  );

  app.get("/api/quiz-questions", requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"), async (req: any, res) => {
    try {
      const courseId = parseInt(req.query.courseId as string);
      if (!courseId) {
        return res.status(400).json({ message: "courseId is required" });
      }
      const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.courseId, courseId)).orderBy(quizQuestions.createdAt);
      res.json(questions);
    } catch (error: any) {
      console.error("[Quiz] Error fetching questions:", error.message);
      res.status(500).json({ message: "Failed to fetch quiz questions" });
    }
  });

  app.post("/api/quiz-questions/bulk", requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"), async (req: any, res) => {
    try {
      const { courseId, questions } = req.body;
      if (!courseId || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "courseId and questions array are required" });
      }

      const userId = req.user?.id;
      const values = questions.map((q: any) => ({
        courseId: parseInt(courseId),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || null,
        createdByUserId: userId,
      }));

      const inserted = await db.insert(quizQuestions).values(values).returning();
      res.json({ inserted: inserted.length, questions: inserted });
    } catch (error: any) {
      console.error("[Quiz] Error saving questions:", error.message);
      res.status(500).json({ message: "Failed to save quiz questions" });
    }
  });

  app.delete("/api/quiz-questions/:id", requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
      res.json({ message: "Question deleted" });
    } catch (error: any) {
      console.error("[Quiz] Error deleting question:", error.message);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
