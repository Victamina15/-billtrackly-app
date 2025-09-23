import { type Employee, type InsertEmployee, type Customer, type InsertCustomer, type Service, type InsertService, type Invoice, type InsertInvoice, type InvoiceItem, type InsertInvoiceItem, type PaymentMethod, type InsertPaymentMethod, type CompanySettings, type InsertCompanySettings, type MessageTemplate, type InsertMessageTemplate, type Counter, type InsertCounter, type WhatsappConfig, type InsertWhatsappConfig, type CashClosure, type InsertCashClosure, type CashClosurePayment, type InsertCashClosurePayment, type AirtableConfig, type InsertAirtableConfig, type AirtableSyncQueue, type InsertAirtableSyncQueue, type OrderTimestamp, type InsertOrderTimestamp, type DeliveryMetrics, type InsertDeliveryMetrics, employees, customers, services, invoices, invoiceItems, paymentMethods, companySettings, messageTemplates, counters, whatsappConfig, cashClosures, cashClosurePayments, airtableConfig, airtableSyncQueue, orderTimestamps, deliveryMetrics } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Employees
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployees(): Promise<Employee[]>;
  getEmployeeByAccessCode(accessCode: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<void>;
  
  // Customers
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomers(): Promise<Customer[]>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  
  // Services
  getService(id: string): Promise<Service | undefined>;
  getServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<Service>): Promise<Service | undefined>;
  
  // Invoices
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoices(): Promise<Invoice[]>;
  getInvoicesByCustomer(customerId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  getNextInvoiceNumber(): Promise<string>;
  
  // Invoice Items
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItems(invoiceId: string): Promise<void>;
  
  // Payment Methods
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;
  
  // Company Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  
  // Message Templates
  getMessageTemplates(): Promise<MessageTemplate[]>;
  getMessageTemplate(id: string): Promise<MessageTemplate | undefined>;
  getMessageTemplateByType(type: string): Promise<MessageTemplate | undefined>;
  createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  updateMessageTemplate(id: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate | undefined>;
  
  // WhatsApp Configuration
  getWhatsappConfig(): Promise<WhatsappConfig | undefined>;
  updateWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig>;
  
  // Cash Closures
  getCashClosure(id: string): Promise<CashClosure | undefined>;
  getCashClosures(dateFrom?: string, dateTo?: string): Promise<CashClosure[]>;
  getCashClosureByDate(date: string): Promise<CashClosure | undefined>;
  createCashClosure(closure: InsertCashClosure): Promise<CashClosure>;
  updateCashClosure(id: string, updates: Partial<CashClosure>): Promise<CashClosure | undefined>;
  
  // Cash Closure Payments
  getCashClosurePayments(cashClosureId: string): Promise<CashClosurePayment[]>;
  createCashClosurePayment(payment: InsertCashClosurePayment): Promise<CashClosurePayment>;
  deleteCashClosurePayments(cashClosureId: string): Promise<void>;
  
  // Airtable Configuration
  getAirtableConfig(): Promise<AirtableConfig | undefined>;
  updateAirtableConfig(config: InsertAirtableConfig): Promise<AirtableConfig>;
  
  // Airtable Sync Queue
  getAirtableSyncQueueItems(status?: string, entityType?: string): Promise<AirtableSyncQueue[]>;
  createAirtableSyncQueueItem(item: InsertAirtableSyncQueue): Promise<AirtableSyncQueue>;
  updateAirtableSyncQueueItem(id: string, updates: Partial<AirtableSyncQueue>): Promise<AirtableSyncQueue | undefined>;
  deleteAirtableSyncQueueItem(id: string): Promise<void>;

  // Order Timestamps & Delivery Tracking
  getOrderTimestamps(invoiceId: string): Promise<OrderTimestamp[]>;
  createOrderTimestamp(timestamp: InsertOrderTimestamp): Promise<OrderTimestamp>;
  getDeliveryMetrics(invoiceId: string): Promise<DeliveryMetrics | undefined>;
  createDeliveryMetrics(metrics: InsertDeliveryMetrics): Promise<DeliveryMetrics>;
  updateDeliveryMetrics(invoiceId: string, updates: Partial<DeliveryMetrics>): Promise<DeliveryMetrics | undefined>;
  getDeliveryAnalytics(dateFrom?: string, dateTo?: string): Promise<{
    avgProcessingTime: number;
    avgTotalTime: number;
    onTimePercentage: number;
    totalOrders: number;
    delayedOrders: number;
    byServiceType: Record<string, any>;
    byPriority: Record<string, any>;
  }>;
  
  // Metrics and Analytics
  getDailyMetrics(date: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    totalItems: number;
    deliveredInvoices: number;
    pendingInvoices: number;
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }>;
  getMonthlyMetrics(month: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    averageDailySales: number;
    bestDay: { date: string; sales: number };
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }>;
  getDateRangeMetrics(from: string, to: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    dailyTrends: Array<{ date: string; sales: number; invoices: number }>;
    topServices: Array<{ name: string; quantity: number; revenue: number }>;
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }>;
}

export class MemStorage implements IStorage {
  private employees: Map<string, Employee>;
  private customers: Map<string, Customer>;
  private services: Map<string, Service>;
  private invoices: Map<string, Invoice>;
  private invoiceItems: Map<string, InvoiceItem>;
  private paymentMethods: Map<string, PaymentMethod>;
  private companySettings: CompanySettings | undefined;
  private messageTemplates: Map<string, MessageTemplate>;
  private whatsappConfig: WhatsappConfig | undefined;
  private cashClosures: Map<string, CashClosure>;
  private cashClosurePayments: Map<string, CashClosurePayment>;
  private airtableConfig: AirtableConfig | undefined;
  private airtableSyncQueue: Map<string, AirtableSyncQueue>;
  private orderTimestamps: Map<string, OrderTimestamp>;
  private deliveryMetrics: Map<string, DeliveryMetrics>;
  private invoiceCounter: number;

  // Helper methods for access code hashing
  private async hashAccessCode(accessCode: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(accessCode, saltRounds);
  }

  private async verifyAccessCode(accessCode: string, hashedCode: string): Promise<boolean> {
    return await bcrypt.compare(accessCode, hashedCode);
  }

  // Utility function to sanitize employee objects - NEVER expose accessCode in API responses
  private sanitizeEmployee(employee: Employee): Employee {
    const { accessCode, ...sanitizedEmployee } = employee;
    return sanitizedEmployee as Employee;
  }

  constructor() {
    this.employees = new Map();
    this.customers = new Map();
    this.services = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.paymentMethods = new Map();
    this.messageTemplates = new Map();
    this.whatsappConfig = undefined;
    this.cashClosures = new Map();
    this.cashClosurePayments = new Map();
    this.airtableConfig = undefined;
    this.airtableSyncQueue = new Map();
    this.orderTimestamps = new Map();
    this.deliveryMetrics = new Map();
    this.invoiceCounter = 10;
    
    // Initialize data asynchronously
    this.seedData().catch(console.error);
  }

  private async seedData() {
    // Seed employees with hashed access codes
    const employees = [
      { id: randomUUID(), name: 'Juan Carlos', position: 'Gerente General', accessCode: await this.hashAccessCode('1234'), role: 'manager', active: true, createdAt: new Date('2024-01-15'), lastAccess: new Date('2024-09-04') },
      { id: randomUUID(), name: 'María Fernández', position: 'Operadora Principal', accessCode: await this.hashAccessCode('5678'), role: 'employee', active: true, createdAt: new Date('2024-02-20'), lastAccess: new Date('2024-09-03') },
      { id: randomUUID(), name: 'Pedro González', position: 'Supervisor de Turno', accessCode: await this.hashAccessCode('9999'), role: 'supervisor', active: true, createdAt: new Date('2024-03-10'), lastAccess: new Date('2024-09-02') }
    ];
    employees.forEach(emp => this.employees.set(emp.id, emp));

    // Seed services
    const services = [
      { id: randomUUID(), name: 'PANTALONES', category: 'Ropa Básica', washPrice: '80.00', ironPrice: '60.00', bothPrice: '110.00', active: true, createdAt: new Date('2024-01-15') },
      { id: randomUUID(), name: 'CAMISAS', category: 'Ropa Básica', washPrice: '60.00', ironPrice: '40.00', bothPrice: '85.00', active: true, createdAt: new Date('2024-01-15') },
      { id: randomUUID(), name: 'VESTIDOS', category: 'Ropa Especial', washPrice: '150.00', ironPrice: '120.00', bothPrice: '220.00', active: true, createdAt: new Date('2024-01-15') },
      { id: randomUUID(), name: 'BLUSAS', category: 'Ropa Básica', washPrice: '60.00', ironPrice: '40.00', bothPrice: '85.00', active: true, createdAt: new Date('2024-01-15') },
      { id: randomUUID(), name: 'SÁBANAS', category: 'Hogar', washPrice: '100.00', ironPrice: '80.00', bothPrice: '150.00', active: true, createdAt: new Date('2024-01-15') },
      { id: randomUUID(), name: 'TOALLAS (GRANDE)', category: 'Hogar', washPrice: '40.00', ironPrice: '30.00', bothPrice: '60.00', active: true, createdAt: new Date('2024-01-15') }
    ];
    services.forEach(service => this.services.set(service.id, service));

    // Seed customers
    const customers = [
      { id: randomUUID(), name: 'Juan Pérez', phone: '809-150-2025', email: 'juan@email.com', totalSpent: '1240.00', ordersCount: 8, createdAt: new Date('2024-01-10') },
      { id: randomUUID(), name: 'María García', phone: '809-555-1234', email: 'maria@email.com', totalSpent: '890.00', ordersCount: 5, createdAt: new Date('2024-02-15') },
      { id: randomUUID(), name: 'Pedro López', phone: '809-777-9999', email: null, totalSpent: '650.00', ordersCount: 3, createdAt: new Date('2024-03-01') }
    ];
    customers.forEach(customer => this.customers.set(customer.id, customer));

    // Seed some sample invoices
    const sampleInvoices = [
      {
        id: randomUUID(),
        number: 'FAC-009',
        customerId: customers[0].id,
        customerName: 'Juan Pérez',
        customerPhone: '809-150-2025',
        customerEmail: 'juan@email.com',
        deliveryDate: new Date('2025-09-06'),
        date: new Date('2025-09-04'),
        subtotal: '320.00',
        tax: '57.60',
        total: '377.60',
        paymentMethod: 'pending',
        paymentReference: null,
        status: 'in_process',
        employeeId: employees[0].id,
        paid: false,
        delivered: false,
        cancelledAt: null,
        cancellationReason: null
      },
      {
        id: randomUUID(),
        number: 'FAC-008',
        customerId: customers[1].id,
        customerName: 'María García',
        customerPhone: '809-555-1234',
        customerEmail: 'maria@email.com',
        deliveryDate: new Date('2025-09-05'),
        date: new Date('2025-09-03'),
        subtotal: '245.76',
        tax: '44.24',
        total: '290.00',
        paymentMethod: 'cash',
        paymentReference: null,
        status: 'ready',
        employeeId: employees[1].id,
        paid: true,
        delivered: false,
        cancelledAt: null,
        cancellationReason: null
      }
    ];
    sampleInvoices.forEach(invoice => this.invoices.set(invoice.id, invoice));

    // Seed payment methods
    const paymentMethods = [
      {
        id: randomUUID(),
        name: 'Efectivo',
        code: 'cash',
        icon: '💵',
        active: true,
        requiresReference: false,
        commission: '0',
        description: 'Pago en efectivo',
        showOnInvoice: true,
        color: '#10B981',
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: 'Tarjeta de Crédito',
        code: 'card',
        icon: '💳',
        active: true,
        requiresReference: true,
        commission: '3.5',
        description: 'Visa, Mastercard, American Express',
        showOnInvoice: true,
        color: '#3B82F6',
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: 'Transferencia Bancaria',
        code: 'transfer',
        icon: '🏦',
        active: true,
        requiresReference: true,
        commission: '0',
        description: 'Transferencia entre cuentas',
        showOnInvoice: true,
        color: '#F59E0B',
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: 'Pago Móvil',
        code: 'mobile_pay',
        icon: '📱',
        active: true,
        requiresReference: true,
        commission: '0',
        description: 'Pago móvil bancario',
        showOnInvoice: true,
        color: '#8B5CF6',
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: 'Pago Pendiente',
        code: 'pending',
        icon: '⏳',
        active: true,
        requiresReference: false,
        commission: '0',
        description: 'Pago a realizar posteriormente',
        showOnInvoice: true,
        color: '#F97316',
        createdAt: new Date()
      }
    ];
    paymentMethods.forEach(method => this.paymentMethods.set(method.id, method));

    // Seed company settings
    this.companySettings = {
      id: randomUUID(),
      name: 'CleanWash Lavandería',
      commercialName: 'CleanWash',
      email: 'admin@cleanwash.com',
      phone: '809-555-0123',
      phone2: '809-555-0124',
      address: 'Av. Principal #123, Santo Domingo',
      branch: 'Sucursal Centro',
      city: 'Santo Domingo',
      province: 'Distrito Nacional',
      postalCode: '10101',
      rnc: '131-12345-6',
      website: 'www.cleanwash.com',
      logo: null,
      invoiceFooter: 'Gracias por preferirnos - CleanWash Lavandería',
      showRncOnInvoice: true,
      showAddressOnInvoice: true,
      showPhoneOnInvoice: true,
      showEmailOnInvoice: true,
      taxRate: '0.18',
      updatedAt: new Date()
    };

    // Seed message templates
    const messageTemplates = [
      {
        id: randomUUID(),
        type: 'order_ready',
        title: '🎉 ¡Tu pedido está listo!',
        message: 'Hola {cliente_nombre}! 👋\n\n¡Excelentes noticias! Tu pedido #{factura_numero} está listo para recoger.\n\n📋 *Detalles del pedido:*\n• Fecha de entrega: {fecha_entrega}\n• Total de prendas: {total_prendas}\n• Total a pagar: RD$ {total_pagar}\n\n🏪 *Información de recogida:*\n• Dirección: {empresa_direccion}\n• Horario: {empresa_horario}\n• Teléfono: {empresa_telefono}\n\n¡Gracias por confiar en nosotros! ✨\n\n_{empresa_nombre}_',
        active: true,
        autoSend: true,
        sendTime: '09:00',
        reminderDays: null,
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        type: 'invoice_whatsapp',
        title: '📄 Factura de tu pedido',
        message: 'Hola {cliente_nombre}! 👋\n\nAquí tienes la factura de tu pedido #{factura_numero}\n\n📋 *Resumen del pedido:*\n• Fecha: {fecha_factura}\n• Prendas: {total_prendas}\n• Subtotal: RD$ {subtotal}\n• ITBIS (18%): RD$ {itbis}\n• *Total: RD$ {total}*\n\n💳 *Estado del pago:* {estado_pago}\n📅 *Fecha de entrega:* {fecha_entrega}\n\n{detalles_articulos}\n\n¡Gracias por elegirnos! 🙏\n\n_{empresa_nombre}_\n📍 {empresa_direccion}\n📞 {empresa_telefono}',
        active: true,
        autoSend: false,
        sendTime: null,
        reminderDays: null,
        updatedAt: new Date()
      }
    ];
    messageTemplates.forEach(template => this.messageTemplates.set(template.id, template));
  }

  // Employee methods
  async getEmployee(id: string): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    return employee ? this.sanitizeEmployee(employee) : undefined;
  }

  async getEmployeeByAccessCode(accessCode: string): Promise<Employee | undefined> {
    const employees = Array.from(this.employees.values());
    for (const emp of employees) {
      if (await this.verifyAccessCode(accessCode, emp.accessCode)) {
        return this.sanitizeEmployee(emp);
      }
    }
    return undefined;
  }

  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values())
      .map(emp => this.sanitizeEmployee(emp))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    const hashedAccessCode = await this.hashAccessCode(employee.accessCode);
    const newEmployee: Employee = { 
      ...employee, 
      id,
      accessCode: hashedAccessCode,
      active: employee.active ?? true,
      createdAt: new Date(),
      lastAccess: null
    };
    this.employees.set(id, newEmployee);
    
    return this.sanitizeEmployee(newEmployee);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    // If accessCode is empty, don't include it in the updates
    let processedUpdates = { ...updates };
    if ('accessCode' in processedUpdates) {
      if (!processedUpdates.accessCode || processedUpdates.accessCode.trim() === '') {
        delete processedUpdates.accessCode;
      } else {
        processedUpdates.accessCode = await this.hashAccessCode(processedUpdates.accessCode);
      }
    }
    
    const updated = { ...employee, ...processedUpdates };
    this.employees.set(id, updated);
    
    return this.sanitizeEmployee(updated);
  }

  async deleteEmployee(id: string): Promise<void> {
    this.employees.delete(id);
  }

  // Customer methods
  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.phone === phone);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const newCustomer: Customer = { 
      ...customer, 
      id, 
      email: customer.email ?? null,
      totalSpent: '0.00',
      ordersCount: 0,
      createdAt: new Date()
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updated = { ...customer, ...updates };
    this.customers.set(id, updated);
    return updated;
  }

  // Service methods
  async getService(id: string): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async createService(service: InsertService): Promise<Service> {
    const id = randomUUID();
    const newService: Service = {
      ...service,
      id,
      active: service.active ?? true,
      category: service.category ?? 'Ropa Básica',
      createdAt: new Date()
    };
    this.services.set(id, newService);
    return newService;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updated = { ...service, ...updates };
    this.services.set(id, updated);
    return updated;
  }

  // Invoice methods
  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).sort((a, b) => 
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.customerId === customerId);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const newInvoice: Invoice = {
      ...invoice,
      id,
      customerId: invoice.customerId ?? null,
      customerEmail: invoice.customerEmail ?? null,
      deliveryDate: invoice.deliveryDate ?? null,
      paymentMethod: invoice.paymentMethod ?? null,
      paymentReference: invoice.paymentReference ?? null,
      date: invoice.date || new Date(),
      status: invoice.status || 'received',
      employeeId: invoice.employeeId ?? null,
      paid: invoice.paid ?? false,
      delivered: invoice.delivered ?? false,
      cancelledAt: invoice.cancelledAt ?? null,
      cancellationReason: invoice.cancellationReason ?? null
    };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updated = { ...invoice, ...updates };
    this.invoices.set(id, updated);
    return updated;
  }

  async getNextInvoiceNumber(): Promise<string> {
    // Incrementar primero para evitar race conditions
    const nextNumber = this.invoiceCounter++;
    const number = `FAC-${String(nextNumber).padStart(3, '0')}`;
    return number;
  }

  // Invoice Item methods
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values()).filter(item => item.invoiceId === invoiceId);
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = randomUUID();
    const newItem: InvoiceItem = { ...item, id };
    this.invoiceItems.set(id, newItem);
    return newItem;
  }

  async deleteInvoiceItems(invoiceId: string): Promise<void> {
    const items = await this.getInvoiceItems(invoiceId);
    items.forEach(item => this.invoiceItems.delete(item.id));
  }

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return Array.from(this.paymentMethods.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    return this.paymentMethods.get(id);
  }

  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    const id = randomUUID();
    const newMethod: PaymentMethod = { 
      ...method, 
      id,
      active: method.active ?? true,
      requiresReference: method.requiresReference ?? false,
      commission: method.commission ?? '0',
      description: method.description ?? null,
      showOnInvoice: method.showOnInvoice ?? true,
      color: method.color ?? '#3B82F6',
      createdAt: new Date()
    };
    this.paymentMethods.set(id, newMethod);
    return newMethod;
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const method = this.paymentMethods.get(id);
    if (!method) return undefined;
    
    const updated = { ...method, ...updates };
    this.paymentMethods.set(id, updated);
    return updated;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    this.paymentMethods.delete(id);
  }

  // Company Settings
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    return this.companySettings;
  }

  async updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    const updated: CompanySettings = {
      ...settings,
      id: this.companySettings?.id || randomUUID(),
      email: settings.email ?? null,
      commercialName: settings.commercialName ?? null,
      phone2: settings.phone2 ?? null,
      address: settings.address ?? null,
      branch: settings.branch ?? null,
      city: settings.city ?? null,
      province: settings.province ?? null,
      postalCode: settings.postalCode ?? null,
      rnc: settings.rnc ?? null,
      website: settings.website ?? null,
      logo: settings.logo ?? null,
      invoiceFooter: settings.invoiceFooter ?? null,
      showRncOnInvoice: settings.showRncOnInvoice ?? true,
      showAddressOnInvoice: settings.showAddressOnInvoice ?? true,
      showPhoneOnInvoice: settings.showPhoneOnInvoice ?? true,
      showEmailOnInvoice: settings.showEmailOnInvoice ?? true,
      taxRate: settings.taxRate ?? '0.18',
      updatedAt: new Date()
    };
    this.companySettings = updated;
    return updated;
  }

  // Message Templates
  async getMessageTemplates(): Promise<MessageTemplate[]> {
    return Array.from(this.messageTemplates.values()).sort((a, b) => a.type.localeCompare(b.type));
  }

  async getMessageTemplate(id: string): Promise<MessageTemplate | undefined> {
    return this.messageTemplates.get(id);
  }

  async getMessageTemplateByType(type: string): Promise<MessageTemplate | undefined> {
    return Array.from(this.messageTemplates.values()).find(template => template.type === type);
  }

  async createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    const id = randomUUID();
    const newTemplate: MessageTemplate = { 
      ...template, 
      id,
      active: template.active ?? true,
      autoSend: template.autoSend ?? false,
      sendTime: template.sendTime ?? null,
      reminderDays: template.reminderDays ?? null,
      updatedAt: new Date()
    };
    this.messageTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateMessageTemplate(id: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate | undefined> {
    const template = this.messageTemplates.get(id);
    if (!template) return undefined;
    
    const updated = { ...template, ...updates, updatedAt: new Date() };
    this.messageTemplates.set(id, updated);
    return updated;
  }

  // WhatsApp Configuration
  async getWhatsappConfig(): Promise<WhatsappConfig | undefined> {
    return this.whatsappConfig;
  }

  async updateWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig> {
    const updated: WhatsappConfig = {
      ...config,
      id: this.whatsappConfig?.id || randomUUID(),
      apiKey: config.apiKey ?? null,
      provider: config.provider ?? 'twilio',
      baseUrl: config.baseUrl ?? null,
      enabled: config.enabled ?? false,
      autoSendOnReady: config.autoSendOnReady ?? false,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 5,
      updatedAt: new Date()
    };
    this.whatsappConfig = updated;
    return updated;
  }

  // Cash Closures
  async getCashClosure(id: string): Promise<CashClosure | undefined> {
    return this.cashClosures.get(id);
  }

  async getCashClosures(dateFrom?: string, dateTo?: string): Promise<CashClosure[]> {
    const allClosures = Array.from(this.cashClosures.values());
    if (!dateFrom && !dateTo) {
      return allClosures.sort((a, b) => new Date(b.closingDate).getTime() - new Date(a.closingDate).getTime());
    }
    
    return allClosures.filter(closure => {
      const closureDate = new Date(closure.closingDate).toISOString().split('T')[0];
      if (dateFrom && closureDate < dateFrom) return false;
      if (dateTo && closureDate > dateTo) return false;
      return true;
    }).sort((a, b) => new Date(b.closingDate).getTime() - new Date(a.closingDate).getTime());
  }

  async getCashClosureByDate(date: string): Promise<CashClosure | undefined> {
    return Array.from(this.cashClosures.values()).find(closure => 
      new Date(closure.closingDate).toISOString().split('T')[0] === date
    );
  }

  async createCashClosure(closure: InsertCashClosure): Promise<CashClosure> {
    const id = randomUUID();
    const newClosure: CashClosure = {
      ...closure,
      id,
      openedAt: new Date(),
      closedAt: closure.closedAt ?? null,
      openingCash: closure.openingCash ?? "0",
      countedCash: closure.countedCash ?? null,
      variance: closure.variance ?? null,
      notes: closure.notes ?? null,
      createdAt: new Date()
    };
    this.cashClosures.set(id, newClosure);
    return newClosure;
  }

  async updateCashClosure(id: string, updates: Partial<CashClosure>): Promise<CashClosure | undefined> {
    const closure = this.cashClosures.get(id);
    if (!closure) return undefined;
    
    const updated = { ...closure, ...updates };
    this.cashClosures.set(id, updated);
    return updated;
  }

  // Cash Closure Payments
  async getCashClosurePayments(cashClosureId: string): Promise<CashClosurePayment[]> {
    return Array.from(this.cashClosurePayments.values()).filter(payment => 
      payment.cashClosureId === cashClosureId
    );
  }

  async createCashClosurePayment(payment: InsertCashClosurePayment): Promise<CashClosurePayment> {
    const id = randomUUID();
    const newPayment: CashClosurePayment = { ...payment, id };
    this.cashClosurePayments.set(id, newPayment);
    return newPayment;
  }

  async deleteCashClosurePayments(cashClosureId: string): Promise<void> {
    const payments = await this.getCashClosurePayments(cashClosureId);
    payments.forEach(payment => this.cashClosurePayments.delete(payment.id));
  }

  // Airtable Configuration
  async getAirtableConfig(): Promise<AirtableConfig | undefined> {
    return this.airtableConfig;
  }

  async updateAirtableConfig(config: InsertAirtableConfig): Promise<AirtableConfig> {
    const updated: AirtableConfig = {
      ...config,
      id: this.airtableConfig?.id || randomUUID(),
      enabled: config.enabled ?? false,
      baseId: config.baseId ?? null,
      tableInvoices: config.tableInvoices ?? 'Invoices',
      tableInvoiceItems: config.tableInvoiceItems ?? 'Invoice Items',
      apiToken: config.apiToken ?? null,
      lastSyncDate: config.lastSyncDate ?? null,
      syncStatus: config.syncStatus ?? 'idle',
      lastError: config.lastError ?? null,
      updatedAt: new Date()
    };
    this.airtableConfig = updated;
    return updated;
  }

  // Airtable Sync Queue
  async getAirtableSyncQueueItems(status?: string, entityType?: string): Promise<AirtableSyncQueue[]> {
    return Array.from(this.airtableSyncQueue.values()).filter(item => {
      if (status && item.status !== status) return false;
      if (entityType && item.entityType !== entityType) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async createAirtableSyncQueueItem(item: InsertAirtableSyncQueue): Promise<AirtableSyncQueue> {
    const id = randomUUID();
    const newItem: AirtableSyncQueue = {
      ...item,
      id,
      status: item.status ?? 'pending',
      retries: item.retries ?? 0,
      maxRetries: item.maxRetries ?? 3,
      lastError: item.lastError ?? null,
      externalId: item.externalId ?? null,
      lastSyncedAt: item.lastSyncedAt ?? null,
      createdAt: new Date()
    };
    this.airtableSyncQueue.set(id, newItem);
    return newItem;
  }

  async updateAirtableSyncQueueItem(id: string, updates: Partial<AirtableSyncQueue>): Promise<AirtableSyncQueue | undefined> {
    const item = this.airtableSyncQueue.get(id);
    if (!item) return undefined;
    
    const updated = { ...item, ...updates };
    this.airtableSyncQueue.set(id, updated);
    return updated;
  }

  async deleteAirtableSyncQueueItem(id: string): Promise<void> {
    this.airtableSyncQueue.delete(id);
  }

  // Metrics and Analytics
  async getDailyMetrics(date: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    totalItems: number;
    deliveredInvoices: number;
    pendingInvoices: number;
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }> {
    const invoicesOfDay = Array.from(this.invoices.values()).filter(invoice => {
      const invoiceDate = new Date(invoice.date || 0).toISOString().split('T')[0];
      return invoiceDate === date;
    });

    const totalSales = invoicesOfDay.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const totalInvoices = invoicesOfDay.length;
    const deliveredInvoices = invoicesOfDay.filter(inv => inv.delivered).length;
    const pendingInvoices = invoicesOfDay.filter(inv => !inv.delivered && inv.status !== 'cancelled').length;
    
    // Get total items
    const invoiceIds = invoicesOfDay.map(inv => inv.id);
    const items = Array.from(this.invoiceItems.values()).filter(item => invoiceIds.includes(item.invoiceId));
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Payment breakdown
    const paymentBreakdown = new Map<string, { total: number; count: number }>();
    invoicesOfDay.forEach(invoice => {
      if (!invoice.paymentMethod || invoice.paymentMethod === 'pending') return;
      const current = paymentBreakdown.get(invoice.paymentMethod) || { total: 0, count: 0 };
      paymentBreakdown.set(invoice.paymentMethod, {
        total: current.total + parseFloat(invoice.total),
        count: current.count + 1
      });
    });

    return {
      totalSales,
      totalInvoices,
      totalItems,
      deliveredInvoices,
      pendingInvoices,
      paymentBreakdown: Array.from(paymentBreakdown.entries()).map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count
      }))
    };
  }

  async getMonthlyMetrics(month: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    averageDailySales: number;
    bestDay: { date: string; sales: number };
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }> {
    const invoicesOfMonth = Array.from(this.invoices.values()).filter(invoice => {
      const invoiceMonth = new Date(invoice.date || 0).toISOString().substring(0, 7);
      return invoiceMonth === month;
    });

    const totalSales = invoicesOfMonth.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const totalInvoices = invoicesOfMonth.length;
    
    // Group by day to find best day and calculate average
    const dailySales = new Map<string, number>();
    invoicesOfMonth.forEach(invoice => {
      const day = new Date(invoice.date || 0).toISOString().split('T')[0];
      const current = dailySales.get(day) || 0;
      dailySales.set(day, current + parseFloat(invoice.total));
    });

    const bestDay = Array.from(dailySales.entries()).reduce((best, [date, sales]) => 
      sales > best.sales ? { date, sales } : best, { date: '', sales: 0 });
    
    const averageDailySales = dailySales.size > 0 ? totalSales / dailySales.size : 0;

    // Payment breakdown
    const paymentBreakdown = new Map<string, { total: number; count: number }>();
    invoicesOfMonth.forEach(invoice => {
      if (!invoice.paymentMethod || invoice.paymentMethod === 'pending') return;
      const current = paymentBreakdown.get(invoice.paymentMethod) || { total: 0, count: 0 };
      paymentBreakdown.set(invoice.paymentMethod, {
        total: current.total + parseFloat(invoice.total),
        count: current.count + 1
      });
    });

    return {
      totalSales,
      totalInvoices,
      averageDailySales,
      bestDay,
      paymentBreakdown: Array.from(paymentBreakdown.entries()).map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count
      }))
    };
  }

  async getDateRangeMetrics(from: string, to: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    dailyTrends: Array<{ date: string; sales: number; invoices: number }>;
    topServices: Array<{ name: string; quantity: number; revenue: number }>;
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }> {
    const invoicesInRange = Array.from(this.invoices.values()).filter(invoice => {
      const invoiceDate = new Date(invoice.date || 0).toISOString().split('T')[0];
      return invoiceDate >= from && invoiceDate <= to;
    });

    const totalSales = invoicesInRange.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const totalInvoices = invoicesInRange.length;

    // Daily trends
    const dailyTrends = new Map<string, { sales: number; invoices: number }>();
    invoicesInRange.forEach(invoice => {
      const day = new Date(invoice.date || 0).toISOString().split('T')[0];
      const current = dailyTrends.get(day) || { sales: 0, invoices: 0 };
      dailyTrends.set(day, {
        sales: current.sales + parseFloat(invoice.total),
        invoices: current.invoices + 1
      });
    });

    // Top services (simplified implementation)
    const serviceStats = new Map<string, { quantity: number; revenue: number }>();
    const invoiceIds = invoicesInRange.map(inv => inv.id);
    const items = Array.from(this.invoiceItems.values()).filter(item => invoiceIds.includes(item.invoiceId));
    
    items.forEach(item => {
      const current = serviceStats.get(item.serviceName) || { quantity: 0, revenue: 0 };
      serviceStats.set(item.serviceName, {
        quantity: current.quantity + item.quantity,
        revenue: current.revenue + parseFloat(item.unitPrice) * item.quantity
      });
    });

    // Payment breakdown
    const paymentBreakdown = new Map<string, { total: number; count: number }>();
    invoicesInRange.forEach(invoice => {
      if (!invoice.paymentMethod || invoice.paymentMethod === 'pending') return;
      const current = paymentBreakdown.get(invoice.paymentMethod) || { total: 0, count: 0 };
      paymentBreakdown.set(invoice.paymentMethod, {
        total: current.total + parseFloat(invoice.total),
        count: current.count + 1
      });
    });

    return {
      totalSales,
      totalInvoices,
      dailyTrends: Array.from(dailyTrends.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topServices: Array.from(serviceStats.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      paymentBreakdown: Array.from(paymentBreakdown.entries()).map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count
      }))
    };
  }

  // Order Timestamps & Delivery Tracking
  async getOrderTimestamps(invoiceId: string): Promise<OrderTimestamp[]> {
    return Array.from(this.orderTimestamps.values())
      .filter(ts => ts.invoiceId === invoiceId)
      .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
  }

  async createOrderTimestamp(timestamp: InsertOrderTimestamp): Promise<OrderTimestamp> {
    const id = randomUUID();
    const newTimestamp: OrderTimestamp = {
      ...timestamp,
      id,
      timestamp: timestamp.timestamp || new Date(),
      createdAt: new Date(),
    };
    this.orderTimestamps.set(id, newTimestamp);
    return newTimestamp;
  }

  async getDeliveryMetrics(invoiceId: string): Promise<DeliveryMetrics | undefined> {
    return Array.from(this.deliveryMetrics.values()).find(m => m.invoiceId === invoiceId);
  }

  async createDeliveryMetrics(metrics: InsertDeliveryMetrics): Promise<DeliveryMetrics> {
    const id = randomUUID();
    const newMetrics: DeliveryMetrics = {
      ...metrics,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.deliveryMetrics.set(id, newMetrics);
    return newMetrics;
  }

  async updateDeliveryMetrics(invoiceId: string, updates: Partial<DeliveryMetrics>): Promise<DeliveryMetrics | undefined> {
    const existing = await this.getDeliveryMetrics(invoiceId);
    if (!existing) return undefined;

    const updated: DeliveryMetrics = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.deliveryMetrics.set(existing.id, updated);
    return updated;
  }

  async getDeliveryAnalytics(dateFrom?: string, dateTo?: string): Promise<{
    avgProcessingTime: number;
    avgTotalTime: number;
    onTimePercentage: number;
    totalOrders: number;
    delayedOrders: number;
    byServiceType: Record<string, any>;
    byPriority: Record<string, any>;
  }> {
    const allMetrics = Array.from(this.deliveryMetrics.values());
    let filteredMetrics = allMetrics;

    if (dateFrom || dateTo) {
      filteredMetrics = allMetrics.filter(metric => {
        const createdAt = new Date(metric.createdAt || 0);
        if (dateFrom && createdAt < new Date(dateFrom)) return false;
        if (dateTo && createdAt > new Date(dateTo)) return false;
        return true;
      });
    }

    const totalOrders = filteredMetrics.length;
    const delayedOrders = filteredMetrics.filter(m => !m.onTimeDelivery).length;
    const onTimePercentage = totalOrders > 0 ? (totalOrders - delayedOrders) / totalOrders * 100 : 0;

    const avgProcessingTime = totalOrders > 0
      ? filteredMetrics.reduce((sum, m) => sum + (m.processingTime || 0), 0) / totalOrders
      : 0;

    const avgTotalTime = totalOrders > 0
      ? filteredMetrics.reduce((sum, m) => sum + (m.totalTime || 0), 0) / totalOrders
      : 0;

    const byServiceType = filteredMetrics.reduce((acc, metric) => {
      const type = metric.serviceType || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, avgTime: 0, onTime: 0 };
      }
      acc[type].count++;
      acc[type].avgTime = (acc[type].avgTime * (acc[type].count - 1) + (metric.totalTime || 0)) / acc[type].count;
      if (metric.onTimeDelivery) acc[type].onTime++;
      return acc;
    }, {} as Record<string, any>);

    const byPriority = filteredMetrics.reduce((acc, metric) => {
      const priority = metric.priority || 'normal';
      if (!acc[priority]) {
        acc[priority] = { count: 0, avgTime: 0, onTime: 0 };
      }
      acc[priority].count++;
      acc[priority].avgTime = (acc[priority].avgTime * (acc[priority].count - 1) + (metric.totalTime || 0)) / acc[priority].count;
      if (metric.onTimeDelivery) acc[priority].onTime++;
      return acc;
    }, {} as Record<string, any>);

    return {
      avgProcessingTime,
      avgTotalTime,
      onTimePercentage,
      totalOrders,
      delayedOrders,
      byServiceType,
      byPriority,
    };
  }
}

