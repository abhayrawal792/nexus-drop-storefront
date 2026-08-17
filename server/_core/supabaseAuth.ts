import type { Express, Request, Response } from "express";
import { supabase } from "../supabase";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
}

export function registerSupabaseAuthRoutes(app: Express) {
  app.post("/api/auth/supabase-session", async (req: Request, res: Response) => {
    const accessToken = getBearerToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Supabase access token is required" });
      return;
    }

    try {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error || !data.user?.email) {
        res.status(401).json({ error: "Invalid Supabase session" });
        return;
      }

      const email = data.user.email.trim().toLowerCase();
      const metadata = data.user.user_metadata ?? {};
      const displayName =
        (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
        (typeof metadata.name === "string" && metadata.name.trim()) ||
        email.split("@")[0];
      const openId = `supabase_${data.user.id}`;

      await db.upsertUser({
        openId,
        name: displayName,
        email,
        loginMethod: "supabase_email_otp",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: displayName,
        expiresInMs: ONE_YEAR_MS,
      });

      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error("[Supabase Auth] Session exchange failed", error);
      res.status(500).json({ error: "Unable to create application session" });
    }
  });
}
