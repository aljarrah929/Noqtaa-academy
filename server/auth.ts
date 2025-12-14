import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { signupSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const college = await storage.getCollegeById(data.collegeId);
      if (!college) {
        return res.status(400).json({ message: "Invalid college selected" });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      
      const user = await storage.createUserWithPassword({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        collegeId: data.collegeId,
        role: "STUDENT",
      });

      req.session.userId = user.id;
      
      const userWithCollege = await storage.getUserWithCollege(user.id);
      res.status(201).json(userWithCollege);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(data.password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account is disabled" });
      }

      req.session.userId = user.id;
      
      const userWithCollege = await storage.getUserWithCollege(user.id);
      res.json(userWithCollege);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUserWithCollege(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = user;
  next();
};

export const requireRole = (...roles: string[]): RequestHandler => {
  return async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    (req as any).user = user;
    next();
  };
};

export async function seedSuperAdmin() {
  const email = "cpeacademy5@gmail.com";
  const existingUser = await storage.getUserByEmail(email);
  const passwordHash = await bcrypt.hash("admin123", 10);
  
  if (existingUser) {
    let updated = false;
    if (existingUser.role !== "SUPER_ADMIN") {
      await storage.updateUserRole(existingUser.id, "SUPER_ADMIN");
      updated = true;
    }
    if (!existingUser.passwordHash) {
      await storage.updateUserPassword(existingUser.id, passwordHash);
      updated = true;
    }
    if (updated) {
      console.log("Updated existing user to SUPER_ADMIN with password:", email);
    }
    return;
  }

  await storage.createUserWithPassword({
    email,
    passwordHash,
    firstName: "Super",
    lastName: "Admin",
    collegeId: 1,
    role: "SUPER_ADMIN",
  });
  console.log("Created SUPER_ADMIN user:", email);
}
