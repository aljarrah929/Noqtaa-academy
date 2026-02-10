import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth, seedSuperAdmin } from "./auth"; // أضفنا استيراد seedSuperAdmin
import { serveStatic } from "./static";
import { createServer } from "http";
import { verifyEmailConnection } from "./email";
import { ensureUniversitiesAndCollegesExist } from "./db-init";

const app = express();

// Trust proxy for production (Replit proxy) - MUST be before any middleware
app.set("trust proxy", 1);

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  // 1. تأكد من وجود البيانات الأساسية (الكليات)
  await ensureUniversitiesAndCollegesExist();

  // 2. تفعيل الصلاحيات والجلسات
  await setupAuth(app); 

  // 3. إنشاء حساب السوبر أدمن تلقائياً (الخطوة الناقصة)
  // هذه الدالة ستفحص قاعدة البيانات: إذا الحساب مش موجود بتعمله فوراً
  try {
    await seedSuperAdmin();
    log("Super Admin seeding process completed");
  } catch (error) {
    log(`Seeding error: ${error}`);
  }

  // 4. تسجيل المسارات
  const httpServer = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, async () => {
    log(`serving on port ${port}`);
    await verifyEmailConnection();
  });
})();