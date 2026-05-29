import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react'
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
      
      {/* Si el operador está fuera del sistema, se le bloquea con la UI de Stitch */}
      <SignedOut>
        <LoginTerminal />
      </SignedOut>

      {/* Si las credenciales corporativas son válidas, accede al software */}
      <SignedIn>
        <App />
      </SignedIn>

    </ClerkProvider>
  </React.StrictMode>,
)