import { Hono } from "hono";
import crypto from "node:crypto";
import { getCookie, setCookie } from "hono/cookie";

const app = new Hono();

let sessionToken: string | undefined;

// GET /api/auth/check
app.get("/check", async (c) => {
  const token = getCookie(c, "rp_session");
  if (!token || !sessionToken || token !== sessionToken) {
    return c.json({ authenticated: false }, 401);
  }
  return c.json({ authenticated: true });
});

// POST /api/auth/login
app.post("/login", async (c) => {
  try {
    const { username, password } = await c.req.json();
    const validUsername = process.env.AUTH_USERNAME || "admin";
    const validPassword = process.env.AUTH_PASSWORD || "admin";

    if (username !== validUsername || password !== validPassword) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessionToken = token;

    setCookie(c, "rp_session", token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES === "true",
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return c.json({ error: "Login failed" }, 500);
  }
});

// POST /api/auth/logout
app.post("/logout", async (c) => {
  sessionToken = undefined;
  setCookie(c, "rp_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
  return c.json({ success: true });
});

export default app;
