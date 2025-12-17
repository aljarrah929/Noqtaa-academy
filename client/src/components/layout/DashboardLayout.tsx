import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  GraduationCap,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  FileCheck,
  Building2,
  UserCog,
  BarChart3,
  Star,
  Video,
  FileUp,
} from "lucide-react";
import { getRoleDisplayName, canAccessAdminDashboard, canAccessTeacherDashboard, canManageColleges, canManageRoles } from "@/lib/authUtils";
import { BRAND_NAME } from "@/lib/branding";
import cpeIconUrl from "@assets/Untitled_(1)_1765745611438.png";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const { isDark, toggleDark, collegeTheme } = useTheme();
  const [location, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
  });

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logoutMutation.mutate();
  };

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last) || user.email?.[0]?.toUpperCase() || "U";
  };

  const studentMenuItems = [
    { href: "/dashboard", label: "My Courses", icon: BookOpen },
  ];

  const teacherMenuItems = [
    { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/courses", label: "My Courses", icon: BookOpen },
    { href: "/teacher/upload-video", label: "Upload Videos", icon: Video },
    { href: "/teacher/upload-file", label: "Add File", icon: FileUp },
  ];

  const adminMenuItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/approvals", label: "Approvals", icon: FileCheck },
    { href: "/admin/teachers", label: "Teachers", icon: Users },
  ];

  const superAdminMenuItems = [
    { href: "/admin/users", label: "User Management", icon: UserCog },
    { href: "/admin/colleges", label: "Colleges", icon: Building2 },
    { href: "/admin/featured-profiles", label: "Featured Profiles", icon: Star },
    { href: "/admin/home-stats", label: "Home Stats", icon: BarChart3 },
  ];

  const getMenuItems = () => {
    if (!user) return [];
    
    const items = [];
    
    if (user.role === "STUDENT") {
      items.push({ group: "Student", items: studentMenuItems });
    }
    
    if (canAccessTeacherDashboard(user.role)) {
      items.push({ group: "Teacher", items: teacherMenuItems });
    }
    
    if (canAccessAdminDashboard(user.role)) {
      items.push({ group: "Admin", items: adminMenuItems });
    }
    
    if (canManageRoles(user.role) || canManageColleges(user.role)) {
      items.push({ group: "Super Admin", items: superAdminMenuItems });
    }
    
    return items;
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 flex items-center justify-center" style={{ width: '32px', height: '32px' }}>
                <img 
                  src={cpeIconUrl} 
                  alt="CPE" 
                  className="h-6 w-auto object-contain"
                  data-testid="img-sidebar-brand-icon"
                />
              </div>
              <span className="font-semibold">{BRAND_NAME}</span>
            </Link>
            {collegeTheme && user?.role === "STUDENT" && (
              <Badge variant="outline" className="mt-2 w-fit">
                {collegeTheme.name}
              </Badge>
            )}
          </SidebarHeader>
          
          <SidebarContent>
            {getMenuItems().map((group) => (
              <SidebarGroup key={group.group}>
                <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.href || (item.href !== "/dashboard" && item.href !== "/teacher" && item.href !== "/admin" && location.startsWith(item.href))}
                        >
                          <Link href={item.href} data-testid={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} className="object-cover" />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid="sidebar-username">
                  {user?.firstName} {user?.lastName}
                </p>
                <Badge variant="secondary" className="text-xs mt-1">
                  {getRoleDisplayName(user?.role || "")}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={toggleDark} data-testid="sidebar-theme-toggle">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="sidebar-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background h-16">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              {title && (
                <h1 className="text-xl font-semibold" data-testid="text-page-title">{title}</h1>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
