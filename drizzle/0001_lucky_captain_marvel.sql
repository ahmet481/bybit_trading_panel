CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiKey` text NOT NULL,
	`apiSecret` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`side` enum('long','short') NOT NULL,
	`entryPrice` varchar(20) NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`stopLoss` varchar(20),
	`takeProfit` varchar(20),
	`status` enum('open','closed','pending') NOT NULL DEFAULT 'open',
	`unrealizedPnL` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signal_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`signalId` int NOT NULL,
	`tradeId` int,
	`outcome` enum('win','loss','pending') NOT NULL DEFAULT 'pending',
	`profitLoss` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signal_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`signalType` enum('buy','sell') NOT NULL,
	`confidence` int NOT NULL,
	`rsi` varchar(10),
	`macd` varchar(10),
	`pattern` varchar(50),
	`price` varchar(20) NOT NULL,
	`newsInfluence` int DEFAULT 0,
	`isExecuted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`positionId` int,
	`symbol` varchar(20) NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`entryPrice` varchar(20) NOT NULL,
	`exitPrice` varchar(20) NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`pnl` varchar(20) NOT NULL,
	`pnlPercent` varchar(10) NOT NULL,
	`duration` int NOT NULL,
	`signalId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp NOT NULL,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `positions` ADD CONSTRAINT `positions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signal_history` ADD CONSTRAINT `signal_history_signalId_signals_id_fk` FOREIGN KEY (`signalId`) REFERENCES `signals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signal_history` ADD CONSTRAINT `signal_history_tradeId_trades_id_fk` FOREIGN KEY (`tradeId`) REFERENCES `trades`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signals` ADD CONSTRAINT `signals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trades` ADD CONSTRAINT `trades_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trades` ADD CONSTRAINT `trades_positionId_positions_id_fk` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trades` ADD CONSTRAINT `trades_signalId_signals_id_fk` FOREIGN KEY (`signalId`) REFERENCES `signals`(`id`) ON DELETE no action ON UPDATE no action;