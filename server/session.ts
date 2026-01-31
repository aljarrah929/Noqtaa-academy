import session from "express-session";
import createMemoryStore from "memorystore";
import { type Express } from "express";

const MemoryStore = createMemoryStore(session);
const isProduction = process.env.NODE_ENV === "production";

export function setupSession(app: Express) {
  const sessionConfig: session.SessionOptions = {
    store: new MemoryStore({
      checkPeriod: 86400000, // مسح الجلسات المنتهية كل 24 ساعة
    }),
    secret: process.env.SESSION_SECRET || "a-very-strong-secret", // يفضل وضع قيمة في Secrets Replit
    resave: false,
    saveUninitialized: false,
    proxy: isProduction, // ضروري جداً لـ Replit عند النشر
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 يوم
      httpOnly: true,
      secure: isProduction, // يعمل فقط على HTTPS في الإنتاج
      sameSite: isProduction ? "none" : "lax", // الإصلاح السحري الذي عملناه سابقاً
    },
  };

  app.use(session(sessionConfig));
}