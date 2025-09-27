import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  position: text("position").notNull(),
  accessCode: text("access_code").notNull().unique(),
  role: text("role").notNull(), // 'manager', 'supervisor', 'employee'
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastAccess: timestamp("last_access"),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0"),
  ordersCount: integer("orders_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull().default('Ropa Básica'),
  washPrice: decimal("wash_price", { precision: 10, scale: 2 }).notNull(),
  ironPrice: decimal("iron_price", { precision: 10, scale: 2 }).notNull(),
  bothPrice: decimal("both_price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  date: timestamp("date").defaultNow(),
  deliveryDate: timestamp("delivery_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"), // 'cash', 'card', 'transfer', 'mobile_pay', 'pending'
  paymentReference: text("payment_reference"), // Referencia opcional para pagos
  status: text("status").default("received"), // 'received', 'in_process', 'ready', 'delivered', 'cancelled'
  employeeId: varchar("employee_id").references(() => employees.id),
  paid: boolean("paid").default(false),
  delivered: boolean("delivered").default(false),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
});

export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  serviceId: varchar("service_id").references(() => services.id).notNull(),
  serviceName: text("service_name").notNull(),
  serviceType: text("service_type").notNull(), // 'wash', 'iron', 'both'
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // Stable code for mapping: 'cash', 'card', 'transfer', 'mobile_pay'
  icon: text("icon").notNull(),
  active: boolean("active").default(true),
  requiresReference: boolean("requires_reference").default(false),
  commission: decimal("commission", { precision: 5, scale: 2 }).default("0"),
  description: text("description"),
  showOnInvoice: boolean("show_on_invoice").default(true),
  color: text("color").default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  commercialName: text("commercial_name"),
  email: text("email"),
  phone: text("phone").notNull(),
  phone2: text("phone2"),
  address: text("address"),
  branch: text("branch"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  rnc: text("rnc"),
  website: text("website"),
  logo: text("logo"),
  invoiceFooter: text("invoice_footer"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).default("0.18"), // Tax rate (e.g., 0.18 for 18%)
  showRncOnInvoice: boolean("show_rnc_on_invoice").default(true),
  showAddressOnInvoice: boolean("show_address_on_invoice").default(true),
  showPhoneOnInvoice: boolean("show_phone_on_invoice").default(true),
  showEmailOnInvoice: boolean("show_email_on_invoice").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderTimestamps = pgTable("order_timestamps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  status: text("status").notNull(), // 'received', 'in_process', 'ready', 'delivered', 'cancelled'
  timestamp: timestamp("timestamp").defaultNow(),
  employeeId: varchar("employee_id").references(() => employees.id),
  notes: text("notes"),
  previousStatus: text("previous_status"),
  duration: integer("duration"), // Duration in minutes from previous status
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryMetrics = pgTable("delivery_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  estimatedDeliveryTime: integer("estimated_delivery_time"), // Estimated time in hours
  actualDeliveryTime: integer("actual_delivery_time"), // Actual time in minutes
  processingTime: integer("processing_time"), // Time from received to ready (minutes)
  readyToDeliveredTime: integer("ready_to_delivered_time"), // Time from ready to delivered (minutes)
  totalTime: integer("total_time"), // Total time from received to delivered (minutes)
  onTimeDelivery: boolean("on_time_delivery").default(false),
  delayReason: text("delay_reason"),
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  serviceType: text("service_type"), // 'wash', 'iron', 'both'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'order_ready', 'invoice_whatsapp', 'reminder', 'pending_payment'
  title: text("title").notNull(),
  message: text("message").notNull(),
  active: boolean("active").default(true),
  autoSend: boolean("auto_send").default(false),
  sendTime: text("send_time"),
  reminderDays: integer("reminder_days"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Planes de suscripción
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingPeriod: text("billing_period").notNull(), // 'monthly', 'yearly'
  features: text("features").array(), // Array de características
  maxOrganizations: integer("max_organizations").default(1),
  maxUsers: integer("max_users").default(1),
  maxInvoicesPerMonth: integer("max_invoices_per_month"),
  supportLevel: text("support_level").default("basic"), // 'basic', 'priority', 'dedicated'
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizaciones/Empresas de usuarios
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subdomain: text("subdomain").unique(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Dominican Republic"),
  logo: text("logo"),
  planId: varchar("plan_id").references(() => subscriptionPlans.id),
  subscriptionStatus: text("subscription_status").default("active"), // 'active', 'inactive', 'suspended', 'cancelled'
  subscriptionStartDate: timestamp("subscription_start_date").defaultNow(),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isTrialActive: boolean("is_trial_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usuarios externos (clientes del SaaS)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  password: text("password").notNull(), // Hash de la contraseña
  organizationId: varchar("organization_id").references(() => organizations.id),
  role: text("role").default("owner"), // 'owner', 'admin', 'user'
  isActive: boolean("is_active").default(true),
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  lastLoginAt: timestamp("last_login_at"),
  avatar: text("avatar"),
  preferences: text("preferences"), // JSON string de preferencias
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sesiones de usuarios
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contadores para números secuenciales
export const counters = pgTable("counters", {
  id: varchar("id").primaryKey(),
  value: integer("value").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Configuración WhatsApp
export const whatsappConfig = pgTable("whatsapp_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: text("api_key"), // API key del proveedor WhatsApp (encriptado)
  phoneNumber: text("phone_number").notNull(), // Número de teléfono asociado
  provider: text("provider").default("twilio"), // 'twilio', 'whatsapp_cloud_api', 'custom'
  baseUrl: text("base_url"), // URL base para API custom
  enabled: boolean("enabled").default(false),
  autoSendOnReady: boolean("auto_send_on_ready").default(false),
  retryAttempts: integer("retry_attempts").default(3),
  retryDelay: integer("retry_delay").default(5), // minutos
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Registro histórico de cierres de caja
export const cashClosures = pgTable("cash_closures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  closingDate: timestamp("closing_date").notNull(), // Fecha del cierre
  openedAt: timestamp("opened_at").defaultNow(), // Cuando se abrió la caja
  closedAt: timestamp("closed_at"), // Cuando se cerró
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  openingCash: decimal("opening_cash", { precision: 10, scale: 2 }).default("0"), // Dinero inicial
  countedCash: decimal("counted_cash", { precision: 10, scale: 2 }), // Dinero contado físicamente
  systemCash: decimal("system_cash", { precision: 10, scale: 2 }).notNull(), // Dinero según sistema
  variance: decimal("variance", { precision: 10, scale: 2 }), // Diferencia (contado - sistema)
  notes: text("notes"), // Observaciones del cierre
  // Snapshot de totales del día
  snapshotSubtotal: decimal("snapshot_subtotal", { precision: 10, scale: 2 }).notNull(),
  snapshotTax: decimal("snapshot_tax", { precision: 10, scale: 2 }).notNull(),
  snapshotTotal: decimal("snapshot_total", { precision: 10, scale: 2 }).notNull(),
  snapshotTotalInvoices: integer("snapshot_total_invoices").notNull(),
  snapshotDeliveredInvoices: integer("snapshot_delivered_invoices").notNull(),
  snapshotPendingInvoices: integer("snapshot_pending_invoices").notNull(),
  snapshotTotalItems: integer("snapshot_total_items").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Desglose por método de pago de cada cierre
export const cashClosurePayments = pgTable("cash_closure_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cashClosureId: varchar("cash_closure_id").references(() => cashClosures.id).notNull(),
  methodCode: text("method_code").notNull(), // Código del método de pago
  methodName: text("method_name").notNull(), // Nombre del método
  quantity: integer("quantity").notNull(), // Número de transacciones
  total: decimal("total", { precision: 10, scale: 2 }).notNull(), // Total por método
});

// Configuración de integración con Airtable
export const airtableConfig = pgTable("airtable_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").default(false),
  baseId: text("base_id"), // ID de la base de Airtable
  tableInvoices: text("table_invoices").default("Invoices"), // Nombre tabla facturas
  tableInvoiceItems: text("table_invoice_items").default("Invoice Items"), // Nombre tabla items
  apiToken: text("api_token"), // Token de API (almacenado en servidor)
  lastSyncDate: timestamp("last_sync_date"), // Última sincronización exitosa
  syncStatus: text("sync_status").default("idle"), // 'idle', 'syncing', 'error'
  lastError: text("last_error"), // Último error de sincronización
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cola de sincronización con Airtable
export const airtableSyncQueue = pgTable("airtable_sync_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'invoice', 'invoice_item'
  entityId: varchar("entity_id").notNull(), // ID del registro a sincronizar
  status: text("status").default("pending"), // 'pending', 'synced', 'error'
  retries: integer("retries").default(0),
  maxRetries: integer("max_retries").default(3),
  lastError: text("last_error"),
  externalId: text("external_id"), // ID en Airtable después de sincronizar
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  lastAccess: true,
});

// Patch schemas for partial updates
export const patchEmployeeSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  accessCode: z.string().optional(),
  role: z.enum(['manager', 'supervisor', 'employee']).optional(),
  active: z.boolean().optional(),
});

export const updateEmployeeSchema = insertEmployeeSchema.partial();

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  totalSpent: true,
  ordersCount: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  updatedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertCounterSchema = createInsertSchema(counters).omit({
  updatedAt: true,
});

export const insertWhatsappConfigSchema = createInsertSchema(whatsappConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertCashClosureSchema = createInsertSchema(cashClosures).omit({
  id: true,
  openedAt: true,
  createdAt: true,
});

export const insertCashClosurePaymentSchema = createInsertSchema(cashClosurePayments).omit({
  id: true,
});

export const insertAirtableConfigSchema = createInsertSchema(airtableConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertAirtableSyncQueueSchema = createInsertSchema(airtableSyncQueue).omit({
  id: true,
  createdAt: true,
});

export const insertOrderTimestampSchema = createInsertSchema(orderTimestamps).omit({
  id: true,
  createdAt: true,
});

export const insertDeliveryMetricsSchema = createInsertSchema(deliveryMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type Counter = typeof counters.$inferSelect;
export type InsertCounter = z.infer<typeof insertCounterSchema>;

export type WhatsappConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsappConfig = z.infer<typeof insertWhatsappConfigSchema>;

export type CashClosure = typeof cashClosures.$inferSelect;
export type InsertCashClosure = z.infer<typeof insertCashClosureSchema>;

export type CashClosurePayment = typeof cashClosurePayments.$inferSelect;
export type InsertCashClosurePayment = z.infer<typeof insertCashClosurePaymentSchema>;

export type AirtableConfig = typeof airtableConfig.$inferSelect;
export type InsertAirtableConfig = z.infer<typeof insertAirtableConfigSchema>;

export type AirtableSyncQueue = typeof airtableSyncQueue.$inferSelect;
export type InsertAirtableSyncQueue = z.infer<typeof insertAirtableSyncQueueSchema>;

export type OrderTimestamp = typeof orderTimestamps.$inferSelect;
export type InsertOrderTimestamp = z.infer<typeof insertOrderTimestampSchema>;

export type DeliveryMetrics = typeof deliveryMetrics.$inferSelect;
export type InsertDeliveryMetrics = z.infer<typeof insertDeliveryMetricsSchema>;

// PATCH request schemas for order management
export const patchOrderStatusSchema = z.object({
  status: z.enum(['received', 'in_process', 'ready', 'delivered', 'cancelled']),
});

export const patchOrderPaymentSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
  paymentReference: z.string().optional(),
});

export const patchOrderCancelSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required").trim(),
});

// Schema for finalizing payment on draft invoices
export const patchInvoicePaySchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
  paymentReference: z.string().optional(),
});

// Schemas for cash closure functionality
export const createCashClosureSchema = z.object({
  closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
  countedCash: z.number().min(0, "Counted cash must be non-negative"),
  openingCash: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const metricsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  range: z.enum(['7d', '30d', '90d']).optional(),
});

export const cashClosuresQuerySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid dateFrom format, expected YYYY-MM-DD").optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid dateTo format, expected YYYY-MM-DD").optional(),
});

export const airtableConfigSchema = z.object({
  enabled: z.boolean(),
  baseId: z.string().min(1).optional(),
  tableInvoices: z.string().min(1).optional(),
  tableInvoiceItems: z.string().min(1).optional(),
  apiToken: z.string().min(1).optional(),
});

export type PatchOrderStatus = z.infer<typeof patchOrderStatusSchema>;
export type PatchOrderPayment = z.infer<typeof patchOrderPaymentSchema>;
export type PatchOrderCancel = z.infer<typeof patchOrderCancelSchema>;
export type PatchInvoicePay = z.infer<typeof patchInvoicePaySchema>;
export type CreateCashClosure = z.infer<typeof createCashClosureSchema>;
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
export type CashClosuresQuery = z.infer<typeof cashClosuresQuerySchema>;
export type AirtableConfigUpdate = z.infer<typeof airtableConfigSchema>;
