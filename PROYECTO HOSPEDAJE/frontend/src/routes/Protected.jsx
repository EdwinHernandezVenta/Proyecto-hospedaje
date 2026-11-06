import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Protected({ role, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  // No hay sesión
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Permitir un solo rol
  if (role && user.rol !== role) {
    return <Navigate to="/" replace />;
  }

  // Permitir varios roles
  if (roles && !roles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}