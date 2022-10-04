/*
  Warnings:

  - You are about to drop the column `external_id` on the `tvshow` table. All the data in the column will be lost.
  - Added the required column `averageRuntime` to the `TVShow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `externalID` to the `TVShow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `externalIDs` to the `TVShow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image` to the `TVShow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageLowRes` to the `TVShow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tvshow` DROP COLUMN `external_id`,
    ADD COLUMN `averageRating` DOUBLE NULL,
    ADD COLUMN `averageRuntime` INTEGER NOT NULL,
    ADD COLUMN `externalID` INTEGER NOT NULL,
    ADD COLUMN `externalIDs` JSON NOT NULL,
    ADD COLUMN `image` VARCHAR(191) NOT NULL,
    ADD COLUMN `imageLowRes` VARCHAR(191) NOT NULL;
