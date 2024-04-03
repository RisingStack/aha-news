/*
  Warnings:

  - The primary key for the `PostVote` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `PostVote` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PostVote" DROP CONSTRAINT "PostVote_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "PostVote_pkey" PRIMARY KEY ("postId", "userId");
