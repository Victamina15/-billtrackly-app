import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Building, User, Mail, Lock, CreditCard } from "lucide-react";

const registerSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string(),
  organizationName: z.string().min(2, "El nombre de la empresa debe tener al menos 2 caracteres"),
  organizationPhone: z.string().min(10, "Teléfono inválido"),
  selectedPlan: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, "Debes aceptar los términos y condiciones"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
  onSuccess: () => void;
}

export default function RegisterModal({ isOpen, onClose, onLoginClick, onSuccess }: RegisterModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      organizationName: "",
      organizationPhone: "",
      selectedPlan: "free",
      acceptTerms: false,
    },
  });

  const plans = [
    { id: "free", name: "Plan Gratuito", price: "$0/mes", description: "Hasta 50 facturas por mes" },
    { id: "basic", name: "Plan Básico", price: "$29/mes", description: "Hasta 500 facturas por mes" },
    { id: "pro", name: "Plan Pro", price: "$79/mes", description: "Facturas ilimitadas" },
  ];

  const selectedPlanDetails = plans.find(plan => plan.id === form.watch("selectedPlan"));

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      // Prepare user data for API
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: 'owner' as const
      };

      // Prepare organization data for API
      const organizationData = {
        name: data.organizationName,
        phone: data.organizationPhone,
        planType: data.selectedPlan
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          organizationData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en el registro');
      }

      const result = await response.json();
      console.log('Registro exitoso:', result);

      onSuccess();
    } catch (error) {
      console.error("Error en registro:", error);
      // TODO: Show error message to user
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Crear cuenta en Billtracky
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Únete a cientos de lavanderías que ya confían en nosotros
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="w-4 h-4" />
              Información Personal
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  placeholder="Tu nombre"
                  data-testid="input-first-name"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  {...form.register("lastName")}
                  placeholder="Tu apellido"
                  data-testid="input-last-name"
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="tu@email.com"
                  className="pl-10"
                  data-testid="input-email"
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...form.register("password")}
                    placeholder="Min. 8 caracteres"
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
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...form.register("confirmPassword")}
                    placeholder="Repite tu contraseña"
                    className="pl-10 pr-10"
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground p-1 hover:bg-muted rounded min-h-8 min-w-8 flex items-center justify-center"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Información de la Empresa */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Building className="w-4 h-4" />
              Información de la Empresa
            </div>
            
            <div>
              <Label htmlFor="organizationName">Nombre de la Lavandería *</Label>
              <Input
                id="organizationName"
                {...form.register("organizationName")}
                placeholder="Ej: Lavandería Express"
                data-testid="input-organization-name"
              />
              {form.formState.errors.organizationName && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.organizationName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="organizationPhone">Teléfono de la Empresa *</Label>
              <Input
                id="organizationPhone"
                {...form.register("organizationPhone")}
                placeholder="809-555-0123"
                data-testid="input-organization-phone"
              />
              {form.formState.errors.organizationPhone && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.organizationPhone.message}
                </p>
              )}
            </div>
          </div>

          {/* Selección de Plan */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CreditCard className="w-4 h-4" />
              Selecciona tu Plan
            </div>
            
            <Select 
              value={form.watch("selectedPlan")} 
              onValueChange={(value) => form.setValue("selectedPlan", value)}
            >
              <SelectTrigger data-testid="select-plan">
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{plan.name} - {plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPlanDetails && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{selectedPlanDetails.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPlanDetails.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{selectedPlanDetails.price}</p>
                    {selectedPlanDetails.id === "free" && (
                      <p className="text-sm text-green-600 dark:text-green-400">30 días gratis</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Términos y Condiciones */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="acceptTerms"
              checked={form.watch("acceptTerms")}
              onCheckedChange={(checked) => form.setValue("acceptTerms", !!checked)}
              data-testid="checkbox-accept-terms"
            />
            <Label htmlFor="acceptTerms" className="text-sm leading-5">
              Acepto los{" "}
              <a href="#" className="text-secondary hover:underline">
                términos y condiciones
              </a>{" "}
              y la{" "}
              <a href="#" className="text-secondary hover:underline">
                política de privacidad
              </a>
            </Label>
          </div>
          {form.formState.errors.acceptTerms && (
            <p className="text-sm text-destructive">
              {form.formState.errors.acceptTerms.message}
            </p>
          )}

          {/* Botones */}
          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              data-testid="button-register"
            >
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="text-secondary hover:underline font-medium"
                  data-testid="link-login"
                >
                  Iniciar sesión
                </button>
              </p>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}