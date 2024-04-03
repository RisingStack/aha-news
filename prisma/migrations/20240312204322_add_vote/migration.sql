/*
  Warnings:

  - Added the required column `vote` to the `CommentVote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vote` to the `PostVote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommentVote" ADD COLUMN     "vote" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "PostVote" ADD COLUMN     "vote" BOOLEAN NOT NULL;
