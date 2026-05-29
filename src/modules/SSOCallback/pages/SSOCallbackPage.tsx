import { useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';

export default function SSOCallbackPage() {
  const clerk = useClerk();

  useEffect(() => {
    // Añadimos {} para satisfacer el requerimiento de parámetros de TypeScript
    clerk.handleRedirectCallback({}).catch((err) => {
      console.error("Error crítico en el callback de Clerk:", err);
    });
  }, [clerk]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-[#ffe16d]">
      <span className="font-mono text-xs animate-pulse">
        Sincronizando sesión corporativa...
      </span>
    </div>
  );
}