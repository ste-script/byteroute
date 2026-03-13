/**
 * @module backend/domain/identity/password-service.interface
 */

export interface IPasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}
