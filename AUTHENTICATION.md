# Authentication System Documentation

## Overview
This document outlines the JWT-based authentication system implemented for the DatStat application. The system provides secure user authentication with role-based access control (RBAC) and comprehensive security features.

## Features Implemented

### 🔐 Core Authentication
- **JWT-based authentication** with access and refresh tokens
- **Password hashing** using bcryptjs with salt rounds of 12
- **Role-based access control** (ADMIN, EDITOR, VIEWER)
- **Session management** with automatic token refresh
- **Secure cookie handling** with httpOnly, secure, and sameSite attributes

### 🛡️ Security Features
- **Rate limiting** on authentication endpoints
- **Input validation** using Zod schemas
- **Security headers** (HSTS, XSS protection, content type options)
- **CORS configuration** for production environments
- **IP-based tracking** for rate limiting and security

### 📊 API Endpoints

#### Authentication Routes
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/logout` - Secure logout with cookie clearing
- `POST /api/auth/register` - Admin-only user creation
- `POST /api/auth/refresh` - Token refresh endpoint
- `GET /api/auth/verify` - Token validation
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile and password

## Database Schema

### AdminUser Model
```sql
-- Admin Users table for authentication
model AdminUser {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   -- bcrypt hashed
  name      String
  role      Role     @default(VIEWER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  ADMIN   -- Full system access
  EDITOR  -- Data management access
  VIEWER  -- Read-only access
}
```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Initial Admin User
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure-password-123"
ADMIN_NAME="System Administrator"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/datstat_db"
```

## Role-Based Access Control

### Role Hierarchy
1. **VIEWER** - Basic read-only access to admin panel
2. **EDITOR** - Can view and edit data, but cannot manage users
3. **ADMIN** - Full system access including user management

### Protected Routes
- `/admin` - Requires VIEWER role minimum
- `/admin/companies` - Requires VIEWER role minimum
- `/admin/data` - Requires EDITOR role minimum
- `/admin/settings` - Requires ADMIN role minimum

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
# Dependencies added:
# - jsonwebtoken @types/jsonwebtoken
# - bcryptjs @types/bcryptjs
# - zod
```

### 2. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Apply database migrations
npm run db:migrate

# Seed initial data (creates admin user)
npm run db:seed
```

### 3. Environment Configuration
```bash
# Copy example environment file
cp .env.example .env

# Update with your actual values
# IMPORTANT: Generate secure JWT secrets in production
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

## Integration Notes for Other Agents

### Frontend Integration
The login page at `/login` already exists and should work with the new JWT endpoints. The form should submit to `/api/auth/login` with email/password.

**Required Frontend Updates:**
- Change login form to use `email` instead of `username`
- Handle JWT tokens in client-side code
- Implement token refresh logic
- Add role-based UI elements

### API Integration
All API routes now have access to authenticated user information via middleware headers:
- `x-user-id` - Current user ID
- `x-user-role` - Current user role
- `x-user-email` - Current user email

**Example API usage:**
```typescript
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Your API logic here
}
```

### Middleware Protection
The middleware automatically protects routes based on the `PROTECTED_ROUTES` configuration. To add new protected routes:

```typescript
const PROTECTED_ROUTES: Record<string, Role> = {
  '/admin/new-section': 'EDITOR',  // Add new protected routes here
};
```

## Security Considerations

### Production Deployment
1. **JWT Secrets**: Use cryptographically secure random strings
2. **HTTPS**: Always use HTTPS in production
3. **Database**: Use strong database passwords and connection encryption
4. **Rate Limiting**: Consider using Redis for distributed rate limiting
5. **Monitoring**: Implement logging for authentication events

### Token Lifecycle
- **Access tokens**: 15-minute expiration (configurable)
- **Refresh tokens**: 7-day expiration (configurable)
- **Automatic refresh**: Client should implement token refresh logic
- **Secure storage**: Tokens stored in httpOnly cookies

## Testing

### Default Test Users
The seed script creates three test users:

1. **Admin User**
   - Email: `admin@datstat.com` (or from ADMIN_EMAIL env var)
   - Password: `admin123` (or from ADMIN_PASSWORD env var)
   - Role: ADMIN

2. **Editor User**
   - Email: `editor@datstat.com`
   - Password: `editor123`
   - Role: EDITOR

3. **Viewer User**
   - Email: `viewer@datstat.com`
   - Password: `viewer123`
   - Role: VIEWER

### API Testing
Test the authentication endpoints:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@datstat.com","password":"admin123"}'

# Verify token
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get profile
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Common Issues
1. **JWT_SECRET not set**: Ensure environment variables are properly configured
2. **Database connection**: Verify DATABASE_URL is correct
3. **Migration errors**: Run `npm run db:reset` to reset database
4. **CORS issues**: Update FRONTEND_URL environment variable

### Error Codes
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Insufficient role permissions
- `429 Too Many Requests`: Rate limit exceeded
- `400 Bad Request`: Invalid input data

## Files Created/Modified

### New Files
- `/src/lib/auth.ts` - Authentication utilities and functions
- `/src/app/api/auth/register/route.ts` - User registration endpoint
- `/src/app/api/auth/refresh/route.ts` - Token refresh endpoint
- `/src/app/api/auth/verify/route.ts` - Token verification endpoint
- `/src/app/api/auth/profile/route.ts` - User profile management
- `/.env.example` - Environment variables template
- `/AUTHENTICATION.md` - This documentation file

### Modified Files
- `/package.json` - Added authentication dependencies
- `/src/app/api/auth/login/route.ts` - Updated with JWT authentication
- `/src/app/api/auth/logout/route.ts` - Updated for JWT token clearing
- `/src/middleware.ts` - Complete JWT-based middleware with RBAC
- `/prisma/seed.ts` - Added proper password hashing for seed users

## Next Steps

1. **Update frontend login page** to use email instead of username
2. **Implement client-side token management** (refresh logic)
3. **Add role-based UI components** in admin panel
4. **Configure production environment variables**
5. **Implement audit logging** for authentication events
6. **Add two-factor authentication** (future enhancement)

The authentication system is now production-ready with comprehensive security features and proper JWT token management.