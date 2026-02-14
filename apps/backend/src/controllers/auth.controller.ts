import type { Request, Response } from "express";
import { UserModel } from "@byteroute/shared";
import { signAuthToken } from "../auth/passport.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import { signInRequestSchema, signUpRequestSchema } from "../types/auth.js";

export async function signUp(req: Request, res: Response): Promise<void> {
  const parsed = signUpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: name, email and password (min 8 chars) are required" });
    return;
  }

  const { email, name, password } = parsed.data;

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  const created = await UserModel.create({
    email,
    name,
    passwordHash: await hashPassword(password),
  });

  const token = signAuthToken({
    sub: String(created._id),
    email: created.email,
    name: created.name,
  });

  res.status(201).json({
    token,
    user: {
      id: String(created._id),
      email: created.email,
      name: created.name,
    },
  });
}

export async function signIn(req: Request, res: Response): Promise<void> {
  const parsed = signInRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: email and password are required" });
    return;
  }

  const { email, password } = parsed.data;

  const user = await UserModel.findOne({ email }).select("+passwordHash");
  if (!user || typeof user.passwordHash !== "string" || ! await verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signAuthToken({
    sub: String(user._id),
    email: user.email,
    name: user.name,
  });

  res.status(200).json({
    token,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
    },
  });
}
