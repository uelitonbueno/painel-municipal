CREATE TABLE `indicator_measurements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`indicatorId` int NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`value` decimal(16,2) NOT NULL,
	`referenceDate` date NOT NULL,
	`source` varchar(160) NOT NULL,
	`quality` enum('validated','pending','unknown') NOT NULL DEFAULT 'unknown',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `indicator_measurements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `municipal_indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`area` varchar(120) NOT NULL,
	`unit` varchar(40) NOT NULL,
	`description` text,
	`public` boolean NOT NULL DEFAULT true,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `municipal_indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingestion_batches` (
	`id` varchar(64) NOT NULL,
	`receiptId` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`payload` json NOT NULL,
	`schemaVersion` varchar(80),
	`checksum` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ingestion_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingestion_receipts` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`source` enum('betha','script','manual') NOT NULL,
	`resource` varchar(120) NOT NULL,
	`operation` enum('snapshot','incremental','manual') NOT NULL,
	`status` enum('accepted','processing','completed','error','duplicate') NOT NULL DEFAULT 'accepted',
	`acceptedRecords` int NOT NULL DEFAULT 0,
	`idempotencyKey` varchar(180) NOT NULL,
	`checksum` varchar(128),
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ingestion_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipt_tenant_idempotency_unique` UNIQUE(`tenantId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `municipal_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`category` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`accessInstructions` text NOT NULL,
	`digitalUrl` varchar(500),
	`phone` varchar(50),
	`public` boolean NOT NULL DEFAULT true,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `municipal_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `municipalities` (
	`id` varchar(64) NOT NULL,
	`name` varchar(180) NOT NULL,
	`state` varchar(2) NOT NULL,
	`population` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `municipalities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `municipality_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`municipalityId` varchar(64) NOT NULL,
	`role` enum('viewer','editor','admin') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `municipality_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_user_municipality_unique` UNIQUE(`userId`,`municipalityId`)
);
--> statement-breakpoint
CREATE TABLE `municipal_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`title` varchar(180) NOT NULL,
	`area` varchar(120) NOT NULL,
	`description` text,
	`status` enum('planejado','em andamento','concluído','cancelado') NOT NULL DEFAULT 'planejado',
	`progress` int NOT NULL DEFAULT 0,
	`startDate` date,
	`targetDate` date,
	`budget` decimal(15,2),
	`public` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `municipal_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transparency_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`type` enum('contract','bid','expense','revenue') NOT NULL,
	`title` varchar(220) NOT NULL,
	`referenceNumber` varchar(80),
	`category` varchar(120) NOT NULL,
	`supplier` varchar(180),
	`amount` decimal(15,2) NOT NULL,
	`eventDate` date NOT NULL,
	`status` varchar(80) NOT NULL,
	`description` text,
	`public` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transparency_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `measurements_indicator_date_idx` ON `indicator_measurements` (`indicatorId`,`referenceDate`);--> statement-breakpoint
CREATE INDEX `indicators_tenant_area_idx` ON `municipal_indicators` (`tenantId`,`area`);--> statement-breakpoint
CREATE INDEX `receipt_tenant_received_idx` ON `ingestion_receipts` (`tenantId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `services_tenant_category_idx` ON `municipal_services` (`tenantId`,`category`);--> statement-breakpoint
CREATE INDEX `membership_municipality_idx` ON `municipality_memberships` (`municipalityId`);--> statement-breakpoint
CREATE INDEX `projects_tenant_status_idx` ON `municipal_projects` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `transparency_tenant_type_date_idx` ON `transparency_records` (`tenantId`,`type`,`eventDate`);