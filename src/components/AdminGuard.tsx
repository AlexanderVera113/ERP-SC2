import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  // Mientras Clerk carga el perfil, no mostramos nada para evitar parpadeos
  if (!isLoaded) return null;

  // Verificamos el metadato que acabamos de inyectar en el Dashboard de Clerk
  const isAdmin = user?.publicMetadata?.role === 'ADMIN';

  if (!isAdmin) {
    // Si es un operador regular, lo expulsamos silenciosamente al Dashboard principal
    return <Navigate to="/" replace />;
  }

  // Si es ADMIN, le permitimos ver el componente hijo (RRHH o Supply)
  return <>{children}</>;
}