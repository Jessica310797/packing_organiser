import * as userRepo from "./userRepository.js";
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
