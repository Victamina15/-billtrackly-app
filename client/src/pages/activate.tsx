import { useLocation } from "wouter";
import EmailVerification from "@/components/email-verification";

export default function ActivatePage() {
  const [, setLocation] = useLocation();

  const handleVerificationSuccess = () => {
    // Redirect to login with success message
    setLocation("/?verified=true");
  };

  const handleBackToLogin = () => {
    setLocation("/");
  };

  return (
    <EmailVerification
      onVerificationSuccess={handleVerificationSuccess}
      onBackToLogin={handleBackToLogin}
    />
  );
}