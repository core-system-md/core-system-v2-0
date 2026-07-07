import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthProvider';
import { useTenantStore } from '@/shared/store/tenantStore';
import { Users, ClipboardList, Settings, Shield, LogOut, Stethoscope, Menu, X } from 'lucide-react';
import { useState, ReactNode } from 'react';

const NAV_ITEMS = [
  { path: '/doctor', label: 'الأطباء', icon: Stethoscope, roles: ['doctor', 'receptionist', 'clinic_admin', 'super_admin'] },
  { path: '/receptionist', label: 'الاستقبال', icon: ClipboardList, roles: ['receptionist', 'clinic_admin', 'super_admin'] },
  { path: '/clinic_admin', label: 'إدارة العيادة', icon: Settings, roles: ['clinic_admin', 'super_admin'] },
  { path: '/super_admin', label: 'النظام', icon: Shield, roles: ['super_admin'] },
];

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, role, fullName, signOut } = useAuth();
  const primaryColor = useTenantStore((s) => s.primaryColor);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const effectiveRole = userRole || role || 'doctor';
  const allowedNavItems = NAV_ITEMS.filter(item => item.roles.includes(effectiveRole));

  const handleSignOut = () => {
    signOut?.();
    // AuthProvider handles all cleanup including localStorage
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex" dir="rtl">
      {/* Sidebar — Tenant branding via inline style (Tailwind JIT safe) */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} border-l border-white/10 transition-all duration-300 flex flex-col`}
        style={{ backgroundColor: primaryColor }}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-sm">CORE SYSTEM</h1>
                <p className="text-white/40 text-xs">v2.1</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 mx-4 mt-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          {sidebarOpen ? <X className="w-4 h-4 text-white/60" /> : <Menu className="w-4 h-4 text-white/60" />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User + Sign Out */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-white/60" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-white text-sm truncate">{fullName || 'مستخدم'}</p>
                <p className="text-white/40 text-xs truncate">{effectiveRole}</p>
              </div>
            )}
          </div>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm">
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children || <Outlet />}
      </main>
    </div>
  );
}
