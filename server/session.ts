import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

const isProduction = process.env.NODE_ENV === "production";

export const sessionMiddleware = session({
store: new MemoryStore({
checkPeriod: 86400000, 
}),
secret: process.env.SESSION_SECRET || "pharmd-ai-secret-key-change-in-production",
resave: false,
saveUninitialized: false,
cookie: {
maxAge: 30 * 24 * 60 * 60 * 1000, 
httpOnly: true,

secure: isProduction, 

sameSite: isProduction ? "none" : "lax", 
},

proxy: isProduction, 
});

declare module "express-session" {
interface SessionData {
userId: string;
}
}