import type { User } from "lucia";
import { prisma } from "../prisma";
import { getCommentsWithChildren } from "./Comment";
import type { Post, PostVote } from "@prisma/client";
import type { CommentWithComments } from "./Comment";

export interface PostWithComments extends Post {
  user: User;
  comments: CommentWithComments[];
  postVotes: PostVote[];
  currentUserVote: PostVote | null;
}
export async function listPosts(user?: User): Promise<PostWithComments[]> {
  const posts = await prisma.post.findMany({
    include: { user: true, postVotes: true },
    orderBy: { createdAt: "desc" },
  });

  const postVotesOfCurrentUser = posts.flatMap((post) => {
    return post.postVotes.filter((postVote) => postVote.userId === user?.id);
  });

  for (const post of posts) {
    post.currentUserVote = postVotesOfCurrentUser.find(
      (postVote) => postVote.postId === post.id
    );
  }
  return posts;
}

export async function getPostWithComments(
  postId: number
): Promise<PostWithComments> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      postVotes: true,
      user: true,
    },
  });

  if (!post) return null;

  post.comments = await getCommentsWithChildren(post.maxThreadDepth, post.id);
  return post;
}

export async function upsertPostVote(
  vote: boolean,
  postId: number,
  user: User
) {
  const currentVote = await prisma.postVote.findFirst({
    where: {
      postId: postId,
      userId: user.id,
    },
  });

  const sign = vote ? 1 : -1;
  const incrementBy = sign * (currentVote ? 2 : 1);

  const [postVote, updatedPost]: [PostVote, Post] = await prisma.$transaction([
    prisma.postVote.upsert({
      where: {
        postVoteId: {
          postId: postId,
          userId: user.id,
        },
      },
      update: {
        vote,
      },
      create: {
        vote,
        userId: user.id,
        postId: postId,
      },
    }),
    // TODO: increment / decrement 2 if user already voted
    prisma.post.update({
      where: { id: postId },
      data: {
        voteCount: { increment: incrementBy },
      },
    }),
  ]);

  return updatedPost;
}

export async function createPost(
  title: string,
  content: string,
  user: User
): Promise<Post> {
  return prisma.post.create({
    data: {
      title,
      content,
      user: { connect: { id: user.id } },
    },
  });
}
