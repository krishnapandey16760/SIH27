'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'Guest' | 'Sr. Divisional Engineer';

interface RoleContextValue {
  role: UserRole;
  setRole: (r: UserRole) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);
const STORAGE_KEY = 'railblock_user_role';

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('Guest');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as UserRole | null;
    if (saved === 'Guest' || saved === 'Sr. Divisional Engineer') setRoleState(saved);
  }, []);

  const setRole = (r: UserRole) => {
    setRoleState(r);
    window.localStorage.setItem(STORAGE_KEY, r);
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
