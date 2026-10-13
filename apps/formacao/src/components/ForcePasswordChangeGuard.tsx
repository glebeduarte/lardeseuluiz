import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * If the logged-in user still has the default password (must_change_password = true),
 * redirect them to /reset-password?forced=1 until they set a personal password.
 */
export function ForcePasswordChangeGuard() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      sessionStorage.removeItem('force_password_change');
      return;
    }

    // Only force change when the user actually just signed in with the
    // default password (flag set in Auth.tsx). Avoids trapping users who
    // never used it.
    const forcePasswordChange = sessionStorage.getItem('force_password_change');
    let usedDefault = false;

    if (forcePasswordChange) {
      try {
        const parsed = JSON.parse(forcePasswordChange) as { userId?: string; createdAt?: number };
        const isRecent = typeof parsed.createdAt === 'number' && Date.now() - parsed.createdAt < 10 * 60 * 1000;
        usedDefault = parsed.userId === user.id && isRecent;
      } catch {
        sessionStorage.removeItem('force_password_change');
      }
    }

    if (!usedDefault) return;
    if (!profile.must_change_password) return;

    const allowed = ['/reset-password', '/forgot-password', '/auth'];
    if (allowed.some((p) => location.pathname.startsWith(p))) return;

    navigate('/reset-password?forced=1', { replace: true });
  }, [user, profile, loading, location.pathname, navigate]);

  return null;
}
