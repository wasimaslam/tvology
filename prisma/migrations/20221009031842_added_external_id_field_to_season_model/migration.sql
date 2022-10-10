/*
  Warnings:

  - Added the required column `externalID` to the `Season` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `season` ADD COLUMN `externalID` INTEGER NOT NULL;
