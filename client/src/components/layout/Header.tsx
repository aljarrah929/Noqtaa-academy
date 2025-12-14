import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GraduationCap, Moon, Sun, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { getRoleDisplayName } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { BRAND_NAME } from "@/lib/branding";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isDark, toggleDark, collegeTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/courses", label: "Courses" },
  ];

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    switch (user.role) {
      case "SUPER_ADMIN":
        return "/admin";
      case "ADMIN":
        return "/admin";
      case "TEACHER":
        return "/teacher";
      default:
        return "/dashboard";
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last) || user.email?.[0]?.toUpperCase() || "U";
  };

  const headerStyle = collegeTheme && user?.role === "STUDENT" ? {
    backgroundColor: collegeTheme.primaryColor,
  } : undefined;

  const isCollegeThemed = collegeTheme && user?.role === "STUDENT";

  return (
    <header 
      className={`sticky top-0 z-50 border-b ${isCollegeThemed ? 'border-white/20' : 'border-border bg-background'}`}
      style={headerStyle}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${isCollegeThemed ? 'bg-white/20' : 'bg-primary/10'}`}>
              <img 
                src="/brand/cpe-icon.png" 
                alt="CPE" 
                className="h-7 w-auto object-contain"
                data-testid="img-brand-icon"
              />
            </div>
            <span className={`font-semibold text-lg hidden sm:block ${isCollegeThemed ? 'text-white' : 'text-foreground'}`} data-testid="text-logo">
              {BRAND_NAME}
            </span>
            {collegeTheme && user?.role === "STUDENT" && (
              <Badge variant="secondary" className="ml-2 hidden md:flex bg-white/20 text-white border-white/30">
                {collegeTheme.name}
              </Badge>
            )}
          </Link>

          <div className="flex items-center justify-end gap-1 flex-1">
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant="ghost"
                    className={`${isCollegeThemed ? 'text-white/90 hover:text-white hover:bg-white/10' : ''} ${
                      location === link.href ? (isCollegeThemed ? 'bg-white/20 text-white' : 'bg-accent') : ''
                    }`}
                    data-testid={`link-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              {isAuthenticated && (
                <Link href={getDashboardLink()}>
                  <Button
                    variant="ghost"
                    className={`${isCollegeThemed ? 'text-white/90 hover:text-white hover:bg-white/10' : ''} ${
                      location.startsWith("/dashboard") || location.startsWith("/teacher") || location.startsWith("/admin") 
                        ? (isCollegeThemed ? 'bg-white/20 text-white' : 'bg-accent') : ''
                    }`}
                    data-testid="link-dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-1" />
                    Dashboard
                  </Button>
                </Link>
              )}
            </nav>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDark}
              className={`hidden md:flex ${isCollegeThemed ? 'text-white hover:bg-white/10' : ''}`}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {isLoading ? (
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" data-testid="button-user-menu">
                    <Avatar className="h-9 w-9 border-2 border-white/30">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} className="object-cover" />
                      <AvatarFallback className={isCollegeThemed ? 'bg-white/20 text-white' : ''}>
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none" data-testid="text-username">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <Badge variant="outline" className="w-fit mt-2">
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()} className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer text-destructive" 
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button 
                  className={isCollegeThemed ? 'bg-white text-gray-900 hover:bg-white/90' : ''} 
                  data-testid="button-login"
                >
                  Log in
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={`md:hidden ${isCollegeThemed ? 'text-white hover:bg-white/10' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${isCollegeThemed ? 'text-white/90 hover:text-white hover:bg-white/10' : ''}`}
                    data-testid={`link-mobile-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              {isAuthenticated && (
                <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${isCollegeThemed ? 'text-white/90 hover:text-white hover:bg-white/10' : ''}`}
                    data-testid="link-mobile-dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                onClick={toggleDark}
                className={`w-full justify-start ${isCollegeThemed ? 'text-white/90 hover:text-white hover:bg-white/10' : ''}`}
                data-testid="button-mobile-theme-toggle"
              >
                {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {isDark ? "Light Mode" : "Dark Mode"}
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
