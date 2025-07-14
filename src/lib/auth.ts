import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional().default('VIEWER'),
});

// Types
export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT utilities
export const generateTokens = (user: AuthUser): AuthTokens => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'datstat-app',
    audience: 'datstat-users',
  });

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'datstat-app',
      audience: 'datstat-users',
    }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'datstat-app',
      audience: 'datstat-users',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
};

export const verifyRefreshToken = (token: string): { userId: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'datstat-app',
      audience: 'datstat-users',
    }) as { userId: string };
    return decoded;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
};

// User management
export const findUserByEmail = async (email: string): Promise<AuthUser | null> => {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

export const findUserById = async (userId: string): Promise<AuthUser | null> => {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    return null;
  }
};

export const createUser = async (userData: {
  email: string;
  password: string;
  name: string;
  role?: Role;
}): Promise<AuthUser | null> => {
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const user = await prisma.adminUser.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role || 'VIEWER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

// Authentication helpers
export const authenticateUser = async (
  email: string,
  password: string
): Promise<AuthUser | null> => {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
};

// Role-based access control
export const hasPermission = (userRole: Role, requiredRole: Role): boolean => {
  const roleHierarchy = {
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const requireRole = (userRole: Role, requiredRole: Role): boolean => {
  return hasPermission(userRole, requiredRole);
};

// Extract token from request
export const extractTokenFromRequest = (request: NextRequest): string | null => {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies as fallback
  const cookieToken = request.cookies.get('access-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
};

// Get authenticated user from request
export const getAuthenticatedUser = async (request: NextRequest): Promise<AuthUser | null> => {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  return findUserById(payload.userId);
};

// Rate limiting utilities
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export const checkRateLimit = (
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean => {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitMap.get(key);
  
  if (!current) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (now - current.timestamp > windowMs) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
};

// Cleanup expired rate limit entries
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.timestamp > windowMs) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

export default {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  findUserByEmail,
  findUserById,
  createUser,
  authenticateUser,
  hasPermission,
  requireRole,
  extractTokenFromRequest,
  getAuthenticatedUser,
  checkRateLimit,
  loginSchema,
  registerSchema,
};