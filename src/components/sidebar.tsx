'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, ClipboardList, Network, ChevronLeft, ChevronRight, Settings, HelpCircle, Activity, Train, AlertTriangle,  } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Block Planning',
    href: '/',
    icon: <LayoutDashboard size={18} />,
    group: 'Planning',
  },
  {
    id: 'nav-requests',
    label: 'Maintenance Requests',
    href: '/maintenance-request-management',
    icon: <ClipboardList size={18} />,
    badge: 7,
    group: 'Planning',
  },
  {
    id: 'nav-network',
    label: 'Network Graph',
    href: '/network-graph-viewer',
    icon: <Network size={18} />,
    group: 'Visualization',
  },
  {
    id: 'nav-trains',
    label: 'Train Movements',
    href: '#',
    icon: <Train size={18} />,
    group: 'Visualization',
  },
  {
    id: 'nav-alerts',
    label: 'Conflict Alerts',
    href: '#',
    icon: <AlertTriangle size={18} />,
    badge: 3,
    group: 'Monitoring',
  },
  {
    id: 'nav-activity',
    label: 'Activity Log',
    href: '#',
    icon: <Activity size={18} />,
    group: 'Monitoring',
  },
];

const GROUPS = ['Planning', 'Visualization', 'Monitoring'];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 card-surface border-r border-border transition-all duration-300 ease-in-out shrink-0"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div
        className="flex items-center border-b border-border shrink-0"
        style={{ height: 60, padding: collapsed ? '0 12px' : '0 16px', overflow: 'hidden' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AppLogo size={32} />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground tracking-tight leading-none">
                RailBlock
              </span>
              <span className="text-2xs text-muted-foreground font-medium mt-0.5">
                NR Zone · IST
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          return (
            <div key={`group-${group}`} className="mb-4">
              {!collapsed && (
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1">
                  {group}
                </p>
              )}
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`sidebar-nav-item mb-0.5 ${isActive(item.href) ? 'active' : ''}`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="shrink-0 text-2xs font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge !== undefined && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border px-2 py-3 space-y-0.5">
        {[
          { id: 'nav-help', icon: <HelpCircle size={16} />, label: 'Help' },
          { id: 'nav-settings', icon: <Settings size={16} />, label: 'Settings' },
        ].map((item) => (
          <button
            key={item.id}
            title={collapsed ? item.label : undefined}
            className="sidebar-nav-item w-full"
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {/* User */}
        <div
          className="flex items-center gap-2 px-2 py-2 mt-1 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          style={{ overflow: 'hidden' }}
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-2xs font-bold text-primary">RK</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                Rajiv Kumar
              </span>
              <span className="text-2xs text-muted-foreground truncate">
                Sr. Section Engineer
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full card-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all z-10"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}