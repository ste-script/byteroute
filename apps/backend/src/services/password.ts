/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
