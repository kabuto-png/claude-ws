CREATE TABLE `agent_factory_plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source_path` text,
	`storage_type` text DEFAULT 'local' NOT NULL,
	`agent_set_path` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempt_files` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attempt_files_attempt` ON `attempt_files` (`attempt_id`);--> statement-breakpoint
CREATE TABLE `attempt_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_logs_attempt` ON `attempt_logs` (`attempt_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`prompt` text NOT NULL,
	`display_prompt` text,
	`status` text DEFAULT 'running' NOT NULL,
	`session_id` text,
	`branch` text,
	`diff_additions` integer DEFAULT 0 NOT NULL,
	`diff_deletions` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cache_creation_tokens` integer DEFAULT 0 NOT NULL,
	`cache_read_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost_usd` integer DEFAULT 0 NOT NULL,
	`num_turns` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_task` ON `attempts` (`task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `checkpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`attempt_id` text NOT NULL,
	`session_id` text NOT NULL,
	`git_commit_hash` text,
	`message_count` integer NOT NULL,
	`summary` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_checkpoints_task` ON `checkpoints` (`task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `plugin_dependencies` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`dependency_type` text NOT NULL,
	`spec` text NOT NULL,
	`plugin_dependency_id` text,
	`installed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `agent_factory_plugins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_dependency_id`) REFERENCES `agent_factory_plugins`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_plugin_deps` ON `plugin_dependencies` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `idx_plugin_depends_on` ON `plugin_dependencies` (`plugin_dependency_id`);--> statement-breakpoint
CREATE TABLE `plugin_dependency_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text,
	`source_path` text,
	`source_hash` text,
	`type` text NOT NULL,
	`library_deps` text,
	`plugin_deps` text,
	`install_script_npm` text,
	`install_script_pnpm` text,
	`install_script_yarn` text,
	`install_script_pip` text,
	`install_script_poetry` text,
	`install_script_cargo` text,
	`install_script_go` text,
	`dockerfile` text,
	`depth` integer DEFAULT 0 NOT NULL,
	`has_cycles` integer DEFAULT false NOT NULL,
	`resolved_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `agent_factory_plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cache_plugin` ON `plugin_dependency_cache` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `idx_cache_source` ON `plugin_dependency_cache` (`source_path`);--> statement-breakpoint
CREATE TABLE `project_plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_id`) REFERENCES `agent_factory_plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_project_plugins` ON `project_plugins` (`project_id`,`plugin_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_path_unique` ON `projects` (`path`);--> statement-breakpoint
CREATE TABLE `shells` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`attempt_id` text,
	`command` text NOT NULL,
	`cwd` text NOT NULL,
	`pid` integer,
	`status` text DEFAULT 'running' NOT NULL,
	`exit_code` integer,
	`exit_signal` text,
	`created_at` integer NOT NULL,
	`stopped_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_shells_project` ON `shells` (`project_id`,`status`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`position` integer NOT NULL,
	`chat_init` integer DEFAULT false NOT NULL,
	`rewind_session_id` text,
	`rewind_message_uuid` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_project` ON `tasks` (`project_id`,`status`,`position`);