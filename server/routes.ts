import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertServiceSchema, insertInvoiceSchema, insertInvoiceItemSchema, insertPaymentMethodSchema, insertCompanySettingsSchema, insertMessageTemplateSchema, insertEmployeeSchema, patchEmployeeSchema, updateEmployeeSchema, patchOrderStatusSchema, patchOrderPaymentSchema, patchOrderCancelSchema, patchInvoicePaySchema, insertWhatsappConfigSchema, createCashClosureSchema, insertCashClosurePaymentSchema, metricsQuerySchema, cashClosuresQuerySchema, insertAirtableConfigSchema, insertAirtableSyncQueueSchema, insertOrderTimestampSchema, insertDeliveryMetricsSchema, insertUserSchema, insertOrganizationSchema } from "@shared/schema";
import { z } from "zod";
import type { WhatsappConfig } from "@shared/schema";
import { EmailService } from "./email-service";
import bcrypt from "bcrypt";
import crypto from "crypto";

// WhatsApp utility function
async function sendWhatsAppMessage(phone: string, message: string, config: WhatsappConfig): Promise<boolean> {
  try {
    // For now, this is a simulation. In production, you would implement:
    // - Twilio WhatsApp API integration
    // - WhatsApp Business API integration  
    // - Other providers based on config.provider
    
    console.log(`[WhatsApp] Sending message to ${phone}: ${message}`);
    console.log(`[WhatsApp] Provider: ${config.provider}, Enabled: ${config.enabled}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In production, implement actual WhatsApp API calls here:
    // if (config.provider === 'twilio') {
    //   // Implement Twilio WhatsApp API
    //   const client = twilio(config.apiKey, config.apiSecret);
    //   await client.messages.create({
    //     body: message,
    //     from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
    //     to: `whatsapp:${phone}`
    //   });
    // }
    
    return true;
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error);
    return false;
  }
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  employee?: any;
}

interface UserAuthenticatedRequest extends Request {
  user?: any;
  organization?: any;
}

async function requireAuthentication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const accessCode = req.headers['x-access-code'] as string;
    
    if (!accessCode) {
      return res.status(401).json({ message: "Access code required for authentication" });
    }
    
    const employee = await storage.getEmployeeByAccessCode(accessCode);
    
    if (!employee || !employee.active) {
      return res.status(401).json({ message: "Invalid access code or inactive employee" });
    }
    
    req.employee = employee;
    next();
  } catch (error) {
    console.error('[Authentication] Error:', error);
    res.status(500).json({ message: "Authentication error" });
  }
}

// Role-based authorization middleware
async function requireManagerRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.employee) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.employee.role !== 'manager') {
      return res.status(403).json({ message: "Manager role required for this operation" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Authorization error" });
  }
}

// User authentication middleware
async function requireUserAuthentication(req: UserAuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer token

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const session = await storage.getUserSession(token);
    if (!session) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const user = await storage.getUser(session.userId);
    if (!user || !user.isActive || !user.isEmailVerified) {
      return res.status(401).json({ message: "User account is not active or verified" });
    }

    let organization = null;
    if (user.organizationId) {
      organization = await storage.getOrganization(user.organizationId);
    }

    req.user = user;
    req.organization = organization;
    next();
  } catch (error) {
    console.error('[User Authentication] Error:', error);
    res.status(500).json({ message: "Authentication error" });
  }
}

// Role-based authorization for users
async function requireUserRole(roles: string[]) {
  return async (req: UserAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User authentication required" });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: `Required role: ${roles.join(' or ')}` });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: "Authorization error" });
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { accessCode } = req.body;
      const employee = await storage.getEmployeeByAccessCode(accessCode);

      if (!employee) {
        return res.status(401).json({ message: "Invalid access code" });
      }

      res.json({ employee });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // User Registration with Email Activation
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Generate activation token
      const activationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours from now

      // Create user with verification token
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        isEmailVerified: false,
        emailVerificationToken: activationToken,
        emailVerificationExpires: tokenExpiry,
      });

      // Generate activation URL
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const activationUrl = `${baseUrl}/activate?token=${activationToken}&email=${encodeURIComponent(userData.email)}`;

      // Send activation email
      const emailSent = await EmailService.sendUserActivationEmail({
        to: userData.email,
        username: `${userData.firstName} ${userData.lastName}`,
        activationToken,
        activationUrl,
      });

      if (!emailSent) {
        console.warn("Failed to send activation email, but user was created");
      }

      // Don't return sensitive data
      const { password, emailVerificationToken, ...safeUser } = user;

      res.status(201).json({
        message: "User registered successfully. Please check your email to activate your account.",
        user: safeUser,
        emailSent,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  // User Account Activation
  app.post("/api/auth/activate", async (req, res) => {
    try {
      const { token, email } = req.body;

      if (!token || !email) {
        return res.status(400).json({ message: "Activation token and email are required" });
      }

      // Find user with matching email and token
      const user = await storage.getUserByEmailAndToken(email, token);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired activation token" });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Account is already activated" });
      }

      // Activate user
      const activatedUser = await storage.updateUser(user.id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        isActive: true,
      });

      // Don't return sensitive data
      const { password, emailVerificationToken, ...safeUser } = activatedUser;

      res.json({
        message: "Account activated successfully. You can now log in.",
        user: safeUser,
      });

    } catch (error) {
      console.error("Activation error:", error);
      res.status(500).json({ message: "Server error during activation" });
    }
  });

  // Resend Activation Email
  app.post("/api/auth/resend-activation", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        // Don't reveal if user exists or not
        return res.json({ message: "If an account exists with this email, an activation email will be sent." });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Account is already activated" });
      }

      // Generate new activation token
      const activationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours from now

      // Update user with new token
      await storage.updateUser(user.id, {
        emailVerificationToken: activationToken,
        emailVerificationExpires: tokenExpiry,
      });

      // Generate activation URL
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const activationUrl = `${baseUrl}/activate?token=${activationToken}&email=${encodeURIComponent(email)}`;

      // Send activation email
      const emailSent = await EmailService.sendUserActivationEmail({
        to: email,
        username: `${user.firstName} ${user.lastName}`,
        activationToken,
        activationUrl,
      });

      res.json({
        message: "If an account exists with this email, an activation email will be sent.",
        emailSent,
      });

    } catch (error) {
      console.error("Resend activation error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // User Login with Session Management
  app.post("/api/auth/user-login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is verified and active
      if (!user.isEmailVerified) {
        return res.status(401).json({ message: "Please verify your email before logging in" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      // Create session
      const session = await storage.createUserSession({
        userId: user.id,
        token: sessionToken,
        expiresAt,
      });

      // Update last login
      await storage.updateUser(user.id, {
        lastLoginAt: new Date(),
      });

      // Get organization info if exists
      let organization = null;
      if (user.organizationId) {
        organization = await storage.getOrganization(user.organizationId);
      }

      // Return safe user data
      const { password: _, emailVerificationToken, ...safeUser } = user;

      res.json({
        message: "Login successful",
        user: safeUser,
        organization,
        token: sessionToken,
        expiresAt: session.expiresAt,
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  });

  // User Logout
  app.post("/api/auth/logout", requireUserAuthentication, async (req: UserAuthenticatedRequest, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        await storage.deleteUserSession(token);
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Server error during logout" });
    }
  });

  // Organization Setup Route
  app.post("/api/organizations", requireUserAuthentication, async (req: UserAuthenticatedRequest, res) => {
    try {
      // Only allow users who don't have an organization yet
      if (req.user.organizationId) {
        return res.status(400).json({ message: "User already belongs to an organization" });
      }

      const orgData = insertOrganizationSchema.parse(req.body);

      // Check if subdomain is already taken
      if (orgData.subdomain) {
        const existingOrg = await storage.getOrganizationBySubdomain(orgData.subdomain);
        if (existingOrg) {
          return res.status(400).json({ message: "Subdomain is already taken" });
        }
      }

      // Create organization
      const organization = await storage.createOrganization(orgData);

      // Update user to be owner of this organization
      await storage.updateUser(req.user.id, {
        organizationId: organization.id,
        role: 'owner',
      });

      res.status(201).json({
        message: "Organization created successfully",
        organization,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Organization creation error:", error);
      res.status(500).json({ message: "Server error during organization creation" });
    }
  });

  // Get Current User Profile
  app.get("/api/auth/me", requireUserAuthentication, async (req: UserAuthenticatedRequest, res) => {
    try {
      const { password, emailVerificationToken, ...safeUser } = req.user;

      res.json({
        user: safeUser,
        organization: req.organization,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Services
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const service = await storage.updateService(id, updates);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/customers/phone/:phone", async (req, res) => {
    try {
      const { phone } = req.params;
      const customer = await storage.getCustomerByPhone(phone);
      res.json(customer || null);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/invoices/next-number", async (req, res) => {
    try {
      const number = await storage.getNextInvoiceNumber();
      res.json({ number });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/invoices", requireAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
      const { invoice: invoiceData, items } = req.body;
      
      // Parse string dates back to Date objects (JSON.stringify converts Date to string)
      const processedInvoiceData = {
        ...invoiceData,
        date: invoiceData.date ? new Date(invoiceData.date) : undefined,
        deliveryDate: invoiceData.deliveryDate ? new Date(invoiceData.deliveryDate) : null,
      };
      
      // Generate a new invoice number atomically (ignore the one from frontend)
      console.log('[DEBUG] Generating new invoice number for creation...');
      const uniqueInvoiceNumber = await storage.getNextInvoiceNumber();
      console.log(`[DEBUG] Generated unique invoice number: ${uniqueInvoiceNumber}`);
      
      // Override the invoice number with the newly generated one
      const invoiceWithUniqueNumber = {
        ...processedInvoiceData,
        number: uniqueInvoiceNumber
      };
      
      // Validate invoice data
      const validatedInvoice = insertInvoiceSchema.parse(invoiceWithUniqueNumber);
      
      // Create invoice
      const invoice = await storage.createInvoice(validatedInvoice);
      
      // Create invoice items
      const invoiceItems = [];
      for (const itemData of items) {
        const validatedItem = insertInvoiceItemSchema.parse({
          ...itemData,
          invoiceId: invoice.id
        });
        const item = await storage.createInvoiceItem(validatedItem);
        invoiceItems.push(item);
      }

      // Auto-queue for Airtable sync if enabled
      try {
        const airtableConfig = await storage.getAirtableConfig();
        if (airtableConfig && airtableConfig.enabled) {
          // Queue the invoice for sync
          await storage.createAirtableSyncQueueItem({
            entityType: 'invoice',
            entityId: invoice.id,
            status: 'pending'
          });
          console.log(`[Airtable] Invoice ${invoice.number} queued for sync`);

          // Queue each invoice item for sync
          for (const item of invoiceItems) {
            await storage.createAirtableSyncQueueItem({
              entityType: 'invoice_item',
              entityId: item.id,
              status: 'pending'
            });
          }
          console.log(`[Airtable] ${invoiceItems.length} invoice items queued for sync`);
        }
      } catch (airtableError) {
        // Don't fail invoice creation if Airtable queueing fails
        console.error('[Airtable] Error queueing for sync:', airtableError);
      }

      // Update customer if exists
      if (invoice.customerId) {
        const customer = await storage.getCustomer(invoice.customerId);
        if (customer) {
          await storage.updateCustomer(invoice.customerId, {
            totalSpent: (parseFloat(customer.totalSpent || "0") + parseFloat(invoice.total)).toFixed(2),
            ordersCount: (customer.ordersCount || 0) + 1
          });
        }
      }
      
      res.status(201).json({ invoice, items: invoiceItems });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Invoice creation error:", (error as Error).message);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/invoices/:id/items", async (req, res) => {
    try {
      const { id } = req.params;
      const items = await storage.getInvoiceItems(id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/invoices/:id", requireAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const invoice = await storage.updateInvoice(id, updates);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Finalize payment for draft invoices
  app.patch("/api/invoices/:id/pay", requireAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body
      const validationResult = patchInvoicePaySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { paymentMethod, paymentReference } = validationResult.data;
      
      // Check if invoice exists and is unpaid
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.paid) {
        return res.status(400).json({ message: "Invoice is already paid" });
      }
      
      // Update invoice to mark as paid
      const updatedInvoice = await storage.updateInvoice(id, {
        paid: true,
        paymentMethod,
        paymentReference: paymentReference || null,
      });
      
      console.log(`[DEBUG] Invoice ${invoice.number} finalized with payment method: ${paymentMethod}`);
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error finalizing invoice payment:", (error as Error).message);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Order Management - PATCH routes for status updates
  
  // Change order status
  app.patch("/api/invoices/:id/status", requireAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body with Zod
      const validationResult = patchOrderStatusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { status } = validationResult.data;
      
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Validate status transitions
      const currentStatus = invoice.status;
      const validTransitions: Record<string, string[]> = {
        'received': ['in_process', 'cancelled'],
        'in_process': ['ready', 'cancelled'],
        'ready': ['delivered', 'in_process'],
        'delivered': [], // Final status
        'cancelled': [] // Final status
      };
      
      if (currentStatus && !validTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid transition from ${currentStatus} to ${status}` 
        });
      }
      
      // Update status and set delivered flag and delivery date if delivered
      const updates: any = { status, employeeId: req.employee.id };
      if (status === 'delivered') {
        updates.delivered = true;
        updates.deliveryDate = new Date();
      }
      
      const updatedInvoice = await storage.updateInvoice(id, updates);
      
      // WhatsApp automation: Send message when status changes to 'ready' (idempotent)
      if (status === 'ready' && currentStatus !== 'ready') {
        try {
          const whatsappConfig = await storage.getWhatsappConfig();
          if (whatsappConfig && whatsappConfig.enabled && whatsappConfig.autoSendOnReady && invoice.customerPhone) {
            // Send WhatsApp message
            const message = `¡Hola ${invoice.customerName}! Su orden ${invoice.number} está lista para entrega. Puede pasar a recogerla cuando guste. ¡Gracias!`;
            await sendWhatsAppMessage(invoice.customerPhone, message, whatsappConfig);
            console.log(`WhatsApp sent to ${invoice.customerPhone} for order ${invoice.number}`);
          }
        } catch (error) {
          console.error('Error sending WhatsApp message:', error);
          // Don't fail the status update if WhatsApp fails
        }
      }

      // Delivery tracking: Create timestamp and update metrics
      try {
        // Get existing timestamps to calculate duration
        const existingTimestamps = await storage.getOrderTimestamps(id);
        const previousTimestamp = existingTimestamps.length > 0
          ? existingTimestamps[existingTimestamps.length - 1]
          : null;

        // Calculate duration from previous status
        let duration = 0;
        if (previousTimestamp) {
          const now = new Date();
          const prevTime = new Date(previousTimestamp.timestamp || 0);
          duration = Math.floor((now.getTime() - prevTime.getTime()) / (1000 * 60)); // minutes
        }

        // Create timestamp for this status change
        await storage.createOrderTimestamp({
          invoiceId: id,
          status,
          employeeId: req.employee.id,
          previousStatus: currentStatus,
          duration,
          notes: `Status changed from ${currentStatus} to ${status}`,
        });

        // Update delivery metrics when status changes
        const existingMetrics = await storage.getDeliveryMetrics(id);
        const timestamps = await storage.getOrderTimestamps(id);

        // Calculate service type from invoice items
        const items = await storage.getInvoiceItems(id);
        const primaryServiceType = items.length > 0 ? items[0].serviceType : 'unknown';

        if (existingMetrics) {
          // Update existing metrics
          const updates: any = { serviceType: primaryServiceType };

          if (status === 'ready') {
            // Calculate processing time (received to ready)
            const receivedTs = timestamps.find(ts => ts.status === 'received');
            const readyTs = timestamps.find(ts => ts.status === 'ready');
            if (receivedTs && readyTs) {
              const processingTime = Math.floor(
                (new Date(readyTs.timestamp || 0).getTime() - new Date(receivedTs.timestamp || 0).getTime()) / (1000 * 60)
              );
              updates.processingTime = processingTime;
            }
          } else if (status === 'delivered') {
            // Calculate total time and delivery performance
            const receivedTs = timestamps.find(ts => ts.status === 'received');
            const readyTs = timestamps.find(ts => ts.status === 'ready');
            const deliveredTs = timestamps.find(ts => ts.status === 'delivered');

            if (receivedTs && deliveredTs) {
              const totalTime = Math.floor(
                (new Date(deliveredTs.timestamp || 0).getTime() - new Date(receivedTs.timestamp || 0).getTime()) / (1000 * 60)
              );
              updates.totalTime = totalTime;
              updates.actualDeliveryTime = totalTime;

              // Check if delivered on time (assuming 24 hours = 1440 minutes standard)
              const estimatedTime = existingMetrics.estimatedDeliveryTime || 24; // hours
              updates.onTimeDelivery = totalTime <= (estimatedTime * 60);
            }

            if (readyTs && deliveredTs) {
              const readyToDeliveredTime = Math.floor(
                (new Date(deliveredTs.timestamp || 0).getTime() - new Date(readyTs.timestamp || 0).getTime()) / (1000 * 60)
              );
              updates.readyToDeliveredTime = readyToDeliveredTime;
            }
          }

          await storage.updateDeliveryMetrics(id, updates);
        } else {
          // Create initial metrics
          const estimatedDeliveryTime = primaryServiceType === 'both' ? 48 : 24; // hours
          await storage.createDeliveryMetrics({
            invoiceId: id,
            estimatedDeliveryTime,
            serviceType: primaryServiceType,
            priority: 'normal',
          });
        }
      } catch (trackingError) {
        console.error('Error updating delivery tracking:', trackingError);
        // Don't fail the status update if tracking fails
      }

      res.json(updatedInvoice);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Process payment
  app.patch("/api/invoices/:id/payment", requireAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body with Zod
      const validationResult = patchOrderPaymentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { paymentMethod, paymentReference } = validationResult.data;
      
      // Get payment methods dynamically from storage
      const availablePaymentMethods = await storage.getPaymentMethods();
      const activePaymentMethods = availablePaymentMethods.filter(method => method.active);
      
      // Validate payment method by name
      const selectedPaymentMethod = activePaymentMethods.find(method => 
        method.name.toLowerCase() === paymentMethod.toLowerCase()
      );
      
      if (!selectedPaymentMethod) {
        const availableNames = activePaymentMethods.map(method => method.name);
        return res.status(400).json({ 
          message: "Invalid payment method", 
          available: availableNames 
        });
      }
      
      // Validate payment reference for methods that require it
      if (selectedPaymentMethod.requiresReference && !paymentReference) {
        return res.status(400).json({ 
          message: `Payment reference is required for ${selectedPaymentMethod.name}` 
        });
      }
      
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Cannot process payment for cancelled orders
      if (invoice.status === 'cancelled') {
        return res.status(400).json({ 
          message: "Cannot process payment for cancelled orders" 
        });
      }
      
      // Prevent re-payment unless explicitly allowed (already paid orders)
      if (invoice.paid) {
        return res.status(400).json({ 
          message: "Order has already been paid. Contact supervisor to modify payment details." 
        });
      }
      
      const updates = {
        paymentMethod: selectedPaymentMethod.name,
        paymentReference: paymentReference || null,
        paid: true,
        employeeId: req.employee.id
      };
      
      const updatedInvoice = await storage.updateInvoice(id, updates);
      res.json(updatedInvoice);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Cancel order
  app.patch("/api/invoices/:id/cancel", requireAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body with Zod
      const validationResult = patchOrderCancelSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { reason } = validationResult.data;
      
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Cannot cancel delivered orders
      if (invoice.status === 'delivered') {
        return res.status(400).json({ 
          message: "Cannot cancel delivered orders" 
        });
      }
      
      // Already cancelled
      if (invoice.status === 'cancelled') {
        return res.status(400).json({ 
          message: "Order is already cancelled" 
        });
      }
      
      const updates = {
        status: 'cancelled' as const,
        cancelledAt: new Date(),
        cancellationReason: reason,
        employeeId: req.employee.id
      };
      
      const updatedInvoice = await storage.updateInvoice(id, updates);
      res.json(updatedInvoice);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard metrics
  app.get("/api/metrics/dashboard", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.date || 0);
        invDate.setHours(0, 0, 0, 0);
        return invDate.getTime() === today.getTime();
      });
      
      const todayRevenue = todayInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const inProgress = invoices.filter(inv => inv.status === 'in_process').length;
      const readyForDelivery = invoices.filter(inv => inv.status === 'ready').length;
      const pendingPayment = invoices.filter(inv => inv.paymentMethod === 'pending').length;
      const pendingPaymentTotal = invoices
        .filter(inv => inv.paymentMethod === 'pending')
        .reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      
      res.json({
        todayOrders: todayInvoices.length,
        todayRevenue: todayRevenue.toFixed(2),
        inProgress,
        readyForDelivery,
        pendingPayment,
        pendingPaymentTotal: pendingPaymentTotal.toFixed(2)
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Payment Methods
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const paymentMethods = await storage.getPaymentMethods();
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/payment-methods", async (req, res) => {
    try {
      const methodData = insertPaymentMethodSchema.parse(req.body);
      const method = await storage.createPaymentMethod(methodData);
      res.json(method);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const method = await storage.updatePaymentMethod(id, updates);
      
      if (!method) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      
      res.json(method);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePaymentMethod(id);
      res.json({ message: "Payment method deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Company Settings
  app.get("/api/company-settings", async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/company-settings", async (req, res) => {
    try {
      const settingsData = insertCompanySettingsSchema.parse(req.body);
      const settings = await storage.updateCompanySettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // WhatsApp Configuration
  app.get("/api/whatsapp-config", async (req, res) => {
    try {
      const config = await storage.getWhatsappConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/whatsapp-config", async (req, res) => {
    try {
      const configData = insertWhatsappConfigSchema.parse(req.body);
      const config = await storage.updateWhatsappConfig(configData);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Message Templates
  app.get("/api/message-templates", async (req, res) => {
    try {
      const templates = await storage.getMessageTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/message-templates/type/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const template = await storage.getMessageTemplateByType(type);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/message-templates", async (req, res) => {
    try {
      const templateData = insertMessageTemplateSchema.parse(req.body);
      const template = await storage.createMessageTemplate(templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/message-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const template = await storage.updateMessageTemplate(id, updates);
      
      if (!template) {
        return res.status(404).json({ message: "Message template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Special route to create first employee (no authentication required if no employees exist)
  app.post("/api/employees/first", async (req, res) => {
    try {
      // Check if any employees exist
      const employees = await storage.getEmployees();
      if (employees.length > 0) {
        return res.status(403).json({ message: "Employees already exist - use regular employee creation endpoint" });
      }

      const employeeData = insertEmployeeSchema.parse(req.body);
      
      // Force first employee to be a manager
      const firstEmployeeData = {
        ...employeeData,
        role: 'manager' as const,
        active: true
      };
      
      const employee = await storage.createEmployee(firstEmployeeData);
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Employee management routes (Manager access only)
  app.get("/api/employees", requireAuthentication, requireManagerRole, async (req: AuthenticatedRequest, res) => {
    try {
      // Get all employees (for employee management)
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/employees", requireAuthentication, requireManagerRole, async (req: AuthenticatedRequest, res) => {
    try {
      const employeeData = insertEmployeeSchema.parse(req.body);
      
      // Check if access code is already in use
      const existingEmployee = await storage.getEmployeeByAccessCode(employeeData.accessCode);
      if (existingEmployee) {
        return res.status(400).json({ message: "Access code already in use" });
      }
      
      const employee = await storage.createEmployee(employeeData);
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/employees/:id", requireAuthentication, requireManagerRole, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = patchEmployeeSchema.parse(req.body);
      
      // If updating access code, check if it's already in use by another employee
      if (updates.accessCode) {
        const existingEmployee = await storage.getEmployeeByAccessCode(updates.accessCode);
        if (existingEmployee && existingEmployee.id !== id) {
          return res.status(400).json({ message: "Access code already in use by another employee" });
        }
      }
      
      const employee = await storage.updateEmployee(id, updates);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/employees/:id", requireAuthentication, requireManagerRole, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = updateEmployeeSchema.parse(req.body);
      
      // If updating access code, check if it's already in use by another employee
      if (updates.accessCode) {
        const existingEmployee = await storage.getEmployeeByAccessCode(updates.accessCode);
        if (existingEmployee && existingEmployee.id !== id) {
          return res.status(400).json({ message: "Access code already in use by another employee" });
        }
      }
      
      const employee = await storage.updateEmployee(id, updates);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/employees/:id", requireAuthentication, requireManagerRole, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Don't allow deletion of current user
      if (req.employee && req.employee.id === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteEmployee(id);
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Cash Closures Routes
  app.get("/api/cash-closures", requireAuthentication, async (req, res) => {
    try {
      const queryData = cashClosuresQuerySchema.parse(req.query);
      const closures = await storage.getCashClosures(
        queryData.dateFrom,
        queryData.dateTo
      );
      res.json(closures);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/cash-closures/history", requireAuthentication, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const closures = await storage.getCashClosures(
        startDate as string,
        endDate as string
      );

      // Get employee names
      const employees = await storage.getEmployees();
      const enrichedClosures = closures.map(closure => {
        const employee = employees.find(emp => emp.id === closure.employeeId);
        return {
          ...closure,
          employeeName: employee?.name || 'Desconocido'
        };
      });

      res.json(enrichedClosures);
    } catch (error) {
      console.error('Error fetching cash closures history:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/cash-closures/:id", requireAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      const closure = await storage.getCashClosure(id);
      
      if (!closure) {
        return res.status(404).json({ message: "Cash closure not found" });
      }
      
      // Get payment breakdown
      const payments = await storage.getCashClosurePayments(id);
      
      res.json({ ...closure, payments });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/cash-closures/by-date/:date", requireAuthentication, async (req, res) => {
    try {
      const { date } = req.params;
      const closure = await storage.getCashClosureByDate(date);
      
      if (!closure) {
        return res.status(404).json({ message: "No closure found for this date" });
      }
      
      // Get payment breakdown
      const payments = await storage.getCashClosurePayments(closure.id);
      
      res.json({ ...closure, payments });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/cash-closures", requireAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
      const closureData = createCashClosureSchema.parse(req.body);
      
      // Check if closure already exists for this date
      const existingClosure = await storage.getCashClosureByDate(closureData.closingDate);
      if (existingClosure) {
        return res.status(409).json({ message: "Cash closure already exists for this date" });
      }
      
      // Get company settings for tax calculation
      const companySettings = await storage.getCompanySettings();
      const taxRate = companySettings?.taxRate ? parseFloat(companySettings.taxRate) : 0.18; // Use configured tax rate or fallback to 18%
      
      // Calculate system metrics for the closing date
      const metrics = await storage.getDailyMetrics(closureData.closingDate);
      
      // Extract ONLY cash payments from payment breakdown for accurate cash drawer calculation
      const cashPayment = metrics.paymentBreakdown.find(payment => 
        payment.method.toLowerCase() === 'cash' || payment.method.toLowerCase() === 'efectivo'
      );
      const cashPaymentsTotal = cashPayment ? cashPayment.total : 0;
      
      // Calculate expected cash in drawer (opening cash + cash payments received)
      const openingCashAmount = parseFloat(closureData.openingCash?.toString() ?? "0");
      const systemCash = openingCashAmount + cashPaymentsTotal;
      
      // Calculate variance if counted cash was provided (counted vs expected cash)
      const variance = closureData.countedCash !== undefined 
        ? closureData.countedCash - systemCash 
        : null;

      // Create closure with snapshot data
      const closure = await storage.createCashClosure({
        closingDate: new Date(closureData.closingDate),
        employeeId: req.employee.id,
        openingCash: closureData.openingCash?.toString() ?? "0",
        countedCash: closureData.countedCash?.toString() ?? null,
        systemCash: systemCash.toString(),
        variance: variance?.toString() ?? null,
        notes: closureData.notes ?? null,
        snapshotSubtotal: (metrics.totalSales / (1 + taxRate)).toString(),
        snapshotTax: (metrics.totalSales - (metrics.totalSales / (1 + taxRate))).toString(),
        snapshotTotal: metrics.totalSales.toString(),
        snapshotTotalInvoices: metrics.totalInvoices,
        snapshotDeliveredInvoices: metrics.deliveredInvoices,
        snapshotPendingInvoices: metrics.pendingInvoices,
        snapshotTotalItems: metrics.totalItems
      });

      // Create payment breakdown records
      for (const payment of metrics.paymentBreakdown) {
        await storage.createCashClosurePayment({
          cashClosureId: closure.id,
          methodCode: payment.method,
          methodName: payment.method, // Would ideally map this to proper name
          quantity: payment.count,
          total: payment.total.toString()
        });
      }

      // Get complete closure with payments
      const payments = await storage.getCashClosurePayments(closure.id);
      
      res.status(201).json({ ...closure, payments });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/cash-closures/:id", requireAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Calculate variance if countedCash is being updated
      if (updates.countedCash !== undefined && updates.systemCash) {
        updates.variance = (parseFloat(updates.countedCash) - parseFloat(updates.systemCash)).toString();
      }
      
      const closure = await storage.updateCashClosure(id, updates);
      
      if (!closure) {
        return res.status(404).json({ message: "Cash closure not found" });
      }
      
      res.json(closure);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Cash Closures History Route (with employee names)
  app.get("/api/cash-closures/history", requireAuthentication, async (req, res) => {
    try {
      const queryData = req.query;
      const startDate = queryData.startDate as string;
      const endDate = queryData.endDate as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      // Get closures within date range
      const closures = await storage.getCashClosures(startDate, endDate);
      
      // Enhance with employee names
      const closuresWithEmployeeNames = await Promise.all(
        closures.map(async (closure) => {
          let employeeName = 'N/A';
          if (closure.employeeId) {
            try {
              const employee = await storage.getEmployee(closure.employeeId);
              employeeName = employee?.name || 'N/A';
            } catch (error) {
              console.error(`Error fetching employee ${closure.employeeId}:`, error);
            }
          }
          return {
            ...closure,
            employeeName
          };
        })
      );
      
      res.json(closuresWithEmployeeNames);
    } catch (error) {
      console.error("Cash closures history error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Metrics Routes
  app.get("/api/metrics/daily/:date", requireAuthentication, async (req, res) => {
    try {
      const { date } = req.params;
      const metrics = await storage.getDailyMetrics(date);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/metrics/monthly/:month", requireAuthentication, async (req, res) => {
    try {
      const { month } = req.params; // Format: YYYY-MM
      const metrics = await storage.getMonthlyMetrics(month);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/metrics/range", requireAuthentication, async (req, res) => {
    try {
      const queryData = metricsQuerySchema.parse(req.query);
      
      if (queryData.from && queryData.to) {
        const metrics = await storage.getDateRangeMetrics(queryData.from, queryData.to);
        res.json(metrics);
      } else if (queryData.month) {
        const metrics = await storage.getMonthlyMetrics(queryData.month);
        res.json(metrics);
      } else if (queryData.date) {
        const metrics = await storage.getDailyMetrics(queryData.date);
        res.json(metrics);
      } else {
        res.status(400).json({ message: "Invalid query parameters" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Airtable Configuration Routes
  app.get("/api/airtable/config", requireAuthentication, async (req, res) => {
    try {
      const config = await storage.getAirtableConfig();
      if (!config) {
        return res.json({ enabled: false });
      }
      
      // Don't expose the API token in responses
      const { apiToken, ...safeConfig } = config;
      res.json({ ...safeConfig, hasApiToken: !!apiToken });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/airtable/config", requireAuthentication, async (req, res) => {
    try {
      const configData = insertAirtableConfigSchema.parse(req.body);
      const config = await storage.updateAirtableConfig(configData);
      
      // Don't expose the API token in responses
      const { apiToken, ...safeConfig } = config;
      res.json({ ...safeConfig, hasApiToken: !!apiToken });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Airtable Sync Queue Routes
  app.get("/api/airtable/sync-queue", requireAuthentication, async (req, res) => {
    try {
      const { status, entityType } = req.query;
      const items = await storage.getAirtableSyncQueueItems(
        status as string | undefined,
        entityType as string | undefined
      );
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/airtable/sync-queue", requireAuthentication, async (req, res) => {
    try {
      const queueData = insertAirtableSyncQueueSchema.parse(req.body);
      const item = await storage.createAirtableSyncQueueItem(queueData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/airtable/sync-queue/:id", requireAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const item = await storage.updateAirtableSyncQueueItem(id, updates);
      
      if (!item) {
        return res.status(404).json({ message: "Sync queue item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/airtable/sync-queue/:id", requireAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAirtableSyncQueueItem(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==================== DELIVERY TRACKING ROUTES ====================

  // Get order timestamps for a specific invoice
  app.get("/api/invoices/:id/timestamps", requireAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      const timestamps = await storage.getOrderTimestamps(id);
      res.json(timestamps);
    } catch (error) {
      console.error('Error fetching order timestamps:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create a new order timestamp
  app.post("/api/invoices/:id/timestamps", requireAuthentication, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const timestampData = insertOrderTimestampSchema.parse({
        ...req.body,
        invoiceId: id,
        employeeId: req.employee?.id,
      });

      const timestamp = await storage.createOrderTimestamp(timestampData);
      res.status(201).json(timestamp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error('Error creating order timestamp:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get delivery metrics for a specific invoice
  app.get("/api/invoices/:id/delivery-metrics", requireAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      const metrics = await storage.getDeliveryMetrics(id);
      if (!metrics) {
        return res.status(404).json({ message: "Delivery metrics not found" });
      }
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching delivery metrics:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create delivery metrics for an invoice
  app.post("/api/invoices/:id/delivery-metrics", requireAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      const metricsData = insertDeliveryMetricsSchema.parse({
        ...req.body,
        invoiceId: id,
      });

      const metrics = await storage.createDeliveryMetrics(metricsData);
      res.status(201).json(metrics);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error('Error creating delivery metrics:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update delivery metrics for an invoice
  app.put("/api/invoices/:id/delivery-metrics", requireAuthentication, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const metrics = await storage.updateDeliveryMetrics(id, updates);
      if (!metrics) {
        return res.status(404).json({ message: "Delivery metrics not found" });
      }
      res.json(metrics);
    } catch (error) {
      console.error('Error updating delivery metrics:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get delivery analytics with optional date filtering
  app.get("/api/delivery-analytics", requireAuthentication, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;

      const analytics = await storage.getDeliveryAnalytics(
        dateFrom as string,
        dateTo as string
      );

      res.json(analytics);
    } catch (error) {
      console.error('Error fetching delivery analytics:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
