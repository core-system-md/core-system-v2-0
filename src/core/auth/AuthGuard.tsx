import { Navigate } from 'react-router-dom';

const PIN_AUTH_KEY = "core_pin_auth";

export function AuthGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const pinData = localStorage.getItem(PIN_AUTH_KEY);
  
  if (!pinData) {
    return <Navigate to="/login" replace />;
  }

  try {
    const parsed = JSON.parse(pinData);
    
    if (parsed.expiry && Date.now() > parsed.expiry) {
      localStorage.removeItem(PIN_AUTH_KEY);
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(parsed.role)) {
      return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
  } catch {
    localStorage.removeItem(PIN_AUTH_KEY);
    return <Navigate to="/login" replace />;
  }
}
