'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  ShieldCheck,
  ShieldX,
  Key,
  Mail,
  Calendar,
  Activity,
  UserCheck,
  UserX,
  RotateCcw
} from 'lucide-react';
import { TerminalCard, TerminalButton, TerminalInput } from '@/components/ui';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  password: string;
  confirmPassword: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'USER',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  // Mock users data
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUsers: User[] = [
          {
            id: '1',
            email: 'admin@datstat.com',
            name: 'System Administrator',
            role: 'ADMIN',
            isActive: true,
            lastLogin: '2024-07-14T10:30:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-07-14T10:30:00Z'
          },
          {
            id: '2',
            email: 'analyst@datstat.com',
            name: 'Senior Analyst',
            role: 'USER',
            isActive: true,
            lastLogin: '2024-07-13T16:45:00Z',
            createdAt: '2024-02-15T09:00:00Z',
            updatedAt: '2024-07-13T16:45:00Z'
          },
          {
            id: '3',
            email: 'researcher@datstat.com',
            name: 'Research Team Lead',
            role: 'USER',
            isActive: false,
            lastLogin: '2024-06-30T14:20:00Z',
            createdAt: '2024-03-10T12:00:00Z',
            updatedAt: '2024-06-30T14:20:00Z'
          }
        ];
        
        setUsers(mockUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      name: '',
      role: 'USER',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (!editingUser && users.some(u => u.email === formData.email)) {
      newErrors.email = 'Email already exists';
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Password validation (only for new users or when changing password)
    if (!editingUser || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveUser = async () => {
    if (!validateForm()) return;

    try {
      if (editingUser) {
        // Update existing user
        setUsers(prev => prev.map(user =>
          user.id === editingUser.id
            ? {
                ...user,
                email: formData.email,
                name: formData.name,
                role: formData.role,
                updatedAt: new Date().toISOString()
              }
            : user
        ));
      } else {
        // Add new user
        const newUser: User = {
          id: `user_${Date.now()}`,
          email: formData.email,
          name: formData.name,
          role: formData.role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setUsers(prev => [...prev, newUser]);
      }

      setShowModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleToggleUserStatus = (user: User) => {
    setUsers(prev => prev.map(u =>
      u.id === user.id
        ? { ...u, isActive: !u.isActive, updatedAt: new Date().toISOString() }
        : u
    ));
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
    }
  };

  const handlePasswordReset = (user: User) => {
    setSelectedUser(user);
    setShowPasswordReset(true);
  };

  const confirmPasswordReset = () => {
    // In production, this would send a password reset email
    alert(`Password reset email sent to ${selectedUser?.email}`);
    setShowPasswordReset(false);
    setSelectedUser(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <ShieldCheck className="w-4 h-4 text-[color:var(--terminal-accent)]" />;
      case 'USER':
        return <Shield className="w-4 h-4 text-[color:var(--terminal-text-secondary)]" />;
      default:
        return <ShieldX className="w-4 h-4 text-[color:var(--terminal-danger)]" />;
    }
  };

  const activeUsers = users.filter(u => u.isActive);
  const adminUsers = users.filter(u => u.role === 'ADMIN');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[color:var(--terminal-text-secondary)] font-mono">
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)] font-mono">
            User Management
          </h1>
          <p className="text-[color:var(--terminal-text-secondary)] mt-2">
            Manage system users, roles, and permissions
          </p>
        </div>
        <TerminalButton
          onClick={handleAddUser}
          icon={<Plus className="w-4 h-4" />}
          className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
        >
          Add User
        </TerminalButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Total Users</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {users.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Active Users</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-success)] font-mono">
                {activeUsers.length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-[color:var(--terminal-success)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Administrators</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                {adminUsers.length}
              </p>
            </div>
            <ShieldCheck className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Inactive Users</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-danger)] font-mono">
                {users.length - activeUsers.length}
              </p>
            </div>
            <UserX className="w-8 h-8 text-[color:var(--terminal-danger)]" />
          </div>
        </TerminalCard>
      </div>

      {/* Users List */}
      <TerminalCard title="System Users">
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-4 rounded border transition-colors ${
                user.isActive
                  ? 'border-[color:var(--terminal-border)] hover:border-[color:var(--terminal-accent)]'
                  : 'border-[color:var(--terminal-danger)]/20 bg-[color:var(--terminal-danger)]/5'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getRoleIcon(user.role)}
                  <div>
                    <h3 className="text-lg font-bold text-[color:var(--terminal-text-primary)] font-mono">
                      {user.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3 h-3 text-[color:var(--terminal-text-secondary)]" />
                      <p className="text-[color:var(--terminal-text-secondary)] text-sm">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-xs text-[color:var(--terminal-text-secondary)]">Role</p>
                    <p className={`font-mono font-bold text-sm ${
                      user.role === 'ADMIN' 
                        ? 'text-[color:var(--terminal-accent)]' 
                        : 'text-[color:var(--terminal-text-primary)]'
                    }`}>
                      {user.role}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-[color:var(--terminal-text-secondary)]">Status</p>
                    <p className={`font-mono font-bold text-sm ${
                      user.isActive 
                        ? 'text-[color:var(--terminal-success)]' 
                        : 'text-[color:var(--terminal-danger)]'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-[color:var(--terminal-text-secondary)]">Last Login</p>
                    <p className="font-mono text-sm text-[color:var(--terminal-text-primary)]">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-[color:var(--terminal-text-secondary)]">Created</p>
                    <p className="font-mono text-sm text-[color:var(--terminal-text-primary)]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <TerminalButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePasswordReset(user)}
                  icon={<RotateCcw className="w-4 h-4" />}
                  className="text-[color:var(--terminal-warning)] hover:bg-[color:var(--terminal-warning)]/10"
                >
                  Reset Password
                </TerminalButton>
                
                <TerminalButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleUserStatus(user)}
                  icon={user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  className={user.isActive 
                    ? 'text-[color:var(--terminal-warning)] hover:bg-[color:var(--terminal-warning)]/10'
                    : 'text-[color:var(--terminal-success)] hover:bg-[color:var(--terminal-success)]/10'
                  }
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </TerminalButton>

                <TerminalButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditUser(user)}
                  icon={<Edit3 className="w-4 h-4" />}
                  className="text-[color:var(--terminal-primary)] hover:bg-[color:var(--terminal-primary)]/10"
                >
                  Edit
                </TerminalButton>

                <TerminalButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteUser(user)}
                  icon={<Trash2 className="w-4 h-4" />}
                  className="text-[color:var(--terminal-danger)] hover:bg-[color:var(--terminal-danger)]/10"
                >
                  Delete
                </TerminalButton>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-[color:var(--terminal-text-muted)] mx-auto mb-4" />
              <h3 className="text-[color:var(--terminal-text-secondary)] font-mono mb-2">
                No users found
              </h3>
              <p className="text-[color:var(--terminal-text-muted)] text-sm">
                Get started by adding your first user
              </p>
            </div>
          )}
        </div>
      </TerminalCard>

      {/* User Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono mb-6">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            
            <div className="space-y-4">
              <TerminalInput
                label="Email Address *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@company.com"
                error={errors.email}
              />

              <TerminalInput
                label="Full Name *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                error={errors.name}
              />

              <div>
                <label className="block text-sm font-mono text-[color:var(--terminal-text-primary)] mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'USER' }))}
                  className="w-full bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded px-3 py-2 text-[color:var(--terminal-text-primary)] font-mono"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <TerminalInput
                label={editingUser ? "New Password (leave blank to keep current)" : "Password *"}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                error={errors.password}
              />

              <TerminalInput
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm password"
                error={errors.confirmPassword}
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <TerminalButton
                variant="ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={handleSaveUser}
                className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </TerminalButton>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPasswordReset(false)} />
          <div className="relative bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono mb-4">
              Reset Password
            </h3>
            <p className="text-[color:var(--terminal-text-secondary)] mb-6">
              Send a password reset email to <strong>{selectedUser.email}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <TerminalButton
                variant="ghost"
                onClick={() => setShowPasswordReset(false)}
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={confirmPasswordReset}
                icon={<Key className="w-4 h-4" />}
                className="bg-[color:var(--terminal-warning)] hover:bg-[color:var(--terminal-warning)]/80"
              >
                Send Reset Email
              </TerminalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}