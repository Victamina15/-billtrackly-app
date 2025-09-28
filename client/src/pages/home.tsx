import { useState, useEffect } from "react";
import { type Employee, type User } from "@shared/schema";
import LandingPage from "@/components/landing-page";
import RegisterModal from "@/components/register-modal";
import LoginModal from "@/components/login-modal";
import OnboardingWizard from "@/components/onboarding-wizard";
import Dashboard from "@/components/dashboard";
import NotificationModal from "@/components/notification-modal";
import { useToast } from "@/hooks/use-toast";

type AuthenticatedUser = Employee | User;

export default function Home() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [userType, setUserType] = useState<"employee" | "user" | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const { toast } = useToast();

  // Check for verification success from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
      showNotification("¡Email verificado exitosamente! Ahora puedes iniciar sesión.");
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const showNotification = (message: string) => {
    toast({
      title: "Billtracky",
      description: message,
    });
  };

  const handleGetStarted = () => {
    setShowRegisterModal(true);
  };

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleUserLogin = async (user: User) => {
    setCurrentUser(user);
    setUserType("user");
    setShowLoginModal(false);
    showNotification(`Bienvenido ${user.firstName}!`);

    // Check onboarding status
    try {
      const response = await fetch(`/api/onboarding/status?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (!data.onboardingComplete) {
          setOnboardingData(data);
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  };

  const handleEmployeeLogin = (employee: Employee, accessCode?: string) => {
    // Store employee ID and access code in localStorage for authenticated requests
    localStorage.setItem('employeeId', employee.id);
    if (accessCode) {
      localStorage.setItem('employeeAccessCode', accessCode);
    }
    setCurrentUser(employee);
    setUserType("employee");
    setShowLoginModal(false);
    showNotification(`Bienvenido ${employee.name}!`);
  };

  const handleRegisterSuccess = () => {
    setShowRegisterModal(false);
    showNotification("¡Cuenta creada exitosamente! Revisa tu email para activar tu cuenta.");
  };

  const logout = () => {
    // Clear stored employee data from localStorage
    localStorage.removeItem('employeeId');
    localStorage.removeItem('employeeAccessCode');
    setCurrentUser(null);
    setUserType(null);
    showNotification("Sesión cerrada correctamente.");
  };

  const switchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const switchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingData(null);
    showNotification("¡Configuración completada! Bienvenido a Billtracky.");
  };

  // Si no hay usuario autenticado, mostrar landing page
  if (!currentUser) {
    return (
      <>
        <LandingPage 
          onGetStarted={handleGetStarted}
          onLogin={handleLogin}
        />
        <RegisterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onLoginClick={switchToLogin}
          onSuccess={handleRegisterSuccess}
        />
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onRegisterClick={switchToRegister}
          onUserLogin={handleUserLogin}
          onEmployeeLogin={handleEmployeeLogin}
        />
      </>
    );
  }

  // Si hay usuario autenticado pero necesita completar onboarding
  if (showOnboarding && onboardingData) {
    return (
      <OnboardingWizard
        user={onboardingData.user}
        organization={onboardingData.organization}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Si hay usuario autenticado, mostrar dashboard
  return (
    <Dashboard
      user={currentUser as Employee} // Temporal hasta que adaptemos el dashboard para usuarios
      onLogout={logout}
      onNotification={showNotification}
    />
  );
}
