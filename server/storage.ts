import {
  users,
  universities,
  colleges,
  majors,
  courses,
  lessons,
  enrollments,
  courseApprovalLogs,
  featuredProfiles,
  homeStats,
  adminDashboardStatsConfig,
  passwordResetTokens,
  joinRequests,
  type User,
  type UpsertUser,
  type University,
  type InsertUniversity,
  type College,
  type InsertCollege,
  type Major,
  type InsertMajor,
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
  type AdminDashboardStatsConfig,
  type UpdateAdminDashboardStatsConfig,
  type PasswordResetToken,
  type JoinRequest,
  type InsertJoinRequest,
  type JoinRequestWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, or, ilike, isNull } from "drizzle-orm";

// College code mapping for public IDs
const COLLEGE_CODES: Record<string, string> = {
  pharmacy: "PH",
  engineering: "EN",
  it: "IT",
};

// Generate a public ID in the format XXNNNNNN (e.g., PH123456)
export async function generatePublicId(collegeId: number | null): Promise<string> {
  // Get college code
  let collegeCode = "XX"; // Default for unknown/null college
  if (collegeId) {
    const college = await db.select().from(colleges).where(eq(colleges.id, collegeId)).limit(1);
    if (college[0]?.slug) {
      collegeCode = COLLEGE_CODES[college[0].slug] || "XX";
    }
  }
  
  // Generate unique 6-digit number
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    const publicId = `${collegeCode}${randomNum}`;
    
    // Check for uniqueness
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.publicId, publicId))
      .limit(1);
    
    if (existing.length === 0) {
      return publicId;
    }
    attempts++;
  }
  
  throw new Error("Failed to generate unique public ID after maximum attempts");
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPublicId(publicId: string): Promise<User | undefined>;
  searchUsers(query: string, searcherRole: User["role"], limit?: number): Promise<UserWithCollege[]>;
  createUserWithPassword(data: { email: string; passwordHash: string; firstName: string; lastName: string; phoneNumber?: string; universityId: number; collegeId: number; majorId: number; role?: User["role"] }): Promise<User>;
  migrateUsersWithoutPublicId(): Promise<number>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserWithCollege(id: string): Promise<UserWithCollege | undefined>;
  updateUserRole(id: string, role: User["role"], collegeId?: number | null): Promise<User | undefined>;
  updateUserCollege(id: string, collegeId: number): Promise<User | undefined>;
  updateUserPath(id: string, universityId: number, collegeId: number, majorId: number): Promise<User | undefined>;
  getUniversities(): Promise<University[]>;
  getUniversityById(id: number): Promise<University | undefined>;
  createUniversity(university: InsertUniversity): Promise<University>;
  updateUniversity(id: number, university: Partial<InsertUniversity>): Promise<University | undefined>;
  deleteUniversity(id: number): Promise<void>;
  getCollegesByUniversity(universityId: number): Promise<College[]>;
  getMajors(collegeId?: number, universityId?: number): Promise<Major[]>;
  getMajorById(id: number): Promise<Major | undefined>;
  createMajor(major: InsertMajor): Promise<Major>;
  updateMajor(id: number, major: Partial<InsertMajor>): Promise<Major | undefined>;
  deleteMajor(id: number): Promise<void>;
  updateUserPassword(id: string, passwordHash: string): Promise<User | undefined>;
  updatePasswordResetLastSentAt(id: string): Promise<User | undefined>;
  setLoginOtp(id: string, otp: string, expiry: Date): Promise<void>;
  clearLoginOtp(id: string): Promise<void>;
  updateUserProfileImage(id: string, profileImageUrl: string): Promise<User | undefined>;
  updateUserPhoneNumber(id: string, phoneNumber: string): Promise<User | undefined>;
  getAllUsers(): Promise<UserWithCollege[]>;
  getColleges(): Promise<College[]>;
  getCollegeById(id: number): Promise<College | undefined>;
  getCollegeBySlug(slug: string): Promise<College | undefined>;
  createCollege(college: InsertCollege): Promise<College>;
  updateCollege(id: number, college: Partial<InsertCollege>): Promise<College | undefined>;
  deleteCollege(id: number): Promise<void>;
  getCourses(collegeId?: number, status?: Course["status"], majorId?: number, universityId?: number): Promise<CourseWithRelations[]>;
  getCourseById(id: number): Promise<CourseWithRelations | undefined>;
  getCoursesByTeacher(teacherId: string): Promise<CourseWithRelations[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, course: Partial<InsertCourse>): Promise<Course | undefined>;
  updateCourseLockStatus(id: number, isLocked: boolean): Promise<Course | undefined>;
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
  deleteEnrollmentByStudentAndCourse(studentId: string, courseId: number): Promise<void>;
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
  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  invalidateUserPasswordResetTokens(userId: string): Promise<void>;
  getAdminDashboardStatsConfig(): Promise<AdminDashboardStatsConfig | undefined>;
  getOrCreateAdminDashboardStatsConfig(): Promise<AdminDashboardStatsConfig>;
  updateAdminDashboardStatsConfig(data: UpdateAdminDashboardStatsConfig, userId: string): Promise<AdminDashboardStatsConfig>;
  createJoinRequest(data: InsertJoinRequest): Promise<JoinRequest>;
  getJoinRequestById(id: number): Promise<JoinRequestWithRelations | undefined>;
  getJoinRequestsByCourse(courseId: number): Promise<JoinRequestWithRelations[]>;
  getJoinRequestsByTeacher(teacherId: string): Promise<JoinRequestWithRelations[]>;
  getStudentJoinRequestForCourse(studentId: string, courseId: number): Promise<JoinRequest | undefined>;
  hasPendingJoinRequest(studentId: string, courseId: number): Promise<boolean>;
  hasApprovedJoinRequest(studentId: string, courseId: number): Promise<boolean>;
  updateJoinRequestStatus(id: number, status: JoinRequest["status"]): Promise<JoinRequest | undefined>;
  getTeacherCourses(teacherId: string): Promise<{ id: number; title: string; price: number; status: string; studentsCount: number }[]>;
  getTeacherStudents(teacherId: string): Promise<{ studentId: string; name: string; email: string; phone: string; courseName: string }[]>;
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

  async createUserWithPassword(data: { email: string; passwordHash: string; firstName: string; lastName: string; phoneNumber?: string; universityId: number; collegeId: number; majorId: number; role?: User["role"] }): Promise<User> {
    const publicId = await generatePublicId(data.collegeId);
    
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber || null,
      universityId: data.universityId,
      collegeId: data.collegeId,
      majorId: data.majorId,
      role: data.role || "STUDENT",
      publicId,
    }).returning();
    return user;
  }

  async getUserByPublicId(publicId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.publicId, publicId)).limit(1);
    return result[0];
  }

  async searchUsers(query: string, searcherRole: User["role"], limit: number = 5): Promise<UserWithCollege[]> {
    // Check if query is a public ID format (e.g., PH123456)
    const publicIdPattern = /^[A-Z]{2}\d{6}$/;
    const isPublicIdSearch = publicIdPattern.test(query.toUpperCase());
    
    // Teachers can only search for students
    const roleFilter = searcherRole === "TEACHER" 
      ? eq(users.role, "STUDENT")
      : undefined;
    
    let results;
    
    if (isPublicIdSearch) {
      // Search by exact public ID
      const conditions = roleFilter 
        ? and(eq(users.publicId, query.toUpperCase()), roleFilter)
        : eq(users.publicId, query.toUpperCase());
      
      results = await db.select().from(users)
        .leftJoin(colleges, eq(users.collegeId, colleges.id))
        .where(conditions)
        .limit(limit);
    } else {
      // Search by email or name (case-insensitive)
      const searchPattern = `%${query}%`;
      const searchCondition = or(
        ilike(users.email, searchPattern),
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern)
      );
      
      const conditions = roleFilter 
        ? and(searchCondition, roleFilter)
        : searchCondition;
      
      results = await db.select().from(users)
        .leftJoin(colleges, eq(users.collegeId, colleges.id))
        .where(conditions)
        .limit(limit);
    }
    
    return results.map(row => ({
      ...row.users,
      college: row.colleges || undefined,
    }));
  }

  async migrateUsersWithoutPublicId(): Promise<number> {
    // Get all users without a public ID
    const usersWithoutId = await db.select()
      .from(users)
      .where(isNull(users.publicId));
    
    let migrated = 0;
    
    for (const user of usersWithoutId) {
      const publicId = await generatePublicId(user.collegeId);
      await db.update(users)
        .set({ publicId })
        .where(eq(users.id, user.id));
      migrated++;
    }
    
    return migrated;
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
      .leftJoin(universities, eq(users.universityId, universities.id))
      .leftJoin(colleges, eq(users.collegeId, colleges.id))
      .leftJoin(majors, eq(users.majorId, majors.id))
      .where(eq(users.id, id));
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].users,
      university: result[0].universities || undefined,
      college: result[0].colleges || undefined,
      major: result[0].majors || undefined,
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

  async updateUserPath(id: string, universityId: number, collegeId: number, majorId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ universityId, collegeId, majorId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUniversities(): Promise<University[]> {
    return db.select().from(universities).orderBy(universities.name);
  }

  async getUniversityById(id: number): Promise<University | undefined> {
    const [university] = await db.select().from(universities).where(eq(universities.id, id));
    return university;
  }

  async createUniversity(university: InsertUniversity): Promise<University> {
    const [created] = await db.insert(universities).values(university).returning();
    return created;
  }

  async updateUniversity(id: number, university: Partial<InsertUniversity>): Promise<University | undefined> {
    const [updated] = await db.update(universities).set(university).where(eq(universities.id, id)).returning();
    return updated;
  }

  async deleteUniversity(id: number): Promise<void> {
    await db.delete(universities).where(eq(universities.id, id));
  }

  async getCollegesByUniversity(universityId: number): Promise<College[]> {
    return db.select().from(colleges).where(eq(colleges.universityId, universityId)).orderBy(colleges.name);
  }

  async getMajors(collegeId?: number, universityId?: number): Promise<Major[]> {
    if (collegeId) {
      return db.select().from(majors).where(eq(majors.collegeId, collegeId)).orderBy(majors.name);
    }
    if (universityId) {
      const result = await db
        .select({ majors })
        .from(majors)
        .innerJoin(colleges, eq(majors.collegeId, colleges.id))
        .where(eq(colleges.universityId, universityId))
        .orderBy(majors.name);
      return result.map(r => r.majors);
    }
    return db.select().from(majors).orderBy(majors.name);
  }

  async getMajorById(id: number): Promise<Major | undefined> {
    const [major] = await db.select().from(majors).where(eq(majors.id, id));
    return major;
  }

  async createMajor(major: InsertMajor): Promise<Major> {
    const [created] = await db.insert(majors).values(major).returning();
    return created;
  }

  async updateMajor(id: number, major: Partial<InsertMajor>): Promise<Major | undefined> {
    const [updated] = await db.update(majors).set(major).where(eq(majors.id, id)).returning();
    return updated;
  }

  async deleteMajor(id: number): Promise<void> {
    await db.delete(majors).where(eq(majors.id, id));
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updatePasswordResetLastSentAt(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordResetLastSentAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async setLoginOtp(id: string, otp: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ loginOtp: otp, loginOtpExpiry: expiry })
      .where(eq(users.id, id));
  }

  async clearLoginOtp(id: string): Promise<void> {
    await db
      .update(users)
      .set({ loginOtp: null, loginOtpExpiry: null })
      .where(eq(users.id, id));
  }

  async updateUserProfileImage(id: string, profileImageUrl: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ profileImageUrl, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPhoneNumber(id: string, phoneNumber: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ phoneNumber, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<UserWithCollege[]> {
    const result = await db
      .select()
      .from(users)
      .leftJoin(universities, eq(users.universityId, universities.id))
      .leftJoin(colleges, eq(users.collegeId, colleges.id))
      .leftJoin(majors, eq(users.majorId, majors.id))
      .orderBy(desc(users.createdAt));
    
    return result.map(r => ({
      ...r.users,
      university: r.universities || undefined,
      college: r.colleges || undefined,
      major: r.majors || undefined,
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

  async getCourses(collegeId?: number, status?: Course["status"], majorId?: number, universityId?: number): Promise<CourseWithRelations[]> {
    const results = await db
      .select()
      .from(courses)
      .leftJoin(colleges, eq(courses.collegeId, colleges.id))
      .leftJoin(majors, eq(courses.majorId, majors.id))
      .leftJoin(users, eq(courses.teacherId, users.id))
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

    let filtered = results;
    if (collegeId) {
      filtered = filtered.filter(r => r.courses.collegeId === collegeId);
    }
    if (majorId) {
      filtered = filtered.filter(r => r.courses.majorId === majorId);
    }
    if (universityId) {
      filtered = filtered.filter(r => r.colleges?.universityId === universityId);
    }
    if (status) {
      filtered = filtered.filter(r => r.courses.status === status);
    }

    return filtered.map(r => ({
      ...r.courses,
      college: r.colleges || undefined,
      major: r.majors || undefined,
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
      .leftJoin(majors, eq(courses.majorId, majors.id))
      .leftJoin(users, eq(courses.teacherId, users.id))
      .where(eq(courses.id, id));

    if (result.length === 0) return undefined;

    const lessonList = await db.select().from(lessons).where(eq(lessons.courseId, id)).orderBy(lessons.orderIndex);
    const enrollmentList = await db.select().from(enrollments).where(eq(enrollments.courseId, id));

    return {
      ...result[0].courses,
      college: result[0].colleges || undefined,
      major: result[0].majors || undefined,
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
      .leftJoin(majors, eq(courses.majorId, majors.id))
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
      major: r.majors || undefined,
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

  async updateCourseLockStatus(id: number, isLocked: boolean): Promise<Course | undefined> {
    const [updated] = await db.update(courses).set({ isLocked, updatedAt: new Date() }).where(eq(courses.id, id)).returning();
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

  async deleteEnrollmentByStudentAndCourse(studentId: string, courseId: number): Promise<void> {
    await db.delete(enrollments).where(
      and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId))
    );
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

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt,
    }).returning();
    return token;
  }

  async getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined> {
    const [token] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
    return token;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens).where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  async invalidateUserPasswordResetTokens(userId: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  }

  async getAdminDashboardStatsConfig(): Promise<AdminDashboardStatsConfig | undefined> {
    const [config] = await db.select().from(adminDashboardStatsConfig).limit(1);
    return config;
  }

  async getOrCreateAdminDashboardStatsConfig(): Promise<AdminDashboardStatsConfig> {
    const existing = await this.getAdminDashboardStatsConfig();
    if (existing) return existing;
    const [created] = await db.insert(adminDashboardStatsConfig).values({}).returning();
    return created;
  }

  async updateAdminDashboardStatsConfig(data: UpdateAdminDashboardStatsConfig, userId: string): Promise<AdminDashboardStatsConfig> {
    const existing = await this.getOrCreateAdminDashboardStatsConfig();
    const [updated] = await db
      .update(adminDashboardStatsConfig)
      .set({ ...data, updatedAt: new Date(), updatedByUserId: userId })
      .where(eq(adminDashboardStatsConfig.id, existing.id))
      .returning();
    return updated;
  }

  async createJoinRequest(data: InsertJoinRequest): Promise<JoinRequest> {
    const [joinRequest] = await db.insert(joinRequests).values(data).returning();
    return joinRequest;
  }

  async getJoinRequestById(id: number): Promise<JoinRequestWithRelations | undefined> {
    const result = await db
      .select()
      .from(joinRequests)
      .leftJoin(users, eq(joinRequests.studentId, users.id))
      .leftJoin(colleges, eq(users.collegeId, colleges.id))
      .leftJoin(courses, eq(joinRequests.courseId, courses.id))
      .where(eq(joinRequests.id, id))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0].join_requests,
      student: result[0].users ? { ...result[0].users, college: result[0].colleges || undefined } : undefined,
      course: result[0].courses || undefined,
    };
  }

  async getJoinRequestsByCourse(courseId: number): Promise<JoinRequestWithRelations[]> {
    const result = await db
      .select()
      .from(joinRequests)
      .leftJoin(users, eq(joinRequests.studentId, users.id))
      .leftJoin(colleges, eq(users.collegeId, colleges.id))
      .leftJoin(courses, eq(joinRequests.courseId, courses.id))
      .where(eq(joinRequests.courseId, courseId))
      .orderBy(desc(joinRequests.createdAt));
    
    return result.map(row => ({
      ...row.join_requests,
      student: row.users ? { ...row.users, college: row.colleges || undefined } : undefined,
      course: row.courses || undefined,
    }));
  }

  async getJoinRequestsByTeacher(teacherId: string): Promise<JoinRequestWithRelations[]> {
    const result = await db
      .select()
      .from(joinRequests)
      .innerJoin(courses, eq(joinRequests.courseId, courses.id))
      .leftJoin(users, eq(joinRequests.studentId, users.id))
      .leftJoin(colleges, eq(users.collegeId, colleges.id))
      .where(eq(courses.teacherId, teacherId))
      .orderBy(desc(joinRequests.createdAt));
    
    return result.map(row => ({
      ...row.join_requests,
      student: row.users ? { ...row.users, college: row.colleges || undefined } : undefined,
      course: row.courses || undefined,
    }));
  }

  async getStudentJoinRequestForCourse(studentId: string, courseId: number): Promise<JoinRequest | undefined> {
    const [request] = await db
      .select()
      .from(joinRequests)
      .where(and(eq(joinRequests.studentId, studentId), eq(joinRequests.courseId, courseId)))
      .orderBy(desc(joinRequests.createdAt))
      .limit(1);
    return request;
  }

  async hasPendingJoinRequest(studentId: string, courseId: number): Promise<boolean> {
    const [request] = await db
      .select({ id: joinRequests.id })
      .from(joinRequests)
      .where(and(
        eq(joinRequests.studentId, studentId),
        eq(joinRequests.courseId, courseId),
        eq(joinRequests.status, "PENDING")
      ))
      .limit(1);
    return !!request;
  }

  async hasApprovedJoinRequest(studentId: string, courseId: number): Promise<boolean> {
    const [request] = await db
      .select({ id: joinRequests.id })
      .from(joinRequests)
      .where(and(
        eq(joinRequests.studentId, studentId),
        eq(joinRequests.courseId, courseId),
        eq(joinRequests.status, "APPROVED")
      ))
      .limit(1);
    return !!request;
  }

  async updateJoinRequestStatus(id: number, status: JoinRequest["status"]): Promise<JoinRequest | undefined> {
    const [updated] = await db
      .update(joinRequests)
      .set({ status, reviewedAt: new Date() })
      .where(eq(joinRequests.id, id))
      .returning();
    return updated;
  }

  async getTeacherCourses(teacherId: string): Promise<{ id: number; title: string; price: number; status: string; studentsCount: number }[]> {
    const teacherCourses = await db.select().from(courses).where(eq(courses.teacherId, teacherId));
    const result = [];
    for (const course of teacherCourses) {
      const [{ count: enrollCount }] = await db.select({ count: sql`count(*)::int` }).from(enrollments).where(eq(enrollments.courseId, course.id));
      result.push({
        id: course.id,
        title: course.title,
        price: course.price,
        status: course.status,
        studentsCount: (enrollCount as number) || 0,
      });
    }
    return result;
  }

  async getTeacherStudents(teacherId: string): Promise<{ studentId: string; name: string; email: string; phone: string; courseName: string }[]> {
    const teacherCourses = await db.select().from(courses).where(eq(courses.teacherId, teacherId));
    const courseMap = new Map(teacherCourses.map(c => [c.id, c.title]));
    const courseIds = teacherCourses.map(c => c.id);
    if (courseIds.length === 0) return [];
    const enrollmentRows = await db.select({
      studentId: enrollments.studentId,
      courseId: enrollments.courseId,
    }).from(enrollments).where(sql`${enrollments.courseId} IN ${courseIds}`);
    const seenKey = new Set<string>();
    const uniqueEntries: { studentId: string; courseId: number }[] = [];
    for (const e of enrollmentRows) {
      const key = `${e.studentId}-${e.courseId}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        uniqueEntries.push(e);
      }
    }
    const studentIds = [...new Set(uniqueEntries.map(e => e.studentId))];
    const students = studentIds.length > 0
      ? await db.select().from(users).where(sql`${users.id} IN ${studentIds}`)
      : [];
    const studentMap = new Map(students.map(s => [s.id, s]));
    return uniqueEntries.map(e => {
      const student = studentMap.get(e.studentId);
      return {
        studentId: e.studentId,
        name: student ? `${student.firstName || ""} ${student.lastName || ""}`.trim() : "Unknown",
        email: student?.email || "",
        phone: student?.phoneNumber || "",
        courseName: courseMap.get(e.courseId) || "Unknown",
      };
    });
  }
}

export const storage = new DatabaseStorage();
