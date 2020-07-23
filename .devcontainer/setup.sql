-- Initial query for log database
REVOKE all privileges ON *.* FROM 'admin'@'%';
GRANT SELECT,INSERT,UPDATE,DELETE ON `bot_reports`.* TO 'admin'@'%';
FLUSH PRIVILEGES;
-- Create required schemas and tabs on first start
CREATE SCHEMA `bot_reports` ;
CREATE TABLE `bot_reports`.`logs` (
	`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
	`date` datetime NOT NULL,
	`priority` TINYINT UNSIGNED NOT NULL,
	`category` VARCHAR(64) NOT NULL,
	`description` VARCHAR(128) NOT NULL,
	`system_involved` VARCHAR(32),
	`identity_type` VARCHAR(32),
	`identity_identifier` VARCHAR(64),
	`origin_module` VARCHAR(255),
	`origin_code` VARCHAR(32),
	`details` TEXT,
PRIMARY KEY (`id`));
