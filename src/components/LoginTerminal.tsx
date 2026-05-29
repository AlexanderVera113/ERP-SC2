import { useSignIn } from '@clerk/clerk-react';

export default function LoginTerminal() {
  const { signIn } = useSignIn();

  const handleGoogleLogin = async () => {
    if (!signIn) return;
    
    try {
      // authenticateWithRedirect maneja internamente tanto Sign In como Sign Up
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        // Esta es la ruta donde pondrás el componente <AuthenticateWithRedirectCallback />
        redirectUrl: '/sso-callback', 
        redirectUrlComplete: '/',
      });
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-primary-container font-inter select-none antialiased">
      
      {/* Grid Industrial de Fondo */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
        style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
      
      {/* Resplandor Central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary-fixed opacity-[0.02] blur-[100px] rounded-full z-0 pointer-events-none" />

      {/* Contenedor de la Terminal */}
      <main className="relative z-10 w-full max-w-[420px] px-4 flex flex-col items-center">
        
        {/* Cabecera de la Marca */}
        <div className="flex flex-col items-center mb-10 w-full">
          <div className="w-16 h-16 border-[1.5px] border-secondary-fixed/50 flex items-center justify-center mb-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-secondary-fixed/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
            <span className="material-symbols-outlined text-secondary-fixed text-[32px]">
              precision_manufacturing
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">
            ERP Inventario & Activos
          </h1>
          <p className="font-mono text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
            Secure Access Terminal
          </p>
        </div>

        {/* Tarjeta de Autenticación */}
        <div className="w-full bg-surface border border-outline-variant/30 relative p-8 md:p-10 shadow-2xl shadow-black/50">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-secondary-fixed shadow-[0_0_8px_rgba(255,225,109,0.3)]" />
          
          <div className="flex flex-col gap-6">
            <div className="text-center space-y-1">
              <span className="font-mono text-xs text-outline tracking-wider uppercase">
                Autenticación Corporativa
              </span>
              <p className="text-sm text-on-surface-variant">
                Utiliza tu cuenta institucional de Google Workspace para ingresar.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="mt-2 w-full bg-secondary-fixed text-on-secondary-fixed font-mono text-xs py-4 px-6 flex items-center justify-center gap-2 hover:bg-secondary-container hover:shadow-[0_0_15px_rgba(255,225,109,0.2)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-secondary-fixed focus:ring-offset-2 focus:ring-offset-surface relative overflow-hidden group/btn cursor-pointer"
            >
              <span className="relative z-10 font-bold tracking-wider">
                INGRESAR CON GOOGLE
              </span>
              <span className="material-symbols-outlined text-[16px] relative z-10 group-hover/btn:translate-x-1 transition-transform">
                arrow_forward
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
            </button>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="mt-10 flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-3 h-3 rounded-full bg-secondary-fixed/30 animate-ping" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-secondary-fixed shadow-[0_0_8px_rgba(255,225,109,0.8)]" />
          </div>
          <span className="font-mono text-[10px] text-outline tracking-widest uppercase">
            System Nominal
          </span>
        </div>
      </main>
    </div>
  );
}