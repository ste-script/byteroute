/**
 * @module backend/services/password
 */

import { ScryptPasswordService } from "../infrastructure/auth/scrypt-password.service.js";

const passwordService = new ScryptPasswordService();

/**
 * Hashes password.
 * @param password - The password input.
 * @returns The password result.
 */

export async function hashPassword(password: string): Promise<string> {
  return passwordService.hash(password);
}

/**
 * Verifies password.
 * @param password - The password input.
 * @param passwordHash - The password hash input.
 * @returns The password result.
 */

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return passwordService.verify(password, passwordHash);
}
