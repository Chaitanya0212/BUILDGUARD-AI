/**
 * BUILDGUARD AI - Authentication & Authorization Context
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  canVerify: boolean;
  canManageUsers: boolean;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>('demo-token');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch current user from backend session
    api.getCurrentUser()
      .then(res => {
        setUser(res.user);
      })
      .catch(err => {
        console.warn('Could not fetch current user:', err);
        // Fallback default officer
        setUser({
          id: 'usr-officer-1',
          email: 'officer@buildguard.gov',
          fullName: 'Inspector Anita Sharma',
          role: 'OFFICER',
          department: 'Municipal Corporation Vigilance Wing',
          badgeNumber: 'BG-OFF-104'
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, preferredRole?: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, preferredRole);
      setUser(res.user);
      setToken(res.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const switchRole = async (newRole: UserRole) => {
    try {
      const res = await api.switchRole(newRole);
      setUser(res.user);
    } catch {
      if (user) {
        setUser({ ...user, role: newRole });
      }
    }
  };

  const role: UserRole = user?.role || 'OFFICER';
  const canVerify = role === 'OFFICER' || role === 'ADMIN';
  const canManageUsers = role === 'ADMIN';
  const isReadOnly = role === 'VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        login,
        logout,
        switchRole,
        canVerify,
        canManageUsers,
        isReadOnly
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
