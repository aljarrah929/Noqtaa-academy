export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function getRoleDisplayName(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Admin";
    case "TEACHER":
      return "Teacher";
    case "STUDENT":
      return "Student";
    default:
      return role;
  }
}

export function canAccessAdminDashboard(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canAccessTeacherDashboard(role: string): boolean {
  return role === "TEACHER" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageRoles(role: string): boolean {
  return role === "SUPER_ADMIN";
}

export function canManageColleges(role: string): boolean {
  return role === "SUPER_ADMIN";
}

export function canApproveCourses(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canEnrollStudents(role: string, courseTeacherId: string, userId: string): boolean {
  return courseTeacherId === userId || role === "SUPER_ADMIN";
}
