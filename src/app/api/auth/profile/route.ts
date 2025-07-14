import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, findUserById, hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Schema for profile updates
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  currentPassword: z.string().min(6, 'Current password is required').optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
}).refine((data) => {
  // If newPassword is provided, currentPassword must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required when changing password",
  path: ["currentPassword"],
});

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from request
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user from request
    const currentUser = await getAuthenticatedUser(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);
    
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

    const { name, currentPassword, newPassword } = validationResult.data;
    const updateData: any = {};

    // Update name if provided
    if (name) {
      updateData.name = name;
    }

    // Handle password change
    if (newPassword && currentPassword) {
      // Get user with password to verify current password
      const userWithPassword = await prisma.adminUser.findUnique({
        where: { id: currentUser.id },
        select: { password: true }
      });

      if (!userWithPassword) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }

      // Verify current password
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(currentPassword, userWithPassword.password);
      
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      // Hash new password
      updateData.password = await hashPassword(newPassword);
    }

    // Update user in database
    const updatedUser = await prisma.adminUser.update({
      where: { id: currentUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser,
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
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

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}