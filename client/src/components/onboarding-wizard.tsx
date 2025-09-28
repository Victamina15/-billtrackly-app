import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Building,
  Settings,
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Users,
  Sparkles
} from "lucide-react";

const profileSchema = z.object({
  avatar: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
});

const organizationSchema = z.object({
  description: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  logo: z.string().optional(),
  businessHours: z.string().optional(),
});

const settingsSchema = z.object({
  currency: z.string(),
  language: z.string(),
  notifications: z.boolean(),
  emailNotifications: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type OrganizationForm = z.infer<typeof organizationSchema>;
type SettingsForm = z.infer<typeof settingsSchema>;

interface OnboardingWizardProps {
  user: any;
  organization: any;
  onComplete: () => void;
}

export default function OnboardingWizard({ user, organization, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = 4;

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      avatar: "",
      phone: "",
      timezone: "America/Santo_Domingo",
    },
  });

  const organizationForm = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      description: "",
      address: "",
      website: "",
      logo: "",
      businessHours: "8:00 AM - 6:00 PM",
    },
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      currency: "DOP",
      language: "es",
      notifications: true,
      emailNotifications: true,
    },
  });

  const progress = (currentStep / totalSteps) * 100;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Submit all forms data
      const profileData = profileForm.getValues();
      const organizationData = organizationForm.getValues();
      const settingsData = settingsForm.getValues();

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          organizationId: organization.id,
          profile: profileData,
          organization: organizationData,
          settings: settingsData,
        }),
      });

      if (response.ok) {
        onComplete();
      } else {
        const error = await response.json();
        console.error('Onboarding error:', error);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold mb-2">
          ¡Bienvenido a Billtracky, {user?.firstName}!
        </h2>
        <p className="text-gray-600 text-lg">
          Estamos emocionados de tenerte aquí. Vamos a configurar tu cuenta en unos pocos pasos.
        </p>
      </div>
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">¿Qué vamos a configurar?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>Tu perfil personal</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Información de tu empresa</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <span>Configuración inicial</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Completa tu Perfil</h2>
        <p className="text-gray-600">Añade información personal para personalizar tu experiencia</p>
      </div>

      <form className="space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profileForm.watch("avatar")} />
              <AvatarFallback className="text-2xl">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="sm"
              className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="phone"
                {...profileForm.register("phone")}
                placeholder="809-555-0123"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="timezone">Zona Horaria</Label>
            <Select
              value={profileForm.watch("timezone")}
              onValueChange={(value) => profileForm.setValue("timezone", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona zona horaria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Santo_Domingo">República Dominicana (GMT-4)</SelectItem>
                <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                <SelectItem value="America/Mexico_City">Mexico City (GMT-6)</SelectItem>
                <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </form>
    </div>
  );

  const renderOrganizationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Información de tu Negocio</h2>
        <p className="text-gray-600">Personaliza la información de {organization?.name}</p>
      </div>

      <form className="space-y-4">
        <div>
          <Label htmlFor="description">Descripción del Negocio</Label>
          <Textarea
            id="description"
            {...organizationForm.register("description")}
            placeholder="Describe brevemente tu lavandería..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="address">Dirección</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="address"
              {...organizationForm.register("address")}
              placeholder="Calle Principal #123, Ciudad"
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="website">Sitio Web</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="website"
                {...organizationForm.register("website")}
                placeholder="https://tulavanderia.com"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="businessHours">Horario de Atención</Label>
            <Input
              id="businessHours"
              {...organizationForm.register("businessHours")}
              placeholder="8:00 AM - 6:00 PM"
            />
          </div>
        </div>
      </form>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configuración Inicial</h2>
        <p className="text-gray-600">Establece las preferencias básicas del sistema</p>
      </div>

      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <Select
              value={settingsForm.watch("currency")}
              onValueChange={(value) => settingsForm.setValue("currency", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOP">Peso Dominicano (DOP)</SelectItem>
                <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="language">Idioma</Label>
            <Select
              value={settingsForm.watch("language")}
              onValueChange={(value) => settingsForm.setValue("language", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">Notificaciones en la App</h3>
              <p className="text-sm text-gray-600">Recibe alertas y actualizaciones en tiempo real</p>
            </div>
            <input
              type="checkbox"
              {...settingsForm.register("notifications")}
              className="w-4 h-4"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">Notificaciones por Email</h3>
              <p className="text-sm text-gray-600">Recibe reportes y actualizaciones por correo</p>
            </div>
            <input
              type="checkbox"
              {...settingsForm.register("emailNotifications")}
              className="w-4 h-4"
            />
          </div>
        </div>
      </form>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderWelcomeStep();
      case 2:
        return renderProfileStep();
      case 3:
        return renderOrganizationStep();
      case 4:
        return renderSettingsStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg">Configuración Inicial</CardTitle>
            <span className="text-sm text-gray-500">
              Paso {currentStep} de {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStep()}

          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                className="flex items-center gap-2"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Finalizando..." : "Completar Configuración"}
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}