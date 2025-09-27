import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from './config';

neonConfig.webSocketConstructor = ws;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 5, // Limit concurrent connections
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 2000, // 2 seconds connection timeout
  maxUses: 7500, // Close connection after 7500 queries
});
export const db = drizzle({ client: pool, schema });
