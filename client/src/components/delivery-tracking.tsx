import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Package,
  User,
  Calendar,
  Timer,
  BarChart3,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import type { OrderTimestamp, DeliveryMetrics } from '@shared/schema';

interface DeliveryTrackingProps {
  invoiceId: string;
  invoiceNumber: string;
  currentStatus: string;
  customerName: string;
  onBack?: () => void;
}

interface DeliveryAnalytics {
  avgProcessingTime: number;
  avgTotalTime: number;
  onTimePercentage: number;
  totalOrders: number;
  delayedOrders: number;
  byServiceType: Record<string, any>;
  byPriority: Record<string, any>;
}

const statusOrder = ['received', 'in_process', 'ready', 'delivered'];
const statusIcons = {
  received: Package,
  in_process: Activity,
  ready: CheckCircle,
  delivered: CheckCircle,
  cancelled: AlertCircle,
};

const statusColors = {
  received: 'bg-blue-100 text-blue-800 border-blue-300',
  in_process: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ready: 'bg-purple-100 text-purple-800 border-purple-300',
  delivered: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const statusLabels = {
  received: 'Recibido',
  in_process: 'En Proceso',
  ready: 'Listo para Entrega',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export default function DeliveryTracking({
  invoiceId,
  invoiceNumber,
  currentStatus,
  customerName,
  onBack
}: DeliveryTrackingProps) {
  const [selectedTab, setSelectedTab] = useState('timeline');

  // Fetch order timestamps
  const { data: timestamps = [], isLoading: timestampsLoading } = useQuery<OrderTimestamp[]>({
    queryKey: [`/api/invoices/${invoiceId}/timestamps`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/invoices/${invoiceId}/timestamps`);
      return response.json();
    },
  });

  // Fetch delivery metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DeliveryMetrics>({
    queryKey: [`/api/invoices/${invoiceId}/delivery-metrics`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/invoices/${invoiceId}/delivery-metrics`);
      return response.json();
    },
  });

  // Fetch delivery analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<DeliveryAnalytics>({
    queryKey: ['/api/delivery-analytics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/delivery-analytics');
      return response.json();
    },
  });

  const formatDuration = (minutes: number | null | undefined): string => {
    if (!minutes || minutes === 0) return 'N/A';

    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  };

  const getProgressPercentage = (status: string): number => {
    const index = statusOrder.indexOf(status);
    return index >= 0 ? ((index + 1) / statusOrder.length) * 100 : 0;
  };

  const isStatusCompleted = (status: string): boolean => {
    const currentIndex = statusOrder.indexOf(currentStatus);
    const statusIndex = statusOrder.indexOf(status);
    return statusIndex <= currentIndex;
  };

  if (timestampsLoading || metricsLoading) {
    return (
      <div className="space-y-6">
        <Card className="tech3d-primary-card">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="tech-text-glow text-lg">📊 Cargando información de entrega...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tech-text-glow">📊 Seguimiento de Entrega</h1>
          <p className="text-muted-foreground mt-2">
            Orden #{invoiceNumber} - {customerName}
          </p>
        </div>
        {onBack && (
          <Button onClick={onBack} variant="outline" className="tech3d-button-secondary">
            ← Volver
          </Button>
        )}
      </div>

      {/* Progress Overview */}
      <Card className="tech3d-primary-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 tech-text-glow">
            <Timer className="w-5 h-5" />
            Progreso de la Orden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={getProgressPercentage(currentStatus)} className="h-3" />
            <div className="flex justify-between items-center">
              {statusOrder.map((status) => {
                const Icon = statusIcons[status as keyof typeof statusIcons];
                const isCompleted = isStatusCompleted(status);
                const isCurrent = status === currentStatus;

                return (
                  <div key={status} className="flex flex-col items-center space-y-2">
                    <div className={`p-3 rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : isCurrent
                        ? 'bg-blue-100 border-blue-500 text-blue-700 animate-pulse'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium ${
                      isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {statusLabels[status as keyof typeof statusLabels]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">📅 Cronología</TabsTrigger>
          <TabsTrigger value="metrics">📊 Métricas</TabsTrigger>
          <TabsTrigger value="analytics">📈 Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card className="tech3d-primary-card">
            <CardHeader>
              <CardTitle className="tech-text-glow">Historial de Estados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timestamps.length > 0 ? (
                  timestamps.map((timestamp, index) => {
                    const Icon = statusIcons[timestamp.status as keyof typeof statusIcons];
                    return (
                      <div key={timestamp.id} className="flex items-start space-x-4 pb-4 border-b border-gray-200 last:border-b-0">
                        <div className={`p-2 rounded-full ${statusColors[timestamp.status as keyof typeof statusColors]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">
                              {statusLabels[timestamp.status as keyof typeof statusLabels]}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {formatDuration(timestamp.duration)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(timestamp.timestamp || '').toLocaleString('es-DO')}
                          </p>
                          {timestamp.notes && (
                            <p className="text-sm text-gray-600 mt-1">{timestamp.notes}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Empleado ID: {timestamp.employeeId}
                            </span>
                            {timestamp.previousStatus && (
                              <span>Desde: {statusLabels[timestamp.previousStatus as keyof typeof statusLabels]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay historial de seguimiento disponible</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="tech3d-primary-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Timer className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tiempo de Procesamiento</p>
                      <p className="text-lg font-bold">{formatDuration(metrics.processingTime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="tech3d-primary-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tiempo Total</p>
                      <p className="text-lg font-bold">{formatDuration(metrics.totalTime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="tech3d-primary-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tiempo Estimado</p>
                      <p className="text-lg font-bold">{metrics.estimatedDeliveryTime}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="tech3d-primary-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className={`w-5 h-5 ${metrics.onTimeDelivery ? 'text-green-500' : 'text-red-500'}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Entrega</p>
                      <p className={`text-lg font-bold ${metrics.onTimeDelivery ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.onTimeDelivery ? 'A Tiempo' : 'Retrasada'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="tech3d-primary-card">
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No hay métricas de entrega disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && !analyticsLoading ? (
            <div className="space-y-6">
              {/* Overall Performance */}
              <Card className="tech3d-primary-card">
                <CardHeader>
                  <CardTitle className="tech-text-glow">Rendimiento General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{analytics.totalOrders}</p>
                      <p className="text-sm text-muted-foreground">Total Órdenes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{analytics.onTimePercentage.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">Entrega a Tiempo</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{formatDuration(analytics.avgProcessingTime)}</p>
                      <p className="text-sm text-muted-foreground">Tiempo Prom. Procesamiento</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{formatDuration(analytics.avgTotalTime)}</p>
                      <p className="text-sm text-muted-foreground">Tiempo Prom. Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Service Type Performance */}
              <Card className="tech3d-primary-card">
                <CardHeader>
                  <CardTitle className="tech-text-glow">Rendimiento por Tipo de Servicio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.byServiceType).map(([serviceType, data]) => (
                      <div key={serviceType} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold capitalize">{serviceType}</h4>
                          <p className="text-sm text-muted-foreground">{data.count} órdenes</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatDuration(data.avgTime)}</p>
                          <p className="text-sm text-green-600">{data.onTime}/{data.count} a tiempo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="tech3d-primary-card">
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Cargando análisis de entrega...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}