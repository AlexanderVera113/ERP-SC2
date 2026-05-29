import { SignUp } from "@clerk/clerk-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-container">
      <SignUp 
        path="/register" 
        routing="path" 
        signInUrl="/login" 
        forceRedirectUrl="/"
      />
    </div>
  );
}