CREATE TABLE `municipal_authorized_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`municipalityId` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('viewer','editor','admin') NOT NULL DEFAULT 'viewer',
	`status` enum('pending','active') NOT NULL DEFAULT 'pending',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`activatedAt` timestamp,
	CONSTRAINT `municipal_authorized_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorized_user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `municipalities` ADD `integrationTokenHash` varchar(64);--> statement-breakpoint
ALTER TABLE `municipalities` ADD `integrationTokenHint` varchar(12);--> statement-breakpoint
ALTER TABLE `municipalities` ADD `integrationTokenCreatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `municipalities` ADD CONSTRAINT `municipality_integration_token_hash_unique` UNIQUE(`integrationTokenHash`);--> statement-breakpoint
CREATE INDEX `authorized_user_municipality_idx` ON `municipal_authorized_users` (`municipalityId`);