import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

export default function SSOCallbackPage() {
  // Este componente es el "cerebro" que registra al usuario si es nuevo
  return <AuthenticateWithRedirectCallback />;
}