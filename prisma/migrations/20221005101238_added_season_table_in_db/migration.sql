-- CreateTable
CREATE TABLE `Season` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `summary` TEXT NULL,
    `noOfEpisodes` INTEGER NOT NULL,
    `premierDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `image` VARCHAR(255) NOT NULL,
    `imageLowRes` VARCHAR(255) NOT NULL,
    `showID` INTEGER NOT NULL,
    `tVShowId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Season` ADD CONSTRAINT `Season_showID_fkey` FOREIGN KEY (`showID`) REFERENCES `TVShow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
