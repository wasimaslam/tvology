-- CreateTable
CREATE TABLE `Episode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `airDate` DATETIME(3) NULL,
    `image` VARCHAR(255) NULL,
    `imageLowRes` VARCHAR(255) NULL,
    `number` INTEGER NOT NULL,
    `seasonNumber` INTEGER NOT NULL,
    `rating` JSON NULL,
    `runtime` INTEGER NULL,
    `summary` TEXT NULL,
    `type` TEXT NULL,
    `externalID` INTEGER NOT NULL,
    `seasonID` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Episode` ADD CONSTRAINT `Episode_seasonID_fkey` FOREIGN KEY (`seasonID`) REFERENCES `Season`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
