import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

export default function SSOCallbackPage() {
  // Este componente DEBE ser lo único en la página. 
  // Él solito detecta el código de Google, crea al usuario y te redirige.
  return <AuthenticateWithRedirectCallback />;
}