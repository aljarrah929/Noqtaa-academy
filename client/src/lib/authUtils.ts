export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function isExternalDevWindow(): boolean {
  const hostname = window.location.hostname;
  const isReplit = hostname.includes('replit') || hostname.includes('repl.co');
  const isPreview = hostname.includes('.replit.dev') || hostname.includes('.repl.co');
  const isPublished = hostname.includes('.replit.app');
  
  if (!isReplit) {
    return false;
  }
  
  return !isPreview && !isPublished;
}

export function getPreviewUrl(): string {
  const hostname = window.location.hostname;
  
  if (hostname.includes('.replit.dev')) {
    return window.location.href;
  }
  
  const replId = hostname.split('.')[0];
  return `https://${replId}.replit.dev${window.location.pathname}`;
}

export function isDevelopmentMode(): boolean {
  return window.location.hostname.includes('.replit.dev') || 
         window.location.hostname.includes('.repl.co') ||
         window.location.hostname === 'localhost';
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
