'use client';

import React from 'react';
import { UserCog } from 'lucide-react';
import { useRole, type UserRole } from '@/context/RoleContext';

const ROLES: UserRole[] = ['Guest', 'Sr. Divisional Engineer'];

export default function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="flex items-center gap-2">
      <UserCog size={14} className="text-muted-foreground" />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as UserRole)}
        className="select-field text-xs"
        title="Demo login — no real authentication backend yet"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
