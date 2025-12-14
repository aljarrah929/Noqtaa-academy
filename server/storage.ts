import {
  users,
  colleges,
  courses,
  lessons,
  enrollments,
  courseApprovalLogs,
  featuredProfiles,
  homeStats,
  type User,
  type UpsertUser,
  type College,
  type InsertCollege,
  type Course,
  type InsertCourse,
  type Lesson,
  type InsertLesson,
  type Enrollment,
  type InsertEnrollment,
  type CourseApprovalLog,
  type InsertCourseApprovalLog,
  type CourseWithRelations,
  type UserWithCollege,
  type FeaturedProfile,
  type InsertFeaturedProfile,
  type HomeStats,
  type UpdateHomeStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(data: { email: string; passwordHash: string; firstName: string; lastName: string; collegeId: number; role?: User["role"] }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserWithCollege(id: string): Promise<UserWithCollege | undefined>;
  updateUserRole(id: string, role: User["role"], collegeId?: number | null): Promise<User | undefined>;
  updateUserCollege(id: string, collegeId: number): Promise<User | undefined>;
  getAllUsers(): Promise<UserWithCollege[]>;
  getColleges(): Promise<College[]>;
  getCollegeById(id: number): Promise<College | undefined>;
  getCollegeBySlug(slug: string): Promise<College | undefined>;
  createCollege(college: InsertCollege): Promise<College>;
  updateCollege(id: number, college: Partial<InsertCollege>): Promise<College | undefined>;
  deleteCollege(id: number): Promise<void>;
  getCourses(collegeId?: number, status?: Course["status"]): Promise<CourseWithRelations[]>;
  getCourseById(id: number): Promise<CourseWithRelations | undefined>;
  getCoursesByTeacher(teacherId: string): Promise<CourseWithRelations[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: number): Promise<void>;
  getLessonsByCourse(courseId: number): Promise<Lesson[]>;
  getLessonById(id: number): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lesson: Partial<InsertLesson>): Promise<Lesson | undefined>;
  deleteLesson(id: number): Promise<void>;
  getEnrollmentsByCourse(courseId: number): Promise<(Enrollment & { student: User })[]>;
  getEnrollmentsByStudent(studentId: string): Promise<(Enrollment & { course: CourseWithRelations })[]>;
  isEnrolled(studentId: string, courseId: number): Promise<boolean>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  deleteEnrollment(id: number): Promise<void>;
  getCourseApprovalLogs(courseId: number): Promise<(CourseApprovalLog & { actor: User })[]>;
  createCourseApprovalLog(log: InsertCourseApprovalLog): Promise<CourseApprovalLog>;
  getPendingCourses(collegeId?: number): Promise<CourseWithRelations[]>;
  getTeacherStats(teacherId: string): Promise<{ totalCourses: number; totalStudents: number; publishedCourses: number }>;
  getAdminStats(collegeId?: number): Promise<{ totalCourses: number; totalStudents: number; totalTeachers: number; pendingApprovals: number }>;
  getTeachersWithStats(collegeId?: number): Promise<(UserWithCollege & { _count: { courses: number; students: number } })[]>;
  getFeaturedProfiles(activeOnly?: boolean): Promise<FeaturedProfile[]>;
  getFeaturedProfileById(id: number): Promise<FeaturedProfile | undefined>;
  createFeaturedProfile(profile: InsertFeaturedProfile): Promise<FeaturedProfile>;
  updateFeaturedProfile(id: number, profile: Partial<InsertFeaturedProfile>): Promise<FeaturedProfile | undefined>;
  deleteFeaturedProfile(id: number): Promise<void>;
  getHomeStats(): Promise<HomeStats | undefined>;
  getOrCreateHomeStats(): Promise<HomeStats>;
  updateHomeStats(data: UpdateHomeStats, userId: string): Promise<HomeStats>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUserWithPassword(data: { email: string; passwordHash: string; firstName: string; lastName: string; collegeId: number; role?: User["role"] }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      collegeId: data.collegeId,
      role: data.role || "STUDENT",
    }).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserWithCollege(id: string): Promise<UserWithCollege | undefined> {
    const result = await db
      .select()
      .from(users)
      .leftJoin(colleges, eq(users.collegeId, colleges.id))
      .where(eq(users.id, id));
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].users,
      college: result[0].colleges || undefined,
    };
  }

  async updateUserRole(id: string, role: User["role"], collegeId?: number | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, collegeId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserCollege(id: string, collegeId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ collegeId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<UserWithCollege[]> {
    const result = await db
      .select()
      .from(users)
      .leftJoin(colleges, eq(users.collegeId, colleges.id))
      .orderBy(desc(users.createdAt));
    
    return result.map(r => ({
      ...r.users,
      college: r.colleges || undefined,
    }));
  }

  async getColleges(): Promise<College[]> {
    return db.select().from(colleges).orderBy(colleges.name);
  }

  async getCollegeById(id: number): Promise<College | undefined> {
    const [college] = await db.select().from(colleges).where(eq(colleges.id, id));
    return college;
  }

  async getCollegeBySlug(slug: string): Promise<College | undefined> {
    const [college] = await db.select().from(colleges).where(eq(colleges.slug, slug));
    return college;
  }

  async createCollege(college: InsertCollege): Promise<College> {
    const [created] = await db.insert(colleges).values(college).returning();
    return created;
  }

  async updateCollege(id: number, college: Partial<InsertCollege>): Promise<College | undefined> {
    const [updated] = await db.update(colleges).set(college).where(eq(colleges.id, id)).returning();
    return updated;
  }

  async deleteCollege(id: number): Promise<void> {
    await db.delete(colleges).where(eq(colleges.id, id));
  }

  async getCourses(collegeId?: number, status?: Course["status"]): Promise<CourseWithRelations[]> {
    let query = db
      .select()
      .from(courses)
      .leftJoin(colleges, eq(courses.collegeId, colleges.id))
      .leftJoin(users, eq(courses.teacherId, users.id))
      .orderBy(desc(courses.createdAt));

    const results = await query;

    const courseIds = results.map(r => r.courses.id);
    
    const lessonCounts = courseIds.length > 0 
      ? await db.select({ courseId: lessons.courseId, count: count() }).from(lessons).where(sql`${lessons.courseId} IN ${courseIds}`).groupBy(lessons.courseId)
      : [];
    
    const enrollmentCounts = courseIds.length > 0
      ? await db.select({ courseId: enrollments.courseId, count: count() }).from(enrollments).where(sql`${enrollments.courseId} IN ${courseIds}`).groupBy(enrollments.courseId)
      : [];

    const lessonMap = new Map(lessonCounts.map(l => [l.courseId, Number(l.count)]));
    const enrollmentMap = new Map(enrollmentCounts.map(e => [e.courseId, Number(e.count)]));

    let filtered = results;
    if (collegeId) {
      filtered = filtered.filter(r => r.courses.collegeId === collegeId);
    }
    if (status) {
      filtered = filtered.filter(r => r.courses.status === status);
    }

    return filtered.map(r => ({
      ...r.courses,
      college: r.colleges || undefined,
      teacher: r.users || undefined,
      _count: {
        lessons: lessonMap.get(r.courses.id) || 0,
        enrollments: enrollmentMap.get(r.courses.id) || 0,
      },
    }));
  }

  async getCourseById(id: number): Promise<CourseWithRelations | undefined> {
    const result = await db
      .select()
      .from(courses)
      .leftJoin(colleges, eq(courses.collegeId, colleges.id))
      .leftJoin(users, eq(courses.teacherId, users.id))
      .where(eq(courses.id, id));

    if (result.length === 0) return undefined;

    const lessonList = await db.select().from(lessons).where(eq(lessons.courseId, id)).orderBy(lessons.orderIndex);
    const enrollmentList = await db.select().from(enrollments).where(eq(enrollments.courseId, id));

    return {
      ...result[0].courses,
      college: result[0].colleges || undefined,
      teacher: result[0].users || undefined,
      lessons: lessonList,
      enrollments: enrollmentList,
      _count: {
        lessons: lessonList.length,
        enrollments: enrollmentList.length,
      },
    };
  }

  async getCoursesByTeacher(teacherId: string): Promise<CourseWithRelations[]> {
    const results = await db
      .select()
      .from(courses)
      .leftJoin(colleges, eq(courses.collegeId, colleges.id))
      .where(eq(courses.teacherId, teacherId))
      .orderBy(desc(courses.createdAt));

    const courseIds = results.map(r => r.courses.id);
    
    const lessonCounts = courseIds.length > 0
      ? await db.select({ courseId: lessons.courseId, count: count() }).from(lessons).where(sql`${lessons.courseId} IN ${courseIds}`).groupBy(lessons.courseId)
      : [];
    
    const enrollmentCounts = courseIds.length > 0
      ? await db.select({ courseId: enrollments.courseId, count: count() }).from(enrollments).where(sql`${enrollments.courseId} IN ${courseIds}`).groupBy(enrollments.courseId)
      : [];

    const lessonMap = new Map(lessonCounts.map(l => [l.courseId, Number(l.count)]));
    const enrollmentMap = new Map(enrollmentCounts.map(e => [e.courseId, Number(e.count)]));

    return results.map(r => ({
      ...r.courses,
      college: r.colleges || undefined,
      _count: {
        lessons: lessonMap.get(r.courses.id) || 0,
        enrollments: enrollmentMap.get(r.courses.id) || 0,
      },
    }));
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [created] = await db.insert(courses).values(course).returning();
    return created;
  }

  async updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course | undefined> {
    const [updated] = await db.update(courses).set({ ...course, updatedAt: new Date() }).where(eq(courses.id, id)).returning();
    return updated;
  }

  async deleteCourse(id: number): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  async getLessonsByCourse(courseId: number): Promise<Lesson[]> {
    return db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(lessons.orderIndex);
  }

  async getLessonById(id: number): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson;
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [created] = await db.insert(lessons).values(lesson).returning();
    return created;
  }

  async updateLesson(id: number, lesson: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const [updated] = await db.update(lessons).set(lesson).where(eq(lessons.id, id)).returning();
    return updated;
  }

  async deleteLesson(id: number): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
  }

  async getEnrollmentsByCourse(courseId: number): Promise<(Enrollment & { student: User })[]> {
    const results = await db
      .select()
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.courseId, courseId))
      .orderBy(desc(enrollments.createdAt));

    return results.map(r => ({
      ...r.enrollments,
      student: r.users,
    }));
  }

  async getEnrollmentsByStudent(studentId: string): Promise<(Enrollment & { course: CourseWithRelations })[]> {
    const results = await db
      .select()
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .leftJoin(colleges, eq(courses.collegeId, colleges.id))
      .leftJoin(users, eq(courses.teacherId, users.id))
      .where(eq(enrollments.studentId, studentId))
      .orderBy(desc(enrollments.createdAt));

    const courseIds = results.map(r => r.courses.id);
    
    const lessonCounts = courseIds.length > 0
      ? await db.select({ courseId: lessons.courseId, count: count() }).from(lessons).where(sql`${lessons.courseId} IN ${courseIds}`).groupBy(lessons.courseId)
      : [];

    const enrollmentCounts = courseIds.length > 0
      ? await db.select({ courseId: enrollments.courseId, count: count() }).from(enrollments).where(sql`${enrollments.courseId} IN ${courseIds}`).groupBy(enrollments.courseId)
      : [];

    const lessonMap = new Map(lessonCounts.map(l => [l.courseId, Number(l.count)]));
    const enrollmentMap = new Map(enrollmentCounts.map(e => [e.courseId, Number(e.count)]));

    return results.map(r => ({
      ...r.enrollments,
      course: {
        ...r.courses,
        college: r.colleges || undefined,
        teacher: r.users || undefined,
        _count: {
          lessons: lessonMap.get(r.courses.id) || 0,
          enrollments: enrollmentMap.get(r.courses.id) || 0,
        },
      },
    }));
  }

  async isEnrolled(studentId: string, courseId: number): Promise<boolean> {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)));
    return !!enrollment;
  }

  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [created] = await db.insert(enrollments).values(enrollment).returning();
    return created;
  }

  async deleteEnrollment(id: number): Promise<void> {
    await db.delete(enrollments).where(eq(enrollments.id, id));
  }

  async getCourseApprovalLogs(courseId: number): Promise<(CourseApprovalLog & { actor: User })[]> {
    const results = await db
      .select()
      .from(courseApprovalLogs)
      .innerJoin(users, eq(courseApprovalLogs.actorUserId, users.id))
      .where(eq(courseApprovalLogs.courseId, courseId))
      .orderBy(desc(courseApprovalLogs.createdAt));

    return results.map(r => ({
      ...r.course_approval_logs,
      actor: r.users,
    }));
  }

  async createCourseApprovalLog(log: InsertCourseApprovalLog): Promise<CourseApprovalLog> {
    const [created] = await db.insert(courseApprovalLogs).values(log).returning();
    return created;
  }

  async getPendingCourses(collegeId?: number): Promise<CourseWithRelations[]> {
    return this.getCourses(collegeId, "PENDING_APPROVAL");
  }

  async getTeacherStats(teacherId: string): Promise<{ totalCourses: number; totalStudents: number; publishedCourses: number }> {
    const teacherCourses = await db.select().from(courses).where(eq(courses.teacherId, teacherId));
    const courseIds = teacherCourses.map(c => c.id);
    
    const totalStudents = courseIds.length > 0
      ? (await db.select({ count: count() }).from(enrollments).where(sql`${enrollments.courseId} IN ${courseIds}`))[0]?.count || 0
      : 0;

    return {
      totalCourses: teacherCourses.length,
      totalStudents: Number(totalStudents),
      publishedCourses: teacherCourses.filter(c => c.status === "PUBLISHED").length,
    };
  }

  async getAdminStats(collegeId?: number): Promise<{ totalCourses: number; totalStudents: number; totalTeachers: number; pendingApprovals: number }> {
    let courseQuery = collegeId
      ? await db.select().from(courses).where(eq(courses.collegeId, collegeId))
      : await db.select().from(courses);

    let teacherQuery = collegeId
      ? await db.select().from(users).where(and(eq(users.role, "TEACHER"), eq(users.collegeId, collegeId)))
      : await db.select().from(users).where(eq(users.role, "TEACHER"));

    let studentQuery = collegeId
      ? await db.select().from(users).where(and(eq(users.role, "STUDENT"), eq(users.collegeId, collegeId)))
      : await db.select().from(users).where(eq(users.role, "STUDENT"));

    return {
      totalCourses: courseQuery.length,
      totalStudents: studentQuery.length,
      totalTeachers: teacherQuery.length,
      pendingApprovals: courseQuery.filter(c => c.status === "PENDING_APPROVAL").length,
    };
  }

  async getTeachersWithStats(collegeId?: number): Promise<(UserWithCollege & { _count: { courses: number; students: number } })[]> {
    let teacherQuery = collegeId
      ? await db.select().from(users).leftJoin(colleges, eq(users.collegeId, colleges.id)).where(and(eq(users.role, "TEACHER"), eq(users.collegeId, collegeId)))
      : await db.select().from(users).leftJoin(colleges, eq(users.collegeId, colleges.id)).where(eq(users.role, "TEACHER"));

    const teacherIds = teacherQuery.map(t => t.users.id);

    const courseCounts = teacherIds.length > 0
      ? await db.select({ teacherId: courses.teacherId, count: count() }).from(courses).where(sql`${courses.teacherId} IN ${teacherIds}`).groupBy(courses.teacherId)
      : [];

    const courseCountMap = new Map(courseCounts.map(c => [c.teacherId, Number(c.count)]));

    const allTeacherCourses = teacherIds.length > 0
      ? await db.select().from(courses).where(sql`${courses.teacherId} IN ${teacherIds}`)
      : [];

    const teacherStudentCounts = new Map<string, number>();
    for (const teacher of teacherQuery) {
      const teacherCourseIds = allTeacherCourses.filter(c => c.teacherId === teacher.users.id).map(c => c.id);
      if (teacherCourseIds.length > 0) {
        const enrollmentCount = await db.select({ count: count() }).from(enrollments).where(sql`${enrollments.courseId} IN ${teacherCourseIds}`);
        teacherStudentCounts.set(teacher.users.id, Number(enrollmentCount[0]?.count || 0));
      } else {
        teacherStudentCounts.set(teacher.users.id, 0);
      }
    }

    return teacherQuery.map(t => ({
      ...t.users,
      college: t.colleges || undefined,
      _count: {
        courses: courseCountMap.get(t.users.id) || 0,
        students: teacherStudentCounts.get(t.users.id) || 0,
      },
    }));
  }

  async getFeaturedProfiles(activeOnly: boolean = false): Promise<FeaturedProfile[]> {
    if (activeOnly) {
      return db.select().from(featuredProfiles)
        .where(eq(featuredProfiles.isActive, true))
        .orderBy(featuredProfiles.sortOrder);
    }
    return db.select().from(featuredProfiles).orderBy(featuredProfiles.sortOrder);
  }

  async getFeaturedProfileById(id: number): Promise<FeaturedProfile | undefined> {
    const [profile] = await db.select().from(featuredProfiles).where(eq(featuredProfiles.id, id));
    return profile;
  }

  async createFeaturedProfile(profile: InsertFeaturedProfile): Promise<FeaturedProfile> {
    const [created] = await db.insert(featuredProfiles).values(profile).returning();
    return created;
  }

  async updateFeaturedProfile(id: number, profile: Partial<InsertFeaturedProfile>): Promise<FeaturedProfile | undefined> {
    const [updated] = await db.update(featuredProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(featuredProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteFeaturedProfile(id: number): Promise<void> {
    await db.delete(featuredProfiles).where(eq(featuredProfiles.id, id));
  }

  async getHomeStats(): Promise<HomeStats | undefined> {
    const [stats] = await db.select().from(homeStats).limit(1);
    return stats;
  }

  async getOrCreateHomeStats(): Promise<HomeStats> {
    const existing = await this.getHomeStats();
    if (existing) return existing;
    const [created] = await db.insert(homeStats).values({}).returning();
    return created;
  }

  async updateHomeStats(data: UpdateHomeStats, userId: string): Promise<HomeStats> {
    const existing = await this.getOrCreateHomeStats();
    const [updated] = await db
      .update(homeStats)
      .set({ ...data, updatedAt: new Date(), updatedByUserId: userId })
      .where(eq(homeStats.id, existing.id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
