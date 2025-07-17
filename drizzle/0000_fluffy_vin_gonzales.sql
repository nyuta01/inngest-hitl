CREATE TABLE `a2a_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`a2a_task_id` text NOT NULL,
	`a2a_artifact_id` text NOT NULL,
	`name` text,
	`description` text,
	`parts` text NOT NULL,
	`extensions` text,
	`metadata` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`a2a_task_id`) REFERENCES `a2a_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `a2a_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`a2a_task_id` text NOT NULL,
	`kind` text DEFAULT 'message' NOT NULL,
	`a2a_message_id` text NOT NULL,
	`role` text NOT NULL,
	`parts` text NOT NULL,
	`context_id` text,
	`extensions` text,
	`metadata` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`a2a_task_id`) REFERENCES `a2a_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `a2a_task_messages` (
	`a2a_task_id` text NOT NULL,
	`a2a_message_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`a2a_task_id`, `a2a_message_id`),
	FOREIGN KEY (`a2a_task_id`) REFERENCES `a2a_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`a2a_message_id`) REFERENCES `a2a_messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `a2a_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'task' NOT NULL,
	`status` text NOT NULL,
	`status_state` text NOT NULL,
	`status_message` text,
	`status_reason` text,
	`context_id` text,
	`extensions` text,
	`metadata` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