// DatabaseStorage implementation using PostgreSQL with Drizzle ORM
export class DatabaseStorage implements IStorage {
  // Utility function to sanitize employee objects - NEVER expose accessCode in API responses
  private sanitizeEmployee(employee: Employee): Employee {
    const { accessCode, ...sanitizedEmployee } = employee;
    return sanitizedEmployee as Employee;
  }

  // Employees
  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee ? this.sanitizeEmployee(employee) : undefined;
  }

  async getEmployees(): Promise<Employee[]> {
    const employeeList = await db.select().from(employees);
    return employeeList.map(emp => this.sanitizeEmployee(emp));
  }

  async getEmployeeByAccessCode(accessCode: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.accessCode, accessCode));
    return employee ? this.sanitizeEmployee(employee) : undefined;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return this.sanitizeEmployee(newEmployee);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined> {
    // If accessCode is empty, don't include it in the updates
    const cleanedUpdates = { ...updates };
    if ('accessCode' in cleanedUpdates && (!cleanedUpdates.accessCode || cleanedUpdates.accessCode.trim() === '')) {
      delete cleanedUpdates.accessCode;
    }
    
    const [updated] = await db.update(employees)
      .set({ ...cleanedUpdates, lastAccess: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updated ? this.sanitizeEmployee(updated) : undefined;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Customers
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return updated || undefined;
  }

  // Services
  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    const [updated] = await db.update(services)
      .set(updates)
      .where(eq(services.id, id))
      .returning();
    return updated || undefined;
  }

  // Invoices
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.date));
  }

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(invoices.date));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();
    return updated || undefined;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const maxAttempts = 3;
    const baseDelayMs = 200;
    const counterId = 'invoice_number';

    const isTransientPgError = (e: any) => {
      const codes = new Set(['57P01','57P02','57P03','53300','53410','08006','08003','08000']);
      const messages = ['Connection terminated', 'terminating connection', 'ECONNRESET', 'ETIMEDOUT', 'socket hang up', 'closed the connection unexpectedly'];
      const msg = String(e?.message ?? e ?? '');
      return codes.has((e as any)?.code) || messages.some(m => msg.includes(m));
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await db.transaction(async (tx) => {
          // Ensure counter exists in the same transaction
          const existingInvoices = await tx
            .select({ count: sql<number>`count(*)` })
            .from(invoices);
          const currentCount = existingInvoices[0]?.count || 0;

          await tx.execute(sql`
            INSERT INTO counters (id, value, updated_at)
            VALUES (${counterId}, ${currentCount}, NOW())
            ON CONFLICT (id) DO NOTHING
          `);

          const result = await tx.execute(sql`
            UPDATE counters
            SET value = value + 1, updated_at = NOW()
            WHERE id = ${counterId}
            RETURNING value
          `);

          const updatedValue = result.rows?.[0]?.value;
          if (updatedValue === undefined || updatedValue === null) {
            throw new Error(`Failed to update counter for ${counterId}`);
          }

          return `FAC-${String(updatedValue).padStart(3, '0')}`;
        });
      } catch (e) {
        if (isTransientPgError(e) && attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        console.error('[ERROR] getNextInvoiceNumber failed; using fallback:', e);
        // Fallback: generate a unique, monotonic-ish number to avoid crashing
        const fallback = `FAC-OFFLINE-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;
        return fallback;
      }
    }

    // Should never reach here
    return `FAC-${Date.now()}`;
  }

  // Invoice Items
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values(item).returning();
    return newItem;
  }

  async deleteInvoiceItems(invoiceId: string): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).where(eq(paymentMethods.active, true));
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return method || undefined;
  }

  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    const [newMethod] = await db.insert(paymentMethods).values(method).returning();
    return newMethod;
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const [updated] = await db.update(paymentMethods)
      .set(updates)
      .where(eq(paymentMethods.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  // Company Settings
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings || undefined;
  }

  async updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    // First, try to get existing settings
    const existing = await this.getCompanySettings();
    
    if (existing) {
      // Update existing settings
      const [updated] = await db.update(companySettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(companySettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [newSettings] = await db.insert(companySettings).values(settings).returning();
      return newSettings;
    }
  }

  // Message Templates
  async getMessageTemplates(): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates);
  }

  async getMessageTemplate(id: string): Promise<MessageTemplate | undefined> {
    const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id));
    return template || undefined;
  }

  async getMessageTemplateByType(type: string): Promise<MessageTemplate | undefined> {
    const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.type, type));
    return template || undefined;
  }

  async createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    const [newTemplate] = await db.insert(messageTemplates).values(template).returning();
    return newTemplate;
  }

  async updateMessageTemplate(id: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate | undefined> {
    const [updated] = await db.update(messageTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  // WhatsApp Configuration
  async getWhatsappConfig(): Promise<WhatsappConfig | undefined> {
    const [config] = await db.select().from(whatsappConfig).limit(1);
    return config || undefined;
  }

  async updateWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig> {
    // First, try to get existing config
    const existing = await this.getWhatsappConfig();
    
    if (existing) {
      // Update existing config
      const [updated] = await db.update(whatsappConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(whatsappConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new config
      const [newConfig] = await db.insert(whatsappConfig).values(config).returning();
      return newConfig;
    }
  }

  // Cash Closures
  async getCashClosure(id: string): Promise<CashClosure | undefined> {
    const [closure] = await db.select().from(cashClosures).where(eq(cashClosures.id, id));
    return closure || undefined;
  }

  async getCashClosures(dateFrom?: string, dateTo?: string): Promise<CashClosure[]> {
    const conditions = [];
    if (dateFrom) conditions.push(sql`${cashClosures.closingDate} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${cashClosures.closingDate} <= ${dateTo}`);
    
    if (conditions.length > 0) {
      return await db.select().from(cashClosures)
        .where(sql.join(conditions, sql` AND `))
        .orderBy(desc(cashClosures.closingDate));
    }
    
    return await db.select().from(cashClosures)
      .orderBy(desc(cashClosures.closingDate));
  }

  async getCashClosureByDate(date: string): Promise<CashClosure | undefined> {
    const [closure] = await db.select().from(cashClosures)
      .where(sql`DATE(${cashClosures.closingDate}) = ${date}`);
    return closure || undefined;
  }

  async createCashClosure(closure: InsertCashClosure): Promise<CashClosure> {
    const [newClosure] = await db.insert(cashClosures).values(closure).returning();
    return newClosure;
  }

  async updateCashClosure(id: string, updates: Partial<CashClosure>): Promise<CashClosure | undefined> {
    const [updated] = await db.update(cashClosures)
      .set(updates)
      .where(eq(cashClosures.id, id))
      .returning();
    return updated || undefined;
  }

  // Cash Closure Payments
  async getCashClosurePayments(cashClosureId: string): Promise<CashClosurePayment[]> {
    return await db.select().from(cashClosurePayments)
      .where(eq(cashClosurePayments.cashClosureId, cashClosureId));
  }

  async createCashClosurePayment(payment: InsertCashClosurePayment): Promise<CashClosurePayment> {
    const [newPayment] = await db.insert(cashClosurePayments).values(payment).returning();
    return newPayment;
  }

  async deleteCashClosurePayments(cashClosureId: string): Promise<void> {
    await db.delete(cashClosurePayments).where(eq(cashClosurePayments.cashClosureId, cashClosureId));
  }

  // Airtable Configuration
  async getAirtableConfig(): Promise<AirtableConfig | undefined> {
    const [config] = await db.select().from(airtableConfig);
    return config || undefined;
  }

  async updateAirtableConfig(config: InsertAirtableConfig): Promise<AirtableConfig> {
    const existing = await this.getAirtableConfig();
    
    if (existing) {
      const [updated] = await db.update(airtableConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(airtableConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(airtableConfig).values(config).returning();
      return newConfig;
    }
  }

  // Airtable Sync Queue
  async getAirtableSyncQueueItems(status?: string, entityType?: string): Promise<AirtableSyncQueue[]> {
    const conditions = [];
    if (status) conditions.push(eq(airtableSyncQueue.status, status));
    if (entityType) conditions.push(eq(airtableSyncQueue.entityType, entityType));
    
    if (conditions.length > 0) {
      return await db.select().from(airtableSyncQueue)
        .where(sql.join(conditions, sql` AND `))
        .orderBy(desc(airtableSyncQueue.createdAt));
    }
    
    return await db.select().from(airtableSyncQueue)
      .orderBy(desc(airtableSyncQueue.createdAt));
  }

  async createAirtableSyncQueueItem(item: InsertAirtableSyncQueue): Promise<AirtableSyncQueue> {
    const [newItem] = await db.insert(airtableSyncQueue).values(item).returning();
    return newItem;
  }

  async updateAirtableSyncQueueItem(id: string, updates: Partial<AirtableSyncQueue>): Promise<AirtableSyncQueue | undefined> {
    const [updated] = await db.update(airtableSyncQueue)
      .set(updates)
      .where(eq(airtableSyncQueue.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAirtableSyncQueueItem(id: string): Promise<void> {
    await db.delete(airtableSyncQueue).where(eq(airtableSyncQueue.id, id));
  }

  // Metrics and Analytics (simplified implementations using raw SQL)
  async getDailyMetrics(date: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    totalItems: number;
    deliveredInvoices: number;
    pendingInvoices: number;
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }> {
    const dateCondition = sql`DATE(${invoices.date}) = ${date}`;
    
    const [salesData] = await db
      .select({
        totalSales: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
        totalInvoices: sql<number>`COUNT(*)`,
        deliveredInvoices: sql<number>`SUM(CASE WHEN ${invoices.delivered} = true THEN 1 ELSE 0 END)`,
        pendingInvoices: sql<number>`SUM(CASE WHEN ${invoices.delivered} = false AND ${invoices.status} != 'cancelled' THEN 1 ELSE 0 END)`
      })
      .from(invoices)
      .where(dateCondition);

    const [itemsData] = await db
      .select({
        totalItems: sql<number>`COALESCE(SUM(${invoiceItems.quantity}), 0)`
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(dateCondition);

    const paymentBreakdown = await db
      .select({
        method: invoices.paymentMethod,
        total: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(invoices)
      .where(sql`${dateCondition} AND ${invoices.paymentMethod} IS NOT NULL AND ${invoices.paymentMethod} != 'pending'`)
      .groupBy(invoices.paymentMethod);

    return {
      totalSales: salesData?.totalSales || 0,
      totalInvoices: salesData?.totalInvoices || 0,
      totalItems: itemsData?.totalItems || 0,
      deliveredInvoices: salesData?.deliveredInvoices || 0,
      pendingInvoices: salesData?.pendingInvoices || 0,
      paymentBreakdown: paymentBreakdown.map(pb => ({
        method: pb.method || '',
        total: pb.total,
        count: pb.count
      }))
    };
  }

  async getMonthlyMetrics(month: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    averageDailySales: number;
    bestDay: { date: string; sales: number };
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }> {
    const monthCondition = sql`DATE_TRUNC('month', ${invoices.date}) = ${month + '-01'}`;
    
    const [monthlyData] = await db
      .select({
        totalSales: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
        totalInvoices: sql<number>`COUNT(*)`
      })
      .from(invoices)
      .where(monthCondition);

    const dailySales = await db
      .select({
        date: sql<string>`DATE(${invoices.date})`,
        sales: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`
      })
      .from(invoices)
      .where(monthCondition)
      .groupBy(sql`DATE(${invoices.date})`);

    const bestDay = dailySales.reduce((best, day) => 
      day.sales > best.sales ? { date: day.date, sales: day.sales } : best, 
      { date: '', sales: 0 }
    );

    const paymentBreakdown = await db
      .select({
        method: invoices.paymentMethod,
        total: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(invoices)
      .where(sql`${monthCondition} AND ${invoices.paymentMethod} IS NOT NULL AND ${invoices.paymentMethod} != 'pending'`)
      .groupBy(invoices.paymentMethod);

    return {
      totalSales: monthlyData?.totalSales || 0,
      totalInvoices: monthlyData?.totalInvoices || 0,
      averageDailySales: dailySales.length > 0 ? (monthlyData?.totalSales || 0) / dailySales.length : 0,
      bestDay,
      paymentBreakdown: paymentBreakdown.map(pb => ({
        method: pb.method || '',
        total: pb.total,
        count: pb.count
      }))
    };
  }

  async getDateRangeMetrics(from: string, to: string): Promise<{
    totalSales: number;
    totalInvoices: number;
    dailyTrends: Array<{ date: string; sales: number; invoices: number }>;
    topServices: Array<{ name: string; quantity: number; revenue: number }>;
    paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  }> {
    const rangeCondition = sql`DATE(${invoices.date}) BETWEEN ${from} AND ${to}`;
    
    const [rangeData] = await db
      .select({
        totalSales: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
        totalInvoices: sql<number>`COUNT(*)`
      })
      .from(invoices)
      .where(rangeCondition);

    const dailyTrends = await db
      .select({
        date: sql<string>`DATE(${invoices.date})`,
        sales: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
        invoices: sql<number>`COUNT(*)`
      })
      .from(invoices)
      .where(rangeCondition)
      .groupBy(sql`DATE(${invoices.date})`)
      .orderBy(sql`DATE(${invoices.date})`);

    const topServices = await db
      .select({
        name: invoiceItems.serviceName,
        quantity: sql<number>`SUM(${invoiceItems.quantity})`,
        revenue: sql<number>`SUM(CAST(${invoiceItems.unitPrice} AS DECIMAL) * ${invoiceItems.quantity})`
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(rangeCondition)
      .groupBy(invoiceItems.serviceName)
      .orderBy(sql`SUM(CAST(${invoiceItems.unitPrice} AS DECIMAL) * ${invoiceItems.quantity}) DESC`)
      .limit(10);

    const paymentBreakdown = await db
      .select({
        method: invoices.paymentMethod,
        total: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(invoices)
      .where(sql`${rangeCondition} AND ${invoices.paymentMethod} IS NOT NULL AND ${invoices.paymentMethod} != 'pending'`)
      .groupBy(invoices.paymentMethod);

    return {
      totalSales: rangeData?.totalSales || 0,
      totalInvoices: rangeData?.totalInvoices || 0,
      dailyTrends,
      topServices,
      paymentBreakdown: paymentBreakdown.map(pb => ({
        method: pb.method || '',
        total: pb.total,
        count: pb.count
      }))
    };
  }

  // Order Timestamps & Delivery Tracking
  async getOrderTimestamps(invoiceId: string): Promise<OrderTimestamp[]> {
    return await db.select().from(orderTimestamps)
      .where(eq(orderTimestamps.invoiceId, invoiceId))
      .orderBy(orderTimestamps.timestamp);
  }

  async createOrderTimestamp(timestamp: InsertOrderTimestamp): Promise<OrderTimestamp> {
    const [newTimestamp] = await db.insert(orderTimestamps).values(timestamp).returning();
    return newTimestamp;
  }

  async getDeliveryMetrics(invoiceId: string): Promise<DeliveryMetrics | undefined> {
    const [metrics] = await db.select().from(deliveryMetrics)
      .where(eq(deliveryMetrics.invoiceId, invoiceId));
    return metrics || undefined;
  }

  async createDeliveryMetrics(metrics: InsertDeliveryMetrics): Promise<DeliveryMetrics> {
    const [newMetrics] = await db.insert(deliveryMetrics).values(metrics).returning();
    return newMetrics;
  }

  async updateDeliveryMetrics(invoiceId: string, updates: Partial<DeliveryMetrics>): Promise<DeliveryMetrics | undefined> {
    const [updated] = await db.update(deliveryMetrics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deliveryMetrics.invoiceId, invoiceId))
      .returning();
    return updated || undefined;
  }

  async getDeliveryAnalytics(dateFrom?: string, dateTo?: string): Promise<{
    avgProcessingTime: number;
    avgTotalTime: number;
    onTimePercentage: number;
    totalOrders: number;
    delayedOrders: number;
    byServiceType: Record<string, any>;
    byPriority: Record<string, any>;
  }> {
    const conditions = [];
    if (dateFrom) conditions.push(sql`${deliveryMetrics.createdAt} >= ${new Date(dateFrom)}`);
    if (dateTo) conditions.push(sql`${deliveryMetrics.createdAt} <= ${new Date(dateTo)}`);

    const metrics = await db.select().from(deliveryMetrics)
      .where(conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined);

    const totalOrders = metrics.length;
    const delayedOrders = metrics.filter(m => !m.onTimeDelivery).length;
    const onTimePercentage = totalOrders > 0 ? (totalOrders - delayedOrders) / totalOrders * 100 : 0;

    const avgProcessingTime = totalOrders > 0
      ? metrics.reduce((sum, m) => sum + (m.processingTime || 0), 0) / totalOrders
      : 0;

    const avgTotalTime = totalOrders > 0
      ? metrics.reduce((sum, m) => sum + (m.totalTime || 0), 0) / totalOrders
      : 0;

    const byServiceType = metrics.reduce((acc, metric) => {
      const type = metric.serviceType || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, avgTime: 0, onTime: 0 };
      }
      acc[type].count++;
      acc[type].avgTime = (acc[type].avgTime * (acc[type].count - 1) + (metric.totalTime || 0)) / acc[type].count;
      if (metric.onTimeDelivery) acc[type].onTime++;
      return acc;
    }, {} as Record<string, any>);

    const byPriority = metrics.reduce((acc, metric) => {
      const priority = metric.priority || 'normal';
      if (!acc[priority]) {
        acc[priority] = { count: 0, avgTime: 0, onTime: 0 };
      }
      acc[priority].count++;
      acc[priority].avgTime = (acc[priority].avgTime * (acc[priority].count - 1) + (metric.totalTime || 0)) / acc[priority].count;
      if (metric.onTimeDelivery) acc[priority].onTime++;
      return acc;
    }, {} as Record<string, any>);

    return {
      avgProcessingTime,
      avgTotalTime,
      onTimePercentage,
      totalOrders,
      delayedOrders,
      byServiceType,
      byPriority,
    };
  }
}

export const storage = new DatabaseStorage();
