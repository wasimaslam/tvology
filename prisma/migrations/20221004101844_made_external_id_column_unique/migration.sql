/*
  Warnings:

  - A unique constraint covering the columns `[externalID]` on the table `TVShow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `TVShow_externalID_key` ON `TVShow`(`externalID`);
