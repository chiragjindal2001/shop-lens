import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LogoMark } from '../components/ui/Logo';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

// Each screen is its own chunk, so the login page never downloads the chat, and vice versa.
const LoginForm = lazy(() => import('../features/auth/LoginForm').then((m) => ({ default: m.LoginForm })));
const SignupForm = lazy(() => import('../features/auth/SignupForm').then((m) => ({ default: m.SignupForm })));
const HomePage = lazy(() => import('../features/home/HomePage').then((m) => ({ default: m.HomePage })));

function ScreenFallback() {
  return (
    <div className="grid h-dvh place-items-center text-brand">
      <LogoMark size={44} className="animate-pulse" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
