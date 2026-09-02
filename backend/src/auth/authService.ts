import fs from "node:fs";
import * as userRepo from "./userRepository.js";
import * as tripRepo from "../inventory/repository.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { signToken } from "./tokens.js";
import type { User } from "../types.js";

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Incorrect email or password");
  }
}

export interface AuthResult {
  user: User;
  token: string;
}

export async function signup(email: string, password: string, name: string | null): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (userRepo.getUserRowByEmail(normalizedEmail)) {
    throw new EmailAlreadyRegisteredError();
  }
  const passwordHash = await hashPassword(password);
  const user = userRepo.createUser(normalizedEmail, passwordHash, name?.trim() || null);
  return { user, token: signToken({ userId: user.id }) };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const row = userRepo.getUserRowByEmail(normalizedEmail);
  if (!row) throw new InvalidCredentialsError();

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) throw new InvalidCredentialsError();

  const { passwordHash: _passwordHash, ...user } = row;
  return { user, token: signToken({ userId: user.id }) };
}

/**
 * Permanently deletes a user and everything they own: trips (and their
 * photos/inventory/review candidates), wardrobe items, and packing lists.
 * The DB rows cascade automatically via ON DELETE CASCADE; the uploaded
 * photo files on disk don't, so those are collected before the user row
 * is removed and unlinked afterward (best-effort -- a file already gone
 * isn't an error).
 */
export function deleteAccount(userId: string): void {
  const photoFilePaths = tripRepo.listAllPhotoFilePathsForUser(userId);
  userRepo.deleteUser(userId);
  for (const filePath of photoFilePaths) {
    // Synchronous and best-effort: account deletion is rare enough that
    // blocking briefly is fine, and a file already gone isn't an error --
    // just nothing left to clean up.
    try {
      fs.unlinkSync(filePath);
    } catch {
      // already gone, fine
    }
  }
}
