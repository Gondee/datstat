import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRefreshToken, findUserById, generateTokens, checkRateLimit } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(`refresh:${clientIP}`, 10, 15 * 60 * 1000)) { // 10 attempts per 15 minutes
      return NextResponse.json(
        { success: false, message: 'Too many refresh attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    
    // Get refresh token from cookie or request body
    let refreshToken = cookieStore.get('refresh-token')?.value;
    
    if (!refreshToken) {
      const body = await request.json().catch(() => ({}));
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token required' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      // Clear invalid refresh token cookie
      cookieStore.set('refresh-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });

      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Find user by ID
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    // Set new cookies
    cookieStore.set('access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    cookieStore.set('refresh-token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tokens refreshed successfully',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}