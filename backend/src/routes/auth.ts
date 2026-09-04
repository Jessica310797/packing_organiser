import { Router } from "express";
import { z } from "zod";
import * as authService from "../auth/authService.js";
import * as userRepo from "../auth/userRepository.js";
import { requireAuth } from "../auth/middleware.js";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(1),
});

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/auth/signup", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    try {
      const result = await authService.signup(parsed.data.email, parsed.data.password, parsed.data.name ?? null);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof authService.EmailAlreadyRegisteredError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  });

  router.post("/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    try {
      const result = await authService.login(parsed.data.email, parsed.data.password);
      res.json(result);
    } catch (err) {
      if (err instanceof authService.InvalidCredentialsError) {
        return res.status(401).json({ error: err.message });
      }
      throw err;
    }
  });

  router.get("/auth/me", requireAuth, (req, res) => {
    const user = userRepo.getUserById(req.userId as string);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  router.patch("/auth/me", requireAuth, (req, res) => {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const user = userRepo.updateUserName(req.userId as string, parsed.data.name);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  router.delete("/auth/me", requireAuth, (req, res) => {
    authService.deleteAccount(req.userId as string);
    res.status(204).send();
  });

  return router;
}
