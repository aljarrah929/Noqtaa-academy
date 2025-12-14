import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, seedSuperAdmin } from "./auth";
import { insertCourseSchema, insertLessonSchema, insertEnrollmentSchema, insertCollegeSchema, insertCourseApprovalLogSchema, insertFeaturedProfileSchema, updateHomeStatsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  await seedSuperAdmin();

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
      if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({ message: "Only teachers can create courses" });
      }
      const data = insertCourseSchema.parse({ ...req.body, teacherId: userId });
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
      
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isOwner && !isAdmin) {
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
      
      const isOwner = course.teacherId === userId;
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this course" });
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

  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lesson = await storage.getLessonById(id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
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
      
      const updated = await storage.updateUserRole(targetId, role, collegeId);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
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

  const httpServer = createServer(app);
  return httpServer;
}
