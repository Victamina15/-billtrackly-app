import { useState } from "react";
import { FileText, LogOut, Home, Package, Users, Settings, CreditCard, BarChart3, Building2, MessageCircle, Menu, X, CheckCircle, Clock, History, Crown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { type Employee, type Invoice } from "@shared/schema";
import InvoiceCreation from "./invoice-creation";
import OrderManagement from "./order-management";
import CustomersGrid from "./customers-grid";
import ServicesConfig from "./services-config";
import PaymentMethodsConfig from "./payment-methods-config";
import CashClosure from "./cash-closure";
import CashClosuresHistory from "./cash-closures-history";
import CompanyConfig from "./company-config";
import WhatsAppConfig from "./whatsapp-config";
import EmployeesManagement from "./employees-management";
import DeliveryAnalyticsDashboard from "./delivery-analytics-dashboard";
import { useQuery } from "@tanstack/react-query";
import logoPath from "@assets/generated_images/BT_fused_single_letter_1577c2b8.png";

interface DashboardProps {
  user: Employee;
  onLogout: () => void;
  onNotification: (message: string) => void;
}

export default function Dashboard({ user, onLogout, onNotification }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery<{
    todayOrders: number;
    todayRevenue: string;
    inProgress: number;
    readyForDelivery: number;
    pendingPayment: number;
    pendingPaymentTotal: string;
  }>({
    queryKey: ["/api/metrics/dashboard"],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const recentOrders = invoices.slice(0, 3);

  // Helper functions para obtener clases de estado con colores pasteles profesionales
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

  const getStatusText = (status: string | null) => {
    if (!status) return 'Desconocido';
    
    switch(status) {
      case 'received': return 'Recibido';
      case 'in_process': return 'En Proceso';
      case 'ready': return 'Listo para Entrega';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "invoices":
        return <InvoiceCreation onNotification={onNotification} />;
      case "orders":
        return <OrderManagement onNotification={onNotification} />;
      case "customers":
        return <CustomersGrid onNotification={onNotification} />;
      case "employees":
        return <EmployeesManagement onNotification={onNotification} />;
      case "services":
        return <ServicesConfig onNotification={onNotification} />;
      case "payment-methods":
        return <PaymentMethodsConfig onNotification={onNotification} />;
      case "cash-closure":
        return <CashClosure onBack={() => setActiveTab('overview')} />;
      case "cash-closures-history":
        return <CashClosuresHistory onBack={() => setActiveTab('overview')} />;
      case "company-config":
        return <CompanyConfig onBack={() => setActiveTab('overview')} />;
      case "whatsapp-config":
        return <WhatsAppConfig onBack={() => setActiveTab('overview')} />;
      case "delivery-analytics":
        return <DeliveryAnalyticsDashboard onBack={() => setActiveTab('overview')} />;
      default:
        return (
          <div>
            {/* Metrics Cards - Vivos y Profesionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="tech-button-3d bg-white border-2 border-violet-300 text-violet-700 dark:from-purple-500/20 dark:to-pink-600/20 dark:text-white dark:border-purple-500/30 rounded-xl shadow-sm p-6 hover:bg-violet-50 hover:border-violet-400 dark:hover:from-purple-400/30 dark:hover:to-pink-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-violet-700 dark:text-purple-300">Órdenes Hoy</p>
                    <p className="text-2xl font-bold text-violet-900 dark:text-white" data-testid="metric-today-orders">
                      {metricsLoading ? "..." : metrics?.todayOrders || 0}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">+3 desde ayer</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg tech-glow">
                    <Package className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="tech-button-3d bg-white border-2 border-emerald-300 text-emerald-700 dark:from-green-500/20 dark:to-cyan-600/20 dark:text-white dark:border-emerald-500/30 rounded-xl shadow-sm p-6 hover:bg-emerald-50 hover:border-emerald-400 dark:hover:from-green-400/30 dark:hover:to-cyan-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Ingresos Hoy</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-white" data-testid="metric-today-revenue">
                      {metricsLoading ? "..." : `RD$${metrics?.todayRevenue || "0.00"}`}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">+15% vs ayer</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg tech-glow">
                    <span className="text-lg font-bold">$</span>
                  </div>
                </div>
              </div>

              <div className="tech-button-3d bg-white border-2 border-blue-300 text-blue-700 dark:from-blue-500/20 dark:to-purple-600/20 dark:text-white dark:border-blue-500/30 rounded-xl shadow-sm p-6 hover:bg-blue-50 hover:border-blue-400 dark:hover:from-blue-400/30 dark:hover:to-purple-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Listo para Entrega</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-white" data-testid="metric-ready-for-delivery">
                      {metricsLoading ? "..." : metrics?.readyForDelivery || 0}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">💬 WhatsApp automático</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg tech-glow">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="tech-button-3d bg-white border-2 border-cyan-300 text-cyan-700 dark:from-cyan-500/20 dark:to-blue-600/20 dark:text-white dark:border-cyan-500/30 rounded-xl shadow-sm p-6 hover:bg-cyan-50 hover:border-cyan-400 dark:hover:from-cyan-400/30 dark:hover:to-blue-500/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 dark:backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">Pendientes Pago</p>
                    <p className="text-2xl font-bold text-cyan-900 dark:text-white" data-testid="metric-pending-payment">
                      {metricsLoading ? "..." : metrics?.pendingPayment || 0}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      RD${metrics?.pendingPaymentTotal || "0.00"} total
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg tech-glow">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions and Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-cyan-500/20 p-6 dark:backdrop-blur-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tech-text-glow mb-4">Acciones Rápidas</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setActiveTab('invoices')}
                    className="tech-button-3d bg-white border-2 border-sky-300 text-sky-700 dark:from-cyan-500/20 dark:to-blue-600/20 dark:text-white p-4 rounded-lg hover:bg-sky-50 hover:border-sky-400 dark:hover:from-cyan-400/30 dark:hover:to-blue-500/30 transition-all duration-300 text-left shadow-lg hover:shadow-xl transform hover:scale-105"
                    data-testid="quick-action-new-invoice"
                  >
                    <span className="text-lg mb-2 block">➕</span>
                    <p className="text-sm font-bold">Nueva Factura</p>
                  </button>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="tech-button-3d bg-white border-2 border-violet-300 text-violet-700 dark:from-purple-500/20 dark:to-pink-600/20 dark:text-white p-4 rounded-lg hover:bg-violet-50 hover:border-violet-400 dark:hover:from-purple-400/30 dark:hover:to-pink-500/30 transition-all duration-300 text-left shadow-lg hover:shadow-xl transform hover:scale-105"
                    data-testid="quick-action-search-order"
                  >
                    <span className="text-lg mb-2 block">🔍</span>
                    <p className="text-sm font-bold">Buscar Orden</p>
                  </button>
                  <button 
                    onClick={() => setActiveTab('cash-closure')}
                    className="tech-button-3d bg-white border-2 border-emerald-300 text-emerald-700 dark:from-green-500/20 dark:to-emerald-600/20 dark:text-white p-4 rounded-lg hover:bg-emerald-50 hover:border-emerald-400 dark:hover:from-green-400/30 dark:hover:to-emerald-500/30 transition-all duration-300 text-left shadow-lg hover:shadow-xl transform hover:scale-105"
                    data-testid="quick-action-cash-closure"
                  >
                    <span className="text-lg mb-2 block">💰</span>
                    <p className="text-sm font-bold">Cierre de Caja</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className="tech-button-3d bg-white border-2 border-amber-300 text-amber-700 dark:from-yellow-500/20 dark:to-orange-600/20 dark:text-white p-4 rounded-lg hover:bg-amber-50 hover:border-amber-400 dark:hover:from-yellow-400/30 dark:hover:to-orange-500/30 transition-all duration-300 text-left shadow-lg hover:shadow-xl transform hover:scale-105"
                    data-testid="quick-action-configure"
                  >
                    <span className="text-lg mb-2 block">⚙️</span>
                    <p className="text-sm font-bold">Configurar</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('delivery-analytics')}
                    className="tech-button-3d bg-white border-2 border-indigo-300 text-indigo-700 dark:from-indigo-500/20 dark:to-purple-600/20 dark:text-white p-4 rounded-lg hover:bg-indigo-50 hover:border-indigo-400 dark:hover:from-indigo-400/30 dark:hover:to-purple-500/30 transition-all duration-300 text-left shadow-lg hover:shadow-xl transform hover:scale-105"
                    data-testid="quick-action-delivery-analytics"
                  >
                    <span className="text-lg mb-2 block">📊</span>
                    <p className="text-sm font-bold">Análisis Entregas</p>
                  </button>
                </div>
              </div>

              <div className="tech-button-3d bg-white border-2 border-slate-300 dark:from-gray-800/50 dark:to-gray-700/50 dark:border-slate-500/30 rounded-xl shadow-sm p-6 dark:backdrop-blur-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tech-text-glow mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-cyan-600 rounded flex items-center justify-center tech-glow">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  Órdenes Recientes
                </h3>
                <div className="space-y-3">
                  {recentOrders.map((order: Invoice) => (
                    <div key={order.id} className="tech-button-3d flex items-center justify-between p-3 bg-white border border-slate-300/50 dark:from-slate-800/40 dark:to-slate-700/40 dark:border-slate-500/30 rounded-lg hover:bg-slate-50 dark:hover:from-slate-700/60 dark:hover:to-slate-600/60 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white tech-text-glow" data-testid={`recent-order-${order.id}`}>
                          {order.number}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{order.customerName}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block ${getStatusClasses(order.status)} font-semibold`}>
                          {getStatusText(order.status)}
                        </span>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 tech-text-glow">
                          RD${parseFloat(order.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden tech-button-3d p-3 rounded-lg bg-card border border-border min-h-11 min-w-11 flex items-center justify-center hover:scale-105 transition-all duration-200"
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        data-testid="hamburger-menu"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed lg:relative lg:translate-x-0 w-64 h-screen lg:h-full bg-gradient-to-b from-gray-900 via-purple-900/20 to-blue-900/20 backdrop-blur-xl border-r border-cyan-500/20 flex flex-col z-40 transition-transform duration-300 lg:transition-none tech-gradient-bg`}>
        {/* Header in Sidebar */}
        <div className="p-6 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-105 hover:bg-white/20 transition-all duration-200 cursor-pointer border border-white/20 overflow-hidden">
                <img 
                  src={logoPath} 
                  alt="BT Logo" 
                  className="h-10 w-10 object-cover rounded-full"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tech-text-glow">Billtracky</h1>
                <p className="text-sm text-cyan-200">CleanWash Lavandería</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
        
        {/* Navigation Menu */}
        <div className="flex-1 p-4">
          <div className="space-y-2">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'overview' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-overview"
            >
              <Home className="w-4 h-4 mr-3" />
              Dashboard
            </button>
            
            <button 
              onClick={() => setActiveTab('invoices')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'invoices' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-invoices"
            >
              <FileText className="w-4 h-4 mr-3" />
              Nueva Factura
            </button>
            
            <button 
              onClick={() => setActiveTab('orders')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'orders' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-orders"
            >
              <Package className="w-4 h-4 mr-3" />
              Órdenes
            </button>
            
            <button 
              onClick={() => setActiveTab('cash-closure')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'cash-closure' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-cash-closure"
            >
              <BarChart3 className="w-4 h-4 mr-3" />
              Cierre de Caja
            </button>
            
            <button 
              onClick={() => setActiveTab('cash-closures-history')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'cash-closures-history' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-cash-closures-history"
            >
              <History className="w-4 h-4 mr-3" />
              Historial Cierres
            </button>
            
            <button 
              onClick={() => setActiveTab('services')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'services' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-services"
            >
              <Settings className="w-4 h-4 mr-3" />
              Servicios
            </button>
            
            <button 
              onClick={() => setActiveTab('payment-methods')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'payment-methods' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-payment-methods"
            >
              <CreditCard className="w-4 h-4 mr-3" />
              Métodos de Pago
            </button>
            
            <button 
              onClick={() => setActiveTab('customers')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'customers' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-customers"
            >
              <Users className="w-4 h-4 mr-3" />
              Clientes
            </button>
            
            <button 
              onClick={() => setActiveTab('employees')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'employees' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-employees"
            >
              <Crown className="w-4 h-4 mr-3" />
              Empleados
            </button>
            
            <button 
              onClick={() => setActiveTab('company-config')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'company-config' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-company-config"
            >
              <Building2 className="w-4 h-4 mr-3" />
              Configuración Empresa
            </button>
            
            <button 
              onClick={() => setActiveTab('whatsapp-config')} 
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'whatsapp-config' 
                  ? 'tech-button-3d tech-button-active text-cyan-400 dark:shadow-lg' 
                  : 'tech-button-3d text-gray-300 hover:text-cyan-400'
              }`}
              data-testid="tab-whatsapp-config"
            >
              <MessageCircle className="w-4 h-4 mr-3" />
              Mensajes WhatsApp
            </button>
          </div>
        </div>
        
        {/* User Info and Logout */}
        <div className="p-4 border-t border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-left">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full pulse-animation tech-glow"></div>
                  <span className="text-xs text-green-400 font-medium">En línea</span>
                </div>
                <p className="text-sm font-medium text-white" data-testid="user-name">
                  {user.name}
                </p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                  user.role === 'manager' ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 
                  'bg-purple-400/20 text-purple-400 border border-purple-400/30'
                }`}>
                  {user.role === 'manager' ? 'Gerente' : 
                   user.role === 'supervisor' ? 'Supervisor' : 'Empleado'}
                </span>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="tech-button-3d p-2 text-gray-300 hover:text-red-400 rounded-lg transition-all duration-300"
              title="Cerrar sesión"
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 dark:backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 pt-20 px-4 pb-6 sm:pt-6 sm:px-6 lg:p-8 overflow-auto transition-all duration-300 ${
        sidebarOpen && 'lg:ml-0'
      }`}>
        {renderTabContent()}
      </main>
    </div>
  );
}
