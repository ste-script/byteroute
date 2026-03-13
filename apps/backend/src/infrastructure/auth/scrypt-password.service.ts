/**
 * @module backend/infrastructure/auth/scrypt-password.service
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { IPasswordService } from "../../domain/identity/password-service.interface.js";

const asyncScrypt = promisify(scrypt);
const SALT_BYTES = 16;
const KEY_BYTES = 64;

/**
 * Represents a scrypt password service.
 */

export class ScryptPasswordService implements IPasswordService {
  /**
   * Hashes the requested result.
   * @param password - The password input.
   * @returns The operation result.
   */

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derived = (await asyncScrypt(password, salt, KEY_BYTES)) as Buffer;
    return `${salt.toString("hex")}:${derived.toString("hex")}`;
  }

  /**
   * Verifies the requested result.
   * @param password - The password input.
   * @param passwordHash - The password hash input.
   * @returns The operation result.
   */

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [saltHex, hashHex] = passwordHash.split(":", 2);
    if (!saltHex || !hashHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = (await asyncScrypt(
      password,
      salt,
      expected.length,
    )) as Buffer;

    if (expected.length !== actual.length) {
      return false;
    }

    return timingSafeEqual(expected, actual);
  }
}
