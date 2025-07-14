import { NextRequest, NextResponse } from 'next/server';
import { createUser, registerSchema, checkRateLimit, getAuthenticatedUser, requireRole } from '@/lib/auth';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(`register:${clientIP}`, 3, 60 * 60 * 1000)) { // 3 attempts per hour
      return NextResponse.json(
        { success: false, message: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user is authenticated and has ADMIN role for creating new users
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser || !requireRole(currentUser.role, 'ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Admin access required to create new users' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid input data',
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { email, password, name, role } = validationResult.data;

    // Create user
    const newUser = await createUser({
      email,
      password,
      name,
      role,
    });
    
    if (!newUser) {
      return NextResponse.json(
        { success: false, message: 'Failed to create user. Email might already exist.' },
        { status: 409 }
      );
    }

    // Return user data (without sensitive info)
    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    // Handle unique constraint violations (email already exists)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, message: 'Email address already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}