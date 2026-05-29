import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut, ClerkLoaded } from '@clerk/clerk-react'
import App from './App.tsx'
import LoginTerminal from './components/LoginTerminal.tsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Falta agregar VITE_CLERK_PUBLISHABLE_KEY en el archivo .env.local")
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <SignedOut>
        <LoginTerminal />
      </SignedOut>
      <SignedIn>
        {/* Usamos el componente <ClerkLoaded> para asegurar que la app solo cargue cuando la sesión esté lista */}
        <ClerkLoaded>
          <App />
        </ClerkLoaded>
      </SignedIn>
    </ClerkProvider>
  </React.StrictMode>,
)