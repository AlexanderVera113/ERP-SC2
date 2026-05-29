import { useUser, useClerk } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function DomainGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const location = useLocation();

  useEffect(() => {
    // 1. Si estamos cargando O estamos en la ruta de callback, NO hacemos nada.
    if (!isLoaded || location.pathname === '/sso-callback') return;

    if (user) {
      const email = user.primaryEmailAddress?.emailAddress || '';
      
      // 2. Solo expulsamos si estamos en una ruta privada y el email falla
      if (!email.endsWith('@sc2.cl')) {
        alert('[ALERTA DE SEGURIDAD]\nAcceso denegado. Este sistema es exclusivo para personal de la corporación SC2.');
        signOut();
      }
    }
  }, [isLoaded, user, signOut, location.pathname]);

  // Pantalla de carga
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="font-mono text-xs text-[#ffe16d] animate-pulse">Verificando credenciales corporativas...</span>
      </div>
    );
  }

  // Si está cargado, no es logueado, o tiene email incorrecto y NO estamos en callback
  if (user && !user.primaryEmailAddress?.emailAddress?.endsWith('@sc2.cl') && location.pathname !== '/sso-callback') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="font-mono text-[#ffb4ab]">Conexión rechazada.</span>
      </div>
    );
  }

  return <>{children}</>;
}