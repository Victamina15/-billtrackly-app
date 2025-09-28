import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, User, Building } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

const employeeLoginSchema = z.object({
  accessCode: z.string().min(4, "El código debe tener al menos 4 dígitos"),
});

type LoginForm = z.infer<typeof loginSchema>;
type EmployeeLoginForm = z.infer<typeof employeeLoginSchema>;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterClick: () => void;
  onUserLogin: (user: any) => void;
  onEmployeeLogin: (employee: any) => void;
}

export default function LoginModal({ isOpen, onClose, onRegisterClick, onUserLogin, onEmployeeLogin }: LoginModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<"user" | "employee">("user");

  const userForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const employeeForm = useForm<EmployeeLoginForm>({
    resolver: zodResolver(employeeLoginSchema),
    defaultValues: {
      accessCode: "",
    },
  });

  const onUserSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/user-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onUserLogin(result.user);
      } else {
        const error = await response.json();
        userForm.setError("password", { message: error.message || "Credenciales inválidas" });
      }
    } catch (error) {
      console.error("Error en login:", error);
      userForm.setError("password", { message: "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  const onEmployeeSubmit = async (data: EmployeeLoginForm) => {
    setIsLoading(true);
    try {
      // Llamada a la API de empleados existente
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessCode: data.accessCode }),
      });

      if (response.ok) {
        const result = await response.json();
        onEmployeeLogin(result.employee);
      } else {
        const error = await response.json();
        employeeForm.setError("accessCode", { message: error.message });
      }
    } catch (error) {
      console.error("Error en login de empleado:", error);
      employeeForm.setError("accessCode", { message: "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Iniciar Sesión
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Accede a tu cuenta de Billtracky
          </p>
        </DialogHeader>

        {/* Selector de tipo de login */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={loginType === "user" ? "default" : "ghost"}
            onClick={() => setLoginType("user")}
            className="flex items-center gap-2 h-11"
            data-testid="button-user-login-type"
          >
            <User className="w-4 h-4" />
            Propietario
          </Button>
          <Button
            type="button"
            variant={loginType === "employee" ? "default" : "ghost"}
            onClick={() => setLoginType("employee")}
            className="flex items-center gap-2 h-11"
            data-testid="button-employee-login-type"
          >
            <Building className="w-4 h-4" />
            Empleado
          </Button>
        </div>

        {loginType === "user" ? (
          // Formulario de login para usuarios (propietarios)
          <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  {...userForm.register("email")}
                  placeholder="tu@email.com"
                  className="pl-10"
                  data-testid="input-email"
                />
              </div>
              {userForm.formState.errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {userForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...userForm.register("password")}
                  placeholder="Tu contraseña"
                  className="pl-10 pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground p-1 hover:bg-muted rounded min-h-8 min-w-8 flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {userForm.formState.errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {userForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm text-secondary hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              data-testid="button-user-login"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <Separator />

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="text-secondary hover:underline font-medium"
                  data-testid="link-register"
                >
                  Crear cuenta gratis
                </button>
              </p>
            </div>
          </form>
        ) : (
          // Formulario de login para empleados (código de acceso)
          <form onSubmit={employeeForm.handleSubmit(onEmployeeSubmit)} className="space-y-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Building className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Ingresa el código de acceso proporcionado por tu supervisor
              </p>
            </div>

            <div>
              <Label htmlFor="accessCode">Código de Acceso</Label>
              <Input
                id="accessCode"
                type="password"
                {...employeeForm.register("accessCode")}
                placeholder="Ingresa tu código"
                className="text-center text-lg font-mono"
                data-testid="input-access-code"
              />
              {employeeForm.formState.errors.accessCode && (
                <p className="text-sm text-destructive mt-1">
                  {employeeForm.formState.errors.accessCode.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              data-testid="button-employee-login"
            >
              {isLoading ? "Verificando..." : "Acceder"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Códigos de prueba: E001 (Gerente), E002 (Empleado), E003 (Supervisor)
              </p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}