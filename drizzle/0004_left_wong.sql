CREATE TABLE `tax_inspections` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`externalId` varchar(140) NOT NULL,
	`taxpayerName` varchar(180),
	`taxpayerDocument` varchar(32),
	`companyReference` varchar(100),
	`cnae` varchar(20),
	`fiscalName` varchar(180),
	`fiscalYear` int NOT NULL,
	`referenceMonth` int,
	`status` enum('aberta','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`startedAt` date,
	`completedAt` date,
	`notifications` int NOT NULL DEFAULT 0,
	`infractionNotices` int NOT NULL DEFAULT 0,
	`assessedAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`collectedAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`fineAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_inspections_id` PRIMARY KEY(`id`),
	CONSTRAINT `inspection_tenant_external_unique` UNIQUE(`tenantId`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `tax_installment_plans` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`externalId` varchar(140) NOT NULL,
	`taxpayerName` varchar(180),
	`taxpayerDocument` varchar(32),
	`taxpayerType` enum('PF','PJ','NA') NOT NULL DEFAULT 'NA',
	`taxType` enum('IPTU','ISS','ITBI','TAXA','CONTRIBUICAO','MULTA','OUTROS'),
	`fiscalYear` int,
	`status` enum('ativo','quitado','cancelado','inadimplente') NOT NULL DEFAULT 'ativo',
	`agreementDate` date,
	`installmentsTotal` int NOT NULL DEFAULT 0,
	`installmentsPaid` int NOT NULL DEFAULT 0,
	`installmentsOverdue` int NOT NULL DEFAULT 0,
	`originalAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`negotiatedAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`recoveredAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`outstandingAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_installment_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `installment_tenant_external_unique` UNIQUE(`tenantId`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `tax_payers` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`externalId` varchar(140) NOT NULL,
	`name` varchar(180) NOT NULL,
	`document` varchar(32),
	`type` enum('PF','PJ','NA') NOT NULL DEFAULT 'NA',
	`status` enum('ativo','inativo','suspenso','baixado') NOT NULL DEFAULT 'ativo',
	`economicActivity` varchar(180),
	`cnae` varchar(20),
	`propertiesCount` int NOT NULL DEFAULT 0,
	`companiesCount` int NOT NULL DEFAULT 0,
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_payers_id` PRIMARY KEY(`id`),
	CONSTRAINT `taxpayer_tenant_external_unique` UNIQUE(`tenantId`,`externalId`)
);
--> statement-breakpoint
CREATE INDEX `inspection_tenant_status_idx` ON `tax_inspections` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `inspection_tenant_period_idx` ON `tax_inspections` (`tenantId`,`fiscalYear`,`referenceMonth`);--> statement-breakpoint
CREATE INDEX `installment_tenant_status_idx` ON `tax_installment_plans` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `installment_tenant_period_idx` ON `tax_installment_plans` (`tenantId`,`fiscalYear`);--> statement-breakpoint
CREATE INDEX `taxpayer_tenant_type_status_idx` ON `tax_payers` (`tenantId`,`type`,`status`);