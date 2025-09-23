import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  DollarSign, 
  Printer, 
  X, 
  Check, 
  Clock, 
  Package, 
  AlertCircle,
  Phone,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Landmark,
  RefreshCw,
  CheckCircle,
  XCircle,
  Trash2,
  MoreVertical,
  ChevronDown,
  Settings,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import type { Invoice, InvoiceItem, PaymentMethod } from '@shared/schema';
import DeliveryTracking from './delivery-tracking';

// Helper function for authenticated API requests
async function authenticatedRequest(url: string, method: string, data?: any) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-access-code': localStorage.getItem('employeeAccessCode') || '',
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  
  return res.json();
}

interface OrderWithItems extends Invoice {
  items?: InvoiceItem[];
}

interface OrderManagementProps {
  onNotification: (message: string) => void;
}

export default function OrderManagement({ onNotification }: OrderManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showWorkTicketModal, setShowWorkTicketModal] = useState(false);
  const [showDeliveryTracking, setShowDeliveryTracking] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  const queryClient = useQueryClient();

  // Obtener órdenes
  const { 
    data: orders = [], 
    isLoading: ordersLoading, 
    error: ordersError, 
    refetch: refetchOrders 
  } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    retry: 2,
    retryDelay: 1000,
  });

  // Obtener métodos de pago
  const { 
    data: paymentMethods = [], 
    isLoading: paymentMethodsLoading, 
    error: paymentMethodsError, 
    refetch: refetchPaymentMethods 
  } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
    retry: 2,
    retryDelay: 1000,
  });

  // Obtener items de la orden seleccionada
  const { 
    data: orderItems = [], 
    isLoading: orderItemsLoading, 
    error: orderItemsError, 
    refetch: refetchOrderItems 
  } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoices', selectedOrder?.id, 'items'],
    enabled: !!selectedOrder?.id,
    retry: 2,
    retryDelay: 1000,
  });

  // Mutaciones
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authenticatedRequest(`/api/invoices/${id}/status`, 'PATCH', { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setShowStatusModal(false);
      onNotification("Estado actualizado: El estado de la orden se ha actualizado exitosamente.");
    },
    onError: (error: any) => {
      onNotification("Error: " + (error.message || "No se pudo actualizar el estado"));
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, paymentMethod, paymentReference }: { id: string; paymentMethod: string; paymentReference?: string }) =>
      authenticatedRequest(`/api/invoices/${id}/pay`, 'PATCH', { paymentMethod, paymentReference }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setShowPaymentModal(false);
      setPaymentReference('');
      setSelectedPaymentMethod('');
      onNotification("Pago procesado: El pago se ha procesado exitosamente.");
    },
    onError: (error: any) => {
      onNotification("Error: " + (error.message || "No se pudo procesar el pago"));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      authenticatedRequest(`/api/invoices/${id}/cancel`, 'PATCH', { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setShowCancelModal(false);
      setCancelReason('');
      onNotification("Orden cancelada: La orden se ha cancelado exitosamente.");
    },
    onError: (error: any) => {
      onNotification("Error: " + (error.message || "No se pudo cancelar la orden"));
    },
  });

  // Error handling effects
  useEffect(() => {
    if (ordersError) {
      onNotification("Error al cargar órdenes: " + (ordersError instanceof Error ? ordersError.message : "No se pudieron cargar las órdenes"));
    }
  }, [ordersError, onNotification]);

  useEffect(() => {
    if (paymentMethodsError) {
      onNotification("Error al cargar métodos de pago: " + (paymentMethodsError instanceof Error ? paymentMethodsError.message : "No se pudieron cargar los métodos de pago"));
    }
  }, [paymentMethodsError, onNotification]);

  useEffect(() => {
    if (orderItemsError) {
      onNotification("Error al cargar items de la orden: " + (orderItemsError instanceof Error ? orderItemsError.message : "No se pudieron cargar los items de la orden"));
    }
  }, [orderItemsError, onNotification]);

  // Configuración de estados con colores pasteles profesionales
  const statusConfig = {
    received: { name: 'Recibido', colorClass: 'bg-sky-200 text-sky-800 border border-sky-300 px-2 py-1 text-xs font-semibold rounded-full', icon: Package },
    in_process: { name: 'En Proceso', colorClass: 'bg-amber-200 text-amber-800 border border-amber-300 px-2 py-1 text-xs font-semibold rounded-full', icon: RefreshCw },
    ready: { name: 'Listo para Entrega', colorClass: 'bg-violet-200 text-violet-800 border border-violet-300 px-2 py-1 text-xs font-semibold rounded-full', icon: CheckCircle },
    delivered: { name: 'Entregado', colorClass: 'bg-emerald-200 text-emerald-800 border border-emerald-300 px-2 py-1 text-xs font-semibold rounded-full', icon: Check },
    cancelled: { name: 'Cancelado', colorClass: 'bg-rose-200 text-rose-800 border border-rose-300 px-2 py-1 text-xs font-semibold rounded-full', icon: XCircle },
  };

  // Helper function para obtener clases de estado con colores pasteles profesionales
  const getStatusClasses = (status: string | null) => {
    // Pastel colors with dark text for AA contrast + professional appearance
    if (!status) return 'bg-slate-200 text-slate-800 border border-slate-300 px-2 py-1 text-xs font-semibold rounded-full';
    
    switch(status) {
      case 'received': return 'bg-sky-200 text-sky-800 border border-sky-300 px-2 py-1 text-xs font-semibold rounded-full';
      case 'in_process': return 'bg-amber-200 text-amber-800 border border-amber-300 px-2 py-1 text-xs font-semibold rounded-full';
      case 'ready': return 'bg-violet-200 text-violet-800 border border-violet-300 px-2 py-1 text-xs font-semibold rounded-full';
      case 'delivered': return 'bg-emerald-200 text-emerald-800 border border-emerald-300 px-2 py-1 text-xs font-semibold rounded-full';
      case 'cancelled': return 'bg-rose-200 text-rose-800 border border-rose-300 px-2 py-1 text-xs font-semibold rounded-full';
      default: return 'bg-slate-200 text-slate-800 border border-slate-300 px-2 py-1 text-xs font-semibold rounded-full';
    }
  };

  // Helper function para obtener clases de pago de forma segura
  const getPaymentClasses = (paid: boolean | null) => {
    return paid ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 text-green-300 border border-green-400/30 tech-glow' : 'bg-gradient-to-br from-yellow-500/20 to-orange-600/20 text-yellow-300 border border-yellow-400/30 tech-glow';
  };

  const paymentMethodConfig = {
    cash: { name: 'Efectivo', icon: Banknote, color: 'text-green-600 dark:text-green-400' },
    card: { name: 'Tarjeta', icon: CreditCard, color: 'text-blue-600 dark:text-blue-400' },
    tarjeta: { name: 'Tarjeta', icon: CreditCard, color: 'text-blue-600 dark:text-blue-400' },
    transfer: { name: 'Transferencia', icon: Landmark, color: 'text-indigo-600 dark:text-indigo-400' },
    tansferencia: { name: 'Transferencia', icon: Landmark, color: 'text-indigo-600 dark:text-indigo-400' },
    mobile_pay: { name: 'Pago Móvil', icon: Phone, color: 'text-purple-600 dark:text-purple-400' },
    pending: { name: 'Pendiente', icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
  };

  // Funciones utilitarias
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `RD$${num.toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filtrar órdenes
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm) || false;
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    // Filtrado mejorado por método de pago
    const matchesPayment = filterPayment === 'all' || 
                          (filterPayment === 'paid' && order.paid) ||
                          (filterPayment === 'pending' && !order.paid) ||
                          (order.paid && order.paymentMethod === filterPayment);
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Funciones de acción
  const openWorkTicketModal = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setShowWorkTicketModal(true);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!selectedOrder) return;
    statusMutation.mutate({ id: selectedOrder.id, status: newStatus });
  };

  const handlePayment = () => {
    if (!selectedOrder || !selectedPaymentMethod) return;
    
    const method = paymentMethods.find(pm => pm.code === selectedPaymentMethod);
    if (!method) {
      onNotification("Error: Método de pago no encontrado");
      return;
    }

    paymentMutation.mutate({
      id: selectedOrder.id,
      paymentMethod: selectedPaymentMethod,
      paymentReference: method.requiresReference ? paymentReference : undefined
    });
  };

  const handleDirectPayment = (order: OrderWithItems, paymentMethodCode: string) => {
    const method = paymentMethods.find(pm => pm.code === paymentMethodCode);
    if (!method) {
      onNotification("Error: Método de pago no encontrado");
      return;
    }

    // Si el método requiere referencia, abrir el modal completo
    if (method.requiresReference) {
      setSelectedOrder(order);
      setSelectedPaymentMethod(paymentMethodCode);
      setShowPaymentModal(true);
      return;
    }

    // Para métodos que no requieren referencia, cobrar directamente
    paymentMutation.mutate({
      id: order.id,
      paymentMethod: paymentMethodCode,
      paymentReference: undefined
    }, {
      onSuccess: () => {
        onNotification(`✅ Pago registrado en ${method.name} - Orden ${order.number}`);
      }
    });
  };

  const handleCancel = () => {
    if (!selectedOrder || !cancelReason.trim()) return;
    cancelMutation.mutate({ id: selectedOrder.id, reason: cancelReason });
  };

  const openDetailsModal = (order: Invoice) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const isLoading = ordersLoading || paymentMethodsLoading;
  const hasError = ordersError || paymentMethodsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-foreground" />
        <span className="ml-2 text-foreground">Cargando órdenes...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Error al cargar datos</h3>
          <p className="text-muted-foreground">No se pudieron cargar las órdenes o métodos de pago</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => refetchOrders()} 
            variant="outline"
            data-testid="button-retry-orders"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar Órdenes
          </Button>
          <Button 
            onClick={() => refetchPaymentMethods()} 
            variant="outline"
            data-testid="button-retry-payment-methods"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar Métodos de Pago
          </Button>
        </div>
      </div>
    );
  }

  // Show delivery tracking if enabled
  if (showDeliveryTracking && selectedOrder) {
    return (
      <DeliveryTracking
        invoiceId={selectedOrder.id}
        invoiceNumber={selectedOrder.number}
        currentStatus={selectedOrder.status || 'received'}
        customerName={selectedOrder.customerName}
        onBack={() => {
          setShowDeliveryTracking(false);
          setSelectedOrder(null);
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Órdenes</h1>
          <p className="text-muted-foreground">Administra el estado y pago de las órdenes</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="tech-button-3d bg-white border-2 border-violet-300 text-violet-700 dark:from-purple-500/20 dark:to-pink-600/20 dark:text-white dark:border-purple-500/30 rounded-xl shadow-sm px-4 py-2 hover:bg-violet-50 hover:border-violet-400 dark:hover:from-purple-400/30 dark:hover:to-pink-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span className="font-bold">{filteredOrders.length} órdenes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="bg-card dark:bg-gray-800/50 dark:shadow-lg tech-glow border border-border dark:border-cyan-500/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400 h-4 w-4" />
              <Input
                placeholder="Buscar por número, cliente o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 tech-button-3d bg-white border-2 border-blue-300 text-blue-700 dark:from-blue-500/20 dark:to-blue-600/20 dark:text-white dark:border-blue-500/30 rounded-lg shadow-sm hover:bg-blue-50 hover:border-blue-400 dark:hover:from-blue-400/30 dark:hover:to-blue-500/30 transition-all duration-300 focus:ring-2 focus:ring-blue-500/50"
                data-testid="input-search-orders"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus} data-testid="select-status-filter">
              <SelectTrigger className="tech-button-3d bg-white border-2 border-orange-300 text-orange-700 dark:from-orange-500/20 dark:to-orange-600/20 dark:text-white dark:border-orange-500/30 rounded-lg shadow-sm hover:bg-orange-50 hover:border-orange-400 dark:hover:from-orange-400/30 dark:hover:to-orange-500/30 transition-all duration-300">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="received">Recibido</SelectItem>
                <SelectItem value="in_process">En Proceso</SelectItem>
                <SelectItem value="ready">Listo</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPayment} onValueChange={setFilterPayment} data-testid="select-payment-filter">
              <SelectTrigger className="tech-button-3d bg-white border-2 border-emerald-300 text-emerald-700 dark:from-emerald-500/20 dark:to-emerald-600/20 dark:text-white dark:border-emerald-500/30 rounded-lg shadow-sm hover:bg-emerald-50 hover:border-emerald-400 dark:hover:from-emerald-400/30 dark:hover:to-emerald-500/30 transition-all duration-300">
                <SelectValue placeholder="Métodos de Pago" />
              </SelectTrigger>
              <SelectContent className="tech-button-3d bg-white dark:from-slate-800 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-500/50 shadow-xl">
                <SelectItem value="all">Todos los pagos</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <div className="border-t border-emerald-300 dark:border-emerald-500/50 my-2 mx-2"></div>
                {paymentMethods.filter(pm => pm.active).map((method) => {
                  const config = paymentMethodConfig[method.code as keyof typeof paymentMethodConfig] || { name: method.name, icon: CreditCard, color: 'text-emerald-600' };
                  const IconComponent = config.icon;
                  return (
                    <SelectItem key={method.code} value={method.code} className="hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30 py-3">
                      <div className="flex items-center gap-3">
                        <IconComponent className={`h-4 w-4 ${config.color}`} />
                        <span className="font-medium">{method.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterPayment('all');
              }}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de órdenes */}
      <div className="grid gap-6">
        {filteredOrders.map((order) => {
          const status = statusConfig[order.status as keyof typeof statusConfig];
          const StatusIcon = status?.icon || Package;
          const paymentMethod = paymentMethodConfig[order.paymentMethod as keyof typeof paymentMethodConfig];
          
          return (
            <Card key={order.id} className="tech-button-3d bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 hover:shadow-xl dark:hover:shadow-cyan-500/25 border-2 border-slate-200 dark:border-cyan-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl" data-testid={`card-order-${order.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="space-y-1">
                      <div className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" data-testid={`text-order-number-${order.id}`}>
                        {order.number}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {formatDate(order.date)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 dark:text-slate-200" data-testid={`text-customer-name-${order.id}`}>
                        <User className="w-4 h-4 inline mr-2 text-slate-500" />
                        {order.customerName}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {order.customerPhone}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Badge className="tech-button-3d bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-300 dark:border-blue-500/50 text-blue-800 dark:text-blue-300 font-bold px-3 py-1 rounded-lg shadow-lg" data-testid={`badge-status-${order.id}`}>
                        <StatusIcon className="h-4 w-4 mr-2" />
                        {status?.name || order.status}
                      </Badge>
                      {order.paid ? (
                        <div className="tech-button-3d bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/30 dark:to-emerald-800/30 border-2 border-green-400 dark:border-green-500/50 text-green-800 dark:text-green-300 px-2 py-1 rounded-lg text-xs font-bold flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          PAGADO - {(() => {
                            const method = paymentMethods.find(pm => pm.code === order.paymentMethod);
                            const config = paymentMethodConfig[order.paymentMethod as keyof typeof paymentMethodConfig];
                            return config ? config.name : (method?.name || order.paymentMethod || 'Método desconocido');
                          })()}
                        </div>
                      ) : (
                        <div className="tech-button-3d bg-gradient-to-br from-yellow-100 to-orange-200 dark:from-yellow-900/30 dark:to-orange-800/30 border-2 border-yellow-400 dark:border-yellow-500/50 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-lg text-xs font-bold flex items-center animate-pulse">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          COBRO PENDIENTE
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="font-black text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent" data-testid={`text-total-${order.id}`}>
                        {formatCurrency(order.total)}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(order.deliveryDate)}
                      </div>
                    </div>
                    
                    
                    {/* Panel de acciones profesionales */}
                    <div className="flex items-center gap-3 justify-end">
                      {/* BOTÓN DE COBRO DESPLEGABLE para pagos pendientes */}
                      {!order.paid && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              disabled={paymentMutation.isPending}
                              className="tech-button-3d bg-white border-2 border-emerald-300 text-emerald-700 dark:from-green-500/20 dark:to-emerald-600/20 dark:text-white dark:border-emerald-500/30 rounded-lg shadow-sm p-3 hover:bg-emerald-50 hover:border-emerald-400 dark:hover:from-green-400/30 dark:hover:to-emerald-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm font-bold disabled:opacity-50"
                              data-testid={`button-collect-payment-${order.id}`}
                              title="Cobrar pago - seleccionar método"
                            >
                              {paymentMutation.isPending ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  PROCESANDO...
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  COBRAR
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-56 tech-button-3d bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-500/50 shadow-2xl backdrop-blur-sm">
                            {paymentMethods.filter((method: PaymentMethod) => method.active && method.code !== 'pending').map((method: PaymentMethod) => {
                              const config = paymentMethodConfig[method.code as keyof typeof paymentMethodConfig] || { name: method.name, icon: CreditCard, color: 'text-gray-600' };
                              const IconComponent = config.icon;
                              return (
                                <DropdownMenuItem
                                  key={method.id}
                                  onClick={() => !paymentMutation.isPending && handleDirectPayment(order, method.code)}
                                  disabled={paymentMutation.isPending}
                                  className={`hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30 text-emerald-800 dark:text-emerald-300 font-semibold py-3 cursor-pointer ${paymentMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  data-testid={`button-pay-${method.code}-${order.id}`}
                                >
                                  <IconComponent className={`mr-3 h-4 w-4 ${config.color}`} />
                                  {method.name}
                                  {method.requiresReference && <span className="ml-auto text-xs opacity-70">(con ref.)</span>}
                                </DropdownMenuItem>
                              );
                            })}
                            <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-emerald-300 to-transparent dark:via-emerald-600" />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowPaymentModal(true);
                              }}
                              className="hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 text-blue-800 dark:text-blue-300 font-semibold py-3"
                              data-testid={`button-payment-modal-${order.id}`}
                            >
                              <Settings className="mr-3 h-4 w-4" />
                              Más opciones...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      
                      {/* Botones de acción principales mejorados */}
                      <Button
                        size="sm"
                        onClick={() => openDetailsModal(order)}
                        className="tech-button-3d bg-white border-2 border-blue-300 text-blue-700 dark:from-blue-500/20 dark:to-purple-600/20 dark:text-white dark:border-blue-500/30 rounded-lg shadow-sm p-3 hover:bg-blue-50 hover:border-blue-400 dark:hover:from-blue-400/30 dark:hover:to-purple-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm font-semibold"
                        data-testid={`button-details-${order.id}`}
                        title="Ver detalles completos"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => {
                          const phoneNumber = order.customerPhone.replace(/[^\d]/g, '');
                          const message = `¡Hola ${order.customerName}! Tu pedido ${order.number} está ${order.status === 'ready' ? 'listo para recoger' : 'en proceso'}. Total: ${formatCurrency(order.total)}`;
                          const whatsappUrl = `https://wa.me/1${phoneNumber}?text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        className="tech-button-3d bg-white border-2 border-teal-300 text-teal-700 dark:from-teal-500/20 dark:to-green-600/20 dark:text-white dark:border-teal-500/30 rounded-lg shadow-sm p-3 hover:bg-teal-50 hover:border-teal-400 dark:hover:from-teal-400/30 dark:hover:to-green-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm font-semibold"
                        data-testid={`button-whatsapp-${order.id}`}
                        title="Enviar notificación por WhatsApp"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDeliveryTracking(true);
                        }}
                        className="tech-button-3d bg-white border-2 border-cyan-300 text-cyan-700 dark:from-cyan-500/20 dark:to-blue-600/20 dark:text-white dark:border-cyan-500/30 rounded-lg shadow-sm p-3 hover:bg-cyan-50 hover:border-cyan-400 dark:hover:from-cyan-400/30 dark:hover:to-blue-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm font-semibold"
                        data-testid={`button-delivery-tracking-${order.id}`}
                        title="Ver seguimiento de entrega"
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Button>

                      {/* Menú dropdown mejorado con diseño 3D */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="tech-button-3d bg-white border-2 border-slate-300 text-slate-700 dark:from-slate-500/20 dark:to-slate-600/20 dark:text-white dark:border-slate-500/30 rounded-lg shadow-sm p-3 hover:bg-slate-50 hover:border-slate-400 dark:hover:from-slate-400/30 dark:hover:to-slate-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm font-bold"
                            data-testid={`button-actions-${order.id}`}
                            title="Más opciones"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 tech-button-3d bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-600 shadow-2xl backdrop-blur-sm">
                          <DropdownMenuItem
                            onClick={() => openWorkTicketModal(order)}
                            className="hover:bg-gradient-to-br hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30 text-purple-800 dark:text-purple-300 font-semibold py-3"
                            data-testid={`menu-ticket-${order.id}`}
                          >
                            <FileText className="mr-3 h-5 w-5" />
                            Ticket de Trabajo
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => window.print()}
                            className="hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 text-blue-800 dark:text-blue-300 font-semibold py-3"
                            data-testid={`menu-print-${order.id}`}
                          >
                            <Printer className="mr-3 h-5 w-5" />
                            Imprimir Recibo
                          </DropdownMenuItem>
                          
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <>
                              <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
                              
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowStatusModal(true);
                                }}
                                className="hover:bg-gradient-to-br hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/30 dark:hover:to-orange-800/30 text-orange-800 dark:text-orange-300 font-semibold py-3"
                                data-testid={`menu-status-${order.id}`}
                              >
                                <RefreshCw className="mr-3 h-5 w-5" />
                                Cambiar Estado
                              </DropdownMenuItem>
                              
                              {!order.paid && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowPaymentModal(true);
                                  }}
                                  className="hover:bg-gradient-to-br hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30 text-green-800 dark:text-green-300 font-semibold py-3"
                                  data-testid={`menu-payment-${order.id}`}
                                >
                                  <DollarSign className="mr-3 h-5 w-5" />
                                  Procesar Pago
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-slate-400 to-transparent dark:via-slate-500 my-2" />
                              
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowCancelModal(true);
                                }}
                                className="hover:bg-gradient-to-br hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/30 dark:hover:to-red-800/30 text-red-800 dark:text-red-300 font-semibold py-3"
                                data-testid={`menu-cancel-${order.id}`}
                              >
                                <XCircle className="mr-3 h-5 w-5" />
                                Cancelar Orden
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <Card className="bg-card dark:bg-gray-800/50 dark:shadow-lg tech-glow border border-border dark:border-cyan-500/20">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay órdenes</h3>
            <p className="text-muted-foreground">No se encontraron órdenes que coincidan con los filtros aplicados.</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalles */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-card dark:bg-gray-800/50 dark:border-cyan-500/20">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalles de la Orden {selectedOrder?.number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Información del cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Nombre</Label>
                      <div className="mt-1" data-testid="text-detail-customer-name">
                        {selectedOrder.customerName}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Teléfono</Label>
                      <div className="mt-1" data-testid="text-detail-customer-phone">
                        {selectedOrder.customerPhone}
                      </div>
                    </div>
                    {selectedOrder.customerEmail && (
                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <div className="mt-1" data-testid="text-detail-customer-email">
                          {selectedOrder.customerEmail}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Información de la orden */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Información de la Orden
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Estado</Label>
                      <div className="mt-1">
                        <Badge className={getStatusClasses(selectedOrder.status)}>
                          {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.name || selectedOrder.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fecha de recibo</Label>
                      <div className="mt-1" data-testid="text-detail-date">
                        {formatDate(selectedOrder.date)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fecha de entrega</Label>
                      <div className="mt-1" data-testid="text-detail-delivery-date">
                        {formatDate(selectedOrder.deliveryDate)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items de la orden */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Artículos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orderItemsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      <span>Cargando artículos...</span>
                    </div>
                  ) : orderItemsError ? (
                    <div className="text-center py-8 space-y-4">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <div>
                        <p className="text-red-600 font-medium">Error al cargar artículos</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {orderItemsError instanceof Error ? orderItemsError.message : "No se pudieron cargar los artículos"}
                        </p>
                      </div>
                      <Button 
                        onClick={() => refetchOrderItems()} 
                        variant="outline" 
                        size="sm"
                        data-testid="button-retry-order-items"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reintentar
                      </Button>
                    </div>
                  ) : orderItems.length > 0 ? (
                    <div className="space-y-2">
                      {orderItems.map((item, index) => (
                        <div key={item.id} className="flex justify-between items-center p-2 border rounded" data-testid={`item-${index}`}>
                          <div>
                            <div className="font-medium">{item.serviceName}</div>
                            <div className="text-sm text-muted-foreground">Cantidad: {item.quantity}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium" data-testid={`item-total-${index}`}>
                              {formatCurrency(item.total)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(item.unitPrice)} c/u
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No hay artículos para mostrar
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumen financiero */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Resumen Financiero
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span data-testid="text-detail-subtotal">{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ITBIS (18%):</span>
                      <span data-testid="text-detail-tax">{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span data-testid="text-detail-total">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estado del pago:</span>
                      <Badge variant={selectedOrder.paid ? "default" : "secondary"}>
                        {selectedOrder.paid ? "Pagado" : "Pendiente"}
                      </Badge>
                    </div>
                    {selectedOrder.paymentMethod && selectedOrder.paymentMethod !== 'pending' && (
                      <div className="flex justify-between">
                        <span>Método de pago:</span>
                        <span>{paymentMethodConfig[selectedOrder.paymentMethod as keyof typeof paymentMethodConfig]?.name}</span>
                      </div>
                    )}
                    {selectedOrder.paymentReference && (
                      <div className="flex justify-between">
                        <span>Referencia:</span>
                        <span>{selectedOrder.paymentReference}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Información de cancelación si aplica */}
              {selectedOrder.status === 'cancelled' && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      Información de Cancelación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm font-medium">Fecha de cancelación</Label>
                        <div className="mt-1">{formatDate(selectedOrder.cancelledAt)}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Motivo de cancelación</Label>
                        <div className="mt-1">{selectedOrder.cancellationReason}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de cambio de estado */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado de la Orden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>¿Qué estado deseas asignar a la orden <strong>{selectedOrder?.number}</strong>?</p>
            <div className="grid grid-cols-2 gap-2">
              {['received', 'in_process', 'ready', 'delivered'].map((status) => {
                const config = statusConfig[status as keyof typeof statusConfig];
                const Icon = config.icon;
                return (
                  <Button
                    key={status}
                    variant="outline"
                    className="h-auto p-4"
                    onClick={() => handleStatusChange(status)}
                    disabled={statusMutation.isPending}
                    data-testid={`button-set-status-${status}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Icon className="h-6 w-6" />
                      <span>{config.name}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de pago profesional mejorado */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="tech-button-3d bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-green-200 dark:border-green-500/50 shadow-2xl max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              Cobrar Pago
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Información de la orden */}
            <div className="tech-button-3d bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
              <div className="text-center space-y-2">
                <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                  Orden: {selectedOrder?.number}
                </div>
                <div className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {selectedOrder && formatCurrency(selectedOrder.total)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Cliente: {selectedOrder?.customerName}
                </div>
              </div>
            </div>
            
            {/* Método de pago */}
            <div className="space-y-3">
              <Label className="text-lg font-bold text-slate-700 dark:text-slate-300">Método de pago</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} data-testid="select-payment-method">
                <SelectTrigger className="tech-button-3d border-2 border-slate-300 dark:border-slate-600 rounded-lg h-12 text-lg">
                  <SelectValue placeholder="Selecciona cómo pagar" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-[60]">
                  {paymentMethods.filter((pm: PaymentMethod) => pm.active && pm.code !== 'pending').map((method: PaymentMethod) => {
                    const config = paymentMethodConfig[method.code as keyof typeof paymentMethodConfig] || { name: method.name, icon: CreditCard, color: 'text-gray-600' };
                    const IconComponent = config.icon;
                    return (
                      <SelectItem key={method.id} value={method.code} className="hover:bg-green-50 dark:hover:bg-green-900/20 py-3 text-base cursor-pointer">
                        <div className="flex items-center gap-3">
                          <IconComponent className={`h-5 w-5 ${config.color}`} />
                          {method.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Referencia si es necesaria */}
            {(() => {
              const method = paymentMethods.find((pm: PaymentMethod) => pm.code === selectedPaymentMethod);
              return method?.requiresReference && (
                <div className="space-y-3">
                  <Label className="text-lg font-bold text-slate-700 dark:text-slate-300">Referencia de pago</Label>
                  <Input
                    id="payment-reference"
                    placeholder="Número de referencia o código"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="tech-button-3d border-2 border-slate-300 dark:border-slate-600 rounded-lg h-12 text-lg"
                    data-testid="input-payment-reference"
                  />
                </div>
              );
            })()}
            
            {/* Botones de acción */}
            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowPaymentModal(false)} 
                className="tech-button-3d flex-1 bg-white border-2 border-slate-300 text-slate-700 dark:from-slate-500/20 dark:to-slate-600/20 dark:text-white dark:border-slate-500/30 rounded-lg shadow-sm p-3 hover:bg-slate-50 hover:border-slate-400 dark:hover:from-slate-400/30 dark:hover:to-slate-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm font-bold"
                data-testid="button-cancel-payment"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={!selectedPaymentMethod || paymentMutation.isPending}
                className="tech-button-3d flex-1 bg-white border-2 border-emerald-300 text-emerald-700 dark:from-green-500/20 dark:to-emerald-600/20 dark:text-white dark:border-emerald-500/30 rounded-lg shadow-sm p-3 hover:bg-emerald-50 hover:border-emerald-400 dark:hover:from-green-400/30 dark:hover:to-emerald-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm font-bold disabled:opacity-50"
                data-testid="button-process-payment"
              >
                {paymentMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Procesando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    COBRAR AHORA
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de cancelación */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Orden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>¿Estás seguro de que deseas cancelar la orden <strong>{selectedOrder?.number}</strong>?</p>
            <div>
              <Label htmlFor="cancel-reason">Motivo de cancelación *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Explica el motivo de la cancelación..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                data-testid="textarea-cancel-reason"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelModal(false)} data-testid="button-cancel-cancel">
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                data-testid="button-confirm-cancel"
              >
                {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelación"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de ticket de trabajo */}
      <Dialog open={showWorkTicketModal} onOpenChange={setShowWorkTicketModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-work-ticket">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Ticket de Trabajo - Orden {selectedOrder?.number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Información del cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Cliente: {selectedOrder.customerName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Teléfono:</span> {selectedOrder.customerPhone}
                    </div>
                    <div>
                      <span className="font-medium">Fecha de entrega:</span> {formatDate(selectedOrder.deliveryDate)}
                    </div>
                    <div>
                      <span className="font-medium">Estado:</span> 
                      <Badge className={`${getStatusClasses(selectedOrder.status)} ml-2`}>
                        {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.name || selectedOrder.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Desglose de prendas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    Desglose de Prendas a Procesar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderItemsLoading ? (
                      <p className="text-center text-muted-foreground" data-testid="text-loading-items">Cargando items...</p>
                    ) : orderItems.length > 0 ? (
                      orderItems.map((item, index) => (
                        <div key={item.id || index} className="border border-border dark:border-cyan-500/20 rounded-lg p-4 bg-card dark:bg-gray-800/50" data-testid={`work-ticket-item-${index}`}>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div>
                              <h4 className="font-semibold text-purple-700 dark:text-purple-300" data-testid={`item-service-name-${index}`}>
                                {item.serviceName}
                              </h4>
                              <p className="text-sm text-muted-foreground" data-testid={`item-quantity-${index}`}>
                                Cantidad: {item.quantity}
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm">Servicios a realizar:</h5>
                              <div className="space-y-1" data-testid={`service-indicators-${index}`}>
                                {item.serviceType === 'wash' && (
                                  <div className="flex items-center gap-2" data-testid={`wash-indicator-${index}`}>
                                    <div className="w-3 h-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-sm dark:shadow-cyan-400/20"></div>
                                    <span className="text-sm">Lavado</span>
                                  </div>
                                )}
                                {item.serviceType === 'iron' && (
                                  <div className="flex items-center gap-2" data-testid={`iron-indicator-${index}`}>
                                    <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-sm dark:shadow-orange-400/20"></div>
                                    <span className="text-sm">Planchado</span>
                                  </div>
                                )}
                                {item.serviceType === 'both' && (
                                  <>
                                    <div className="flex items-center gap-2" data-testid={`wash-indicator-${index}`}>
                                      <div className="w-3 h-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-sm dark:shadow-cyan-400/20"></div>
                                      <span className="text-sm">Lavado</span>
                                    </div>
                                    <div className="flex items-center gap-2" data-testid={`iron-indicator-${index}`}>
                                      <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-sm dark:shadow-orange-400/20"></div>
                                      <span className="text-sm">Planchado</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">Precio unitario:</p>
                              <p className="font-semibold" data-testid={`item-unit-price-${index}`}>{formatCurrency(item.unitPrice)}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">Total:</p>
                              <p className="font-bold text-green-600" data-testid={`item-total-${index}`}>{formatCurrency(item.total)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground" data-testid="text-no-items">No hay items en esta orden</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Resumen del ticket */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Resumen de Trabajo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 tech-glow rounded-lg" data-testid="wash-counter">
                      <div className="font-bold text-lg text-cyan-300" data-testid="wash-count">
                        {orderItems.filter(item => item.serviceType === 'wash' || item.serviceType === 'both').reduce((acc, item) => acc + item.quantity, 0)}
                      </div>
                      <div className="text-cyan-300">Prendas para lavar</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-400/30 tech-glow rounded-lg" data-testid="iron-counter">
                      <div className="font-bold text-lg text-orange-300" data-testid="iron-count">
                        {orderItems.filter(item => item.serviceType === 'iron' || item.serviceType === 'both').reduce((acc, item) => acc + item.quantity, 0)}
                      </div>
                      <div className="text-orange-300">Prendas para planchar</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30 tech-glow rounded-lg" data-testid="total-counter">
                      <div className="font-bold text-lg text-green-300" data-testid="order-total">
                        {formatCurrency(selectedOrder.total)}
                      </div>
                      <div className="text-green-300">Total de la orden</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}