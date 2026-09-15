CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`branch` text NOT NULL,
	`service` text NOT NULL,
	`preferred_date` text NOT NULL,
	`preferred_time` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`scheduled_date` text,
	`scheduled_time` text,
	`amount` integer,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_token_hash_unique` ON `bookings` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_bookings_created` ON `bookings` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_slot` ON `bookings` (`branch`,`scheduled_date`,`scheduled_time`) WHERE "bookings"."status" = 'confirmed';--> statement-breakpoint
CREATE TABLE `request_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`payment_key` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_orders_booking` ON `orders` (`booking_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_active` ON `orders` (`booking_id`) WHERE "orders"."status" IN ('ready','processing','paid','refunding');