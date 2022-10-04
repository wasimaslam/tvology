/*
  Warnings:

  - Added the required column `external_id` to the `TVShow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tvshow` ADD COLUMN `external_id` INTEGER NOT NULL;
