import { useUser, useClerk } from '@clerk/clerk-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

export default function DomainGuard({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isLoaded && user) {
      // Extraemos el correo con el que la persona intentó entrar
      const email = user.primaryEmailAddress?.emailAddress || '';
      
      // Si el correo NO termina en el dominio de la empresa...
      if (!email.endsWith('@sc2.cl')) {
        alert('[ALERTA DE SEGURIDAD]\nAcceso denegado. Este sistema es exclusivo para personal de la corporación SC2. Se requiere un correo @sc2.cl válido.');
        signOut(); // Destruimos su sesión instantáneamente
      }
    }
  }, [isLoaded, user, signOut]);

  // Pantalla de carga mientras Clerk decide si lo deja pasar o no
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="font-mono text-xs text-[#ffe16d] animate-pulse">Verificando credenciales corporativas...</span>
      </div>
    );
  }

  // Si está cargado pero lo estamos expulsando, no renderizamos el ERP
  if (user && !user.primaryEmailAddress?.emailAddress?.endsWith('@sc2.cl')) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="font-mono text-xs text-[#ffb4ab]">Conexión rechazada. Cerrando sesión...</span>
      </div>
    );
  }

  // Si pasó la prueba, le mostramos el ERP
  return <>{children}</>;
}