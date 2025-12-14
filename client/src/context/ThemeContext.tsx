import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { College } from "@shared/schema";

interface ThemeContextType {
  collegeTheme: College | null;
  setCollegeTheme: (college: College | null) => void;
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [collegeTheme, setCollegeTheme] = useState<College | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    if (collegeTheme) {
      root.style.setProperty("--college-primary", collegeTheme.primaryColor);
      root.style.setProperty("--college-secondary", collegeTheme.secondaryColor);
    } else {
      root.style.removeProperty("--college-primary");
      root.style.removeProperty("--college-secondary");
    }
  }, [collegeTheme]);

  const toggleDark = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ collegeTheme, setCollegeTheme, isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
