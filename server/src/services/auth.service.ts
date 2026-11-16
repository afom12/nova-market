import bcrypt from 'bcryptjs';
import { Prisma, Role, type User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 12;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

/** The only shape of a user that ever leaves the server. No passwordHash. */
export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

export const verifyPassword = (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);

export const registerUser = async (input: RegisterInput): Promise<PublicUser> => {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        // Hard-coded. The registration endpoint can never mint an admin.
        role: Role.CUSTOMER,
      },
    });
    return toPublicUser(user);
  } catch (error) {
    // Relying on the UNIQUE constraint rather than a read-then-write check
    // closes the race where two concurrent signups both pass the check.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('An account with this email already exists');
    }
    throw error;
  }
};

export const authenticateUser = async (input: LoginInput): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    // Burn a comparable amount of CPU even when the account does not exist,
    // so response timing does not reveal which emails are registered.
    await bcrypt.compare(input.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw AppError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    // Identical message for both branches — no account enumeration.
    throw AppError.unauthorized('Invalid email or password');
  }

  return toPublicUser(user);
};

export const getUserById = async (id: string): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound('User not found');
  return toPublicUser(user);
};
