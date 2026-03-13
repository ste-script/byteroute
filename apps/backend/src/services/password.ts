/**
 * @module backend/services/password
 */

import { ScryptPasswordService } from "../infrastructure/auth/scrypt-password.service.js";

const passwordService = new ScryptPasswordService();

export async function hashPassword(password: string): Promise<string> {
  return passwordService.hash(password);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return passwordService.verify(password, passwordHash);
}
