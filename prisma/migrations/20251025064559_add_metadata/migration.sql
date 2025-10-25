-- CreateTable
CREATE TABLE `Metadata` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `last_refreshed_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
