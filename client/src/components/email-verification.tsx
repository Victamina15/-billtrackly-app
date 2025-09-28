import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Mail, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailVerificationProps {
  onVerificationSuccess: () => void;
  onBackToLogin: () => void;
}

export default function EmailVerification({ onVerificationSuccess, onBackToLogin }: EmailVerificationProps) {
  const [location] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');

  // Extract token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationStatus('error');
      setMessage('Token de activación no encontrado en la URL');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      // Extract email from URL params as well
      const email = searchParams.get('email');

      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationToken,
          email: email
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setVerificationStatus('success');
        setMessage('¡Tu cuenta ha sido activada exitosamente!');
        setTimeout(() => {
          onVerificationSuccess();
        }, 3000);
      } else {
        if (result.code === 'TOKEN_EXPIRED') {
          setVerificationStatus('expired');
          setMessage('El enlace de activación ha expirado. Puedes solicitar uno nuevo.');
        } else {
          setVerificationStatus('error');
          setMessage(result.message || 'Error al verificar el email');
        }
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      setVerificationStatus('error');
      setMessage('Error de conexión al verificar el email');
    }
  };

  const resendVerificationEmail = async () => {
    setIsResending(true);
    try {
      const email = searchParams.get('email');
      const response = await fetch('/api/auth/resend-activation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('¡Email de verificación reenviado! Revisa tu bandeja de entrada.');
      } else {
        setMessage(result.message || 'Error al reenviar el email');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      setMessage('Error de conexión al reenviar el email');
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'loading':
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'error':
      case 'expired':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Mail className="w-16 h-16 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
      case 'expired':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className={`max-w-md w-full ${getStatusColor()}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl">
            {verificationStatus === 'loading' && 'Verificando Email'}
            {verificationStatus === 'success' && '¡Verificación Exitosa!'}
            {verificationStatus === 'error' && 'Error de Verificación'}
            {verificationStatus === 'expired' && 'Enlace Expirado'}
          </CardTitle>
          <CardDescription>
            {verificationStatus === 'loading' && 'Estamos verificando tu dirección de email...'}
            {verificationStatus === 'success' && 'Tu cuenta ha sido activada correctamente'}
            {verificationStatus === 'error' && 'Hubo un problema al verificar tu email'}
            {verificationStatus === 'expired' && 'El enlace de activación ha caducado'}
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">{message}</p>

          {verificationStatus === 'success' && (
            <div className="space-y-2">
              <p className="text-sm text-green-600">
                Serás redirigido automáticamente en unos segundos...
              </p>
              <Button
                onClick={onVerificationSuccess}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Continuar al Dashboard
              </Button>
            </div>
          )}

          {verificationStatus === 'expired' && (
            <div className="space-y-2">
              <Button
                onClick={resendVerificationEmail}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Reenviar Email de Verificación
                  </>
                )}
              </Button>
            </div>
          )}

          {(verificationStatus === 'error' || verificationStatus === 'expired') && (
            <Button
              variant="outline"
              onClick={onBackToLogin}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Login
            </Button>
          )}

          {verificationStatus === 'loading' && (
            <Button
              variant="outline"
              onClick={onBackToLogin}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}