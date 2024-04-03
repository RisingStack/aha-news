import { prisma } from "../prisma";
import { getPostWithComments } from "../contexts/Post";
import type { Comment, CommentVote } from "@prisma/client";
import type { User } from "lucia";

export interface CommentWithComments extends Comment {
  children: CommentWithComments[];
  commentVotes: CommentVote[];
  user: User;
}

export interface CommentWithComments extends Comment {
  children: CommentWithComments[];
  commentVotes: CommentVote[];
  user: User;
}
export async function createComment(
  user: User,
  content: string,
  parentId: number,
  postId: number
) {
  const [comment, parentComment] = await prisma.$transaction(
    [
      prisma.comment.create({
        data: {
          content,
          userId: user.id,
          parentId: parentId === null ? null : parentId,
          postId,
        },
      }),
      parentId &&
        prisma.comment.update({
          where: { id: parentId },
          data: { childrenCount: { increment: 1 } },
        }),
    ].filter(Boolean)
  );

  const post = await getPostWithComments(postId);

  const depth = await getDepth(parentComment);

  const maxThreadDepth = Math.max(post.maxThreadDepth, depth + 1);

  await prisma.post.update({
    where: { id: postId },
    data: {
      commentCount: { increment: 1 },
      maxThreadDepth,
    },
  });

  return [comment, post];
}

async function getDepth(comment?: CommentWithComments) {
  let depth = 0;
  while (comment?.parentId) {
    depth++;
    comment = await prisma.comment.findUnique({
      where: { id: comment.parentId },
    });
  }
  return depth;
}

const orderBy = [{ voteCount: "desc" }, { createdAt: "asc" }];

export async function getCommentsWithChildren(
  maxThreadDepth: number,
  postId: number
): Promise<any[]> {
  if (!postId) return null;

  let comments;
  try {
    return prisma.comment.findMany({
      where: { postId, parentId: null },
      orderBy,
      include: {
        user: true, // Assuming you want to include user details for each comment
        commentVotes: true,
        ...createIncludeTree(maxThreadDepth),
      },
    });
  } catch (err) {
    console.error("Failed to fetch comments:", err);
    return [];
  }
}

function createIncludeTree(threadDepth: number) {
  if (threadDepth === 0) return {};
  if (threadDepth === 1)
    return {
      children: {
        include: {
          user: true,
          commentVotes: true,
          children: true,
        },
      },
    };

  const query = {
    children: {
      where: { parentId: { not: null } },
      orderBy,
      include: {
        user: true,
        commentVotes: true,
        ...createIncludeTree(threadDepth - 1),
      },
    },
  };

  return query;
}

export async function upsertCommentVote(
  vote: boolean,
  commentId: number,
  user: User
) {
  const currentVote = await prisma.commentVote.findFirst({
    where: {
      commentId,
      userId: user.id,
    },
  });

  const sign = vote ? 1 : -1;
  const incrementBy = sign * (currentVote ? 2 : 1);

  const [commentVote, updatedComment] = await prisma.$transaction([
    prisma.commentVote.upsert({
      where: {
        commentVoteId: {
          commentId,
          userId: user.id,
        },
      },
      update: {
        vote,
      },
      create: {
        vote,
        userId: user.id,
        commentId,
      },
    }),
    prisma.comment.update({
      where: { id: commentId },
      data: {
        voteCount: { increment: incrementBy },
      },
    }),
  ]);

  return updatedComment;
}
