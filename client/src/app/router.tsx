import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginForm } from '../features/auth/LoginForm';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { SignupForm } from '../features/auth/SignupForm';
import { ChatLayout } from '../features/chat/ChatLayout';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/signup" element={<SignupForm />} />
      <Route element={<ProtectedRoute />}>
        {/* One optional-param route keeps ChatLayout mounted while a new chat gets its id mid-stream. */}
        <Route path="/chat/:conversationId?" element={<ChatLayout />} />
      </Route>
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
