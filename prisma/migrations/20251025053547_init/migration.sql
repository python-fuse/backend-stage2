-- CreateTable
CREATE TABLE `Country` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `capital` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `population` BIGINT NOT NULL,
    `currency_code` VARCHAR(191) NULL,
    `exchange_rate` DOUBLE NULL,
    `flag_url` VARCHAR(191) NULL,
    `estimated_gdp` DOUBLE NULL,
    `last_refresh_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Country_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
