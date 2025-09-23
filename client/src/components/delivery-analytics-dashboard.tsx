import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  BarChart3,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';

interface DeliveryAnalytics {
  avgProcessingTime: number;
  avgTotalTime: number;
  onTimePercentage: number;
  totalOrders: number;
  delayedOrders: number;
  byServiceType: Record<string, {
    count: number;
    avgTime: number;
    onTime: number;
  }>;
  byPriority: Record<string, {
    count: number;
    avgTime: number;
    onTime: number;
  }>;
}

interface DeliveryAnalyticsDashboardProps {
  onBack?: () => void;
}

export default function DeliveryAnalyticsDashboard({ onBack }: DeliveryAnalyticsDashboardProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch delivery analytics
  const { data: analytics, isLoading, refetch } = useQuery<DeliveryAnalytics>({
    queryKey: ['/api/delivery-analytics', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await apiRequest('GET', `/api/delivery-analytics?${params}`);
      return response.json();
    },
  });

  const formatDuration = (minutes: number | null | undefined): string => {
    if (!minutes || minutes === 0) return '0m';

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

  const handleFilter = () => {
    refetch();
  };

  const handleExport = () => {
    if (!analytics) return;

    const csvData = [
      ['Métrica', 'Valor'],
      ['Total de Órdenes', analytics.totalOrders.toString()],
      ['Tiempo Promedio de Procesamiento', formatDuration(analytics.avgProcessingTime)],
      ['Tiempo Promedio Total', formatDuration(analytics.avgTotalTime)],
      ['Porcentaje de Entrega a Tiempo', `${analytics.onTimePercentage.toFixed(1)}%`],
      ['Órdenes Retrasadas', analytics.delayedOrders.toString()],
      ['', ''],
      ['Por Tipo de Servicio', ''],
      ...Object.entries(analytics.byServiceType).map(([type, data]) => [
        type,
        `${data.count} órdenes, ${formatDuration(data.avgTime)} promedio, ${data.onTime}/${data.count} a tiempo`
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `delivery-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Card className="tech3d-primary-card">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="tech-text-glow text-lg">📊 Cargando análisis de entrega...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tech-text-glow">📈 Análisis de Entregas</h1>
          <p className="text-muted-foreground mt-2">
            Métricas de rendimiento y tiempos de entrega
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onBack && (
            <Button onClick={onBack} variant="outline" className="tech3d-button-secondary">
              ← Volver
            </Button>
          )}
          <Button
            onClick={handleExport}
            variant="outline"
            className="tech3d-button-secondary"
            disabled={!analytics}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="tech3d-primary-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Fecha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="dateFrom">Fecha Desde</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="tech-glow"
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Fecha Hasta</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="tech-glow"
              />
            </div>
            <Button onClick={handleFilter} className="tech3d-button">
              <Filter className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {analytics ? (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="tech3d-primary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Órdenes</p>
                    <p className="text-2xl font-bold">{analytics.totalOrders}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="tech3d-primary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Entrega a Tiempo</p>
                    <p className="text-2xl font-bold text-green-600">
                      {analytics.onTimePercentage.toFixed(1)}%
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <Progress
                  value={analytics.onTimePercentage}
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>

            <Card className="tech3d-primary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tiempo Prom. Procesamiento</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatDuration(analytics.avgProcessingTime)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="tech3d-primary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Órdenes Retrasadas</p>
                    <p className="text-2xl font-bold text-red-600">{analytics.delayedOrders}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Service Type */}
          <Card className="tech3d-primary-card">
            <CardHeader>
              <CardTitle className="tech-text-glow">Rendimiento por Tipo de Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.byServiceType).map(([serviceType, data]) => {
                  const onTimePercentage = data.count > 0 ? (data.onTime / data.count) * 100 : 0;

                  return (
                    <div key={serviceType} className="p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold capitalize flex items-center gap-2">
                          {serviceType === 'wash' && '🧼'}
                          {serviceType === 'iron' && '👔'}
                          {serviceType === 'both' && '🧼👔'}
                          {serviceType === 'unknown' && '❓'}
                          {serviceType}
                        </h4>
                        <Badge variant="outline" className="font-semibold">
                          {data.count} órdenes
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tiempo Promedio</p>
                          <p className="font-bold text-lg">{formatDuration(data.avgTime)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">A Tiempo</p>
                          <p className="font-bold text-lg text-green-600">
                            {data.onTime}/{data.count} ({onTimePercentage.toFixed(1)}%)
                          </p>
                        </div>
                        <div>
                          <Progress value={onTimePercentage} className="mt-2" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Performance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Performance Summary */}
            <Card className="tech3d-primary-card">
              <CardHeader>
                <CardTitle className="tech-text-glow">Resumen de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Órdenes a Tiempo</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {analytics.totalOrders - analytics.delayedOrders}
                      </div>
                      <div className="text-sm text-green-600">
                        {analytics.onTimePercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-medium">Órdenes Retrasadas</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{analytics.delayedOrders}</div>
                      <div className="text-sm text-red-600">
                        {((analytics.delayedOrders / analytics.totalOrders) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Tiempo Promedio Total</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        {formatDuration(analytics.avgTotalTime)}
                      </div>
                      <div className="text-sm text-blue-600">Por orden</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="tech3d-primary-card">
              <CardHeader>
                <CardTitle className="tech-text-glow">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    className="w-full tech3d-button flex items-center justify-between"
                    onClick={() => window.location.href = '#'}
                  >
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Ver Análisis Detallado
                    </span>
                    <span>→</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full tech3d-button-secondary flex items-center justify-between"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setDateFrom(lastWeek);
                      setDateTo(today);
                      refetch();
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Últimos 7 Días
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full tech3d-button-secondary flex items-center justify-between"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setDateFrom(lastMonth);
                      setDateTo(today);
                      refetch();
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Últimos 30 Días
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="tech3d-primary-card">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No hay datos disponibles</h3>
            <p className="text-muted-foreground">
              Ajusta los filtros de fecha para ver análisis de entrega
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}