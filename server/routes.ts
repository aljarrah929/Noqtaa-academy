import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, seedSuperAdmin } from "./auth";
import { insertCourseSchema, insertLessonSchema, insertEnrollmentSchema, insertCollegeSchema, insertCourseApprovalLogSchema, insertFeaturedProfileSchema, updateHomeStatsSchema, updateAdminDashboardStatsConfigSchema } from "@shared/schema";
import { z } from "zod";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import bcrypt from "bcryptjs";
import multer from "multer";

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
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can update course details" });
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
          if (enrolled && course.isLocked) {
            // Enrolled but course is locked by teacher
            isCourseLocked = true;
            hasAccess = false;
          } else {
            hasAccess = enrolled;
          }
        }
      }
      
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
      
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Only teachers and admins can enroll students" });
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
      
      // Check authorization: teacher owns course OR is admin
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
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

  // ============ JOIN REQUESTS ============
  
  // Multer config for receipt uploads (memory storage, 2MB max)
  const receiptUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (_req, file, cb) => {
      const allowedReceipt = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (allowedReceipt.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only PNG, JPG, JPEG, and WebP images are allowed"));
      }
    },
  });

  // Student - Check join request status for a course
  app.get("/api/courses/:courseId/join-request/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseId = parseInt(req.params.courseId);
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "STUDENT") {
        return res.status(403).json({ message: "Only students can check join request status" });
      }
      
      const hasPending = await storage.hasPendingJoinRequest(userId, courseId);
      const hasApproved = await storage.hasApprovedJoinRequest(userId, courseId);
      const isEnrolled = await storage.isEnrolled(userId, courseId);
      
      res.json({ hasPending, hasApproved, isEnrolled });
    } catch (error) {
      console.error("Error checking join request status:", error);
      res.status(500).json({ message: "Failed to check join request status" });
    }
  });

  // Student - Submit join request with receipt
  app.post("/api/courses/:courseId/join-request", isAuthenticated, receiptUpload.single("receipt"), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseId = parseInt(req.params.courseId);
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "STUDENT") {
        return res.status(403).json({ message: "Only students can submit join requests" });
      }
      
      // Check if course exists and is published
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.status !== "PUBLISHED") {
        return res.status(400).json({ message: "Course is not available for enrollment" });
      }
      
      // Check if already enrolled
      const isEnrolled = await storage.isEnrolled(userId, courseId);
      if (isEnrolled) {
        return res.status(400).json({ message: "You are already enrolled in this course" });
      }
      
      // Check for pending request
      const hasPending = await storage.hasPendingJoinRequest(userId, courseId);
      if (hasPending) {
        return res.status(400).json({ message: "Your request is already pending" });
      }
      
      // Check for approved request (shouldn't happen but just in case)
      const hasApproved = await storage.hasApprovedJoinRequest(userId, courseId);
      if (hasApproved) {
        return res.status(400).json({ message: "Your request was already approved" });
      }
      
      // Validate receipt file
      if (!req.file) {
        return res.status(400).json({ message: "Payment receipt is required" });
      }
      
      // Upload receipt to R2 (private)
      const r2Client = getR2Client();
      if (!r2Client || !R2_BUCKET_NAME) {
        return res.status(500).json({ message: "File storage service is not configured" });
      }
      
      const timestamp = Date.now();
      const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const receiptKey = `receipts/${courseId}/${userId}/${timestamp}-${safeFileName}`;
      
      const uploadCommand = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: receiptKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });
      
      await r2Client.send(uploadCommand);
      
      // Create join request record
      const joinRequest = await storage.createJoinRequest({
        courseId,
        studentId: userId,
        message: req.body.message || null,
        receiptKey,
        receiptMime: req.file.mimetype,
        receiptSize: req.file.size,
        status: "PENDING",
      });
      
      res.status(201).json({ 
        success: true, 
        message: "Request submitted. Wait for teacher approval.",
        requestId: joinRequest.id,
      });
    } catch (error: any) {
      console.error("Error submitting join request:", error);
      if (error.message?.includes("Only PNG")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to submit join request" });
    }
  });

  // Teacher - Get all join requests for their courses
  app.get("/api/teacher/join-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers can view join requests" });
      }
      
      const requests = await storage.getJoinRequestsByTeacher(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching join requests:", error);
      res.status(500).json({ message: "Failed to fetch join requests" });
    }
  });

  // Teacher - Approve join request
  app.post("/api/teacher/join-requests/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers can approve join requests" });
      }
      
      // Get join request with course info
      const joinRequest = await storage.getJoinRequestById(requestId);
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }
      
      // Verify teacher owns the course
      const course = await storage.getCourseById(joinRequest.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.teacherId !== userId && user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "You can only approve requests for your own courses" });
      }
      
      // Check if request is still pending
      if (joinRequest.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      // Create enrollment
      await storage.createEnrollment({
        courseId: joinRequest.courseId,
        studentId: joinRequest.studentId,
        createdByUserId: userId,
      });
      
      // Update join request status
      await storage.updateJoinRequestStatus(requestId, "APPROVED");
      
      res.json({ success: true, message: "Request approved and student enrolled" });
    } catch (error) {
      console.error("Error approving join request:", error);
      res.status(500).json({ message: "Failed to approve join request" });
    }
  });

  // Teacher - Reject join request
  app.post("/api/teacher/join-requests/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers can reject join requests" });
      }
      
      // Get join request with course info
      const joinRequest = await storage.getJoinRequestById(requestId);
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }
      
      // Verify teacher owns the course
      const course = await storage.getCourseById(joinRequest.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.teacherId !== userId && user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "You can only reject requests for your own courses" });
      }
      
      // Check if request is still pending
      if (joinRequest.status !== "PENDING") {
        return res.status(400).json({ message: "This request has already been processed" });
      }
      
      // Update join request status
      await storage.updateJoinRequestStatus(requestId, "REJECTED");
      
      res.json({ success: true, message: "Request rejected" });
    } catch (error) {
      console.error("Error rejecting join request:", error);
      res.status(500).json({ message: "Failed to reject join request" });
    }
  });

  // Teacher - Get receipt signed URL
  app.get("/api/teacher/join-requests/:id/receipt", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "TEACHER" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers can view receipts" });
      }
      
      // Get join request with course info
      const joinRequest = await storage.getJoinRequestById(requestId);
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }
      
      // Verify teacher owns the course
      const course = await storage.getCourseById(joinRequest.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.teacherId !== userId && user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "You can only view receipts for your own courses" });
      }
      
      // Generate signed URL (60 seconds)
      const r2Client = getR2Client();
      if (!r2Client || !R2_BUCKET_NAME) {
        return res.status(500).json({ message: "File storage service is not configured" });
      }
      
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: joinRequest.receiptKey,
      });
      
      const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 60 });
      
      res.json({ 
        url: signedUrl, 
        mimeType: joinRequest.receiptMime,
        expiresIn: 60,
      });
    } catch (error) {
      console.error("Error getting receipt URL:", error);
      res.status(500).json({ message: "Failed to get receipt URL" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
