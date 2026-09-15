import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const bookings = sqliteTable('bookings', {
 id:text('id').primaryKey(), tokenHash:text('token_hash').notNull().unique(),
 name:text('name').notNull(), phone:text('phone').notNull(), branch:text('branch').notNull(), service:text('service').notNull(),
 preferredDate:text('preferred_date').notNull(), preferredTime:text('preferred_time').notNull(),
 status:text('status').notNull().default('requested'), scheduledDate:text('scheduled_date'), scheduledTime:text('scheduled_time'),
 amount:integer('amount'), paymentStatus:text('payment_status').notNull().default('unpaid'),
 consentVersion:text('consent_version').notNull(), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
}, t=>[index('idx_bookings_created').on(t.createdAt),uniqueIndex('idx_bookings_slot').on(t.branch,t.scheduledDate,t.scheduledTime).where(sql`${t.status} = 'confirmed'`)]);
export const orders=sqliteTable('orders',{
 id:text('id').primaryKey(),bookingId:text('booking_id').notNull().references(()=>bookings.id),amount:integer('amount').notNull(),
 status:text('status').notNull().default('ready'),paymentKey:text('payment_key'),createdAt:text('created_at').notNull(),
},t=>[index('idx_orders_booking').on(t.bookingId),uniqueIndex('idx_orders_active').on(t.bookingId).where(sql`${t.status} IN ('ready','processing','paid','refunding')`)]);
export const limits=sqliteTable('request_limits',{id:text('id').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
export const settings=sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
