import { generateId } from "lucia";
import { Argon2id } from "oslo/password";
import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function run() {
  const createdUsers = await createUsers();

  console.log("Creating posts...");
  for (let i = 0; i < 100; i++) {
    const user = await getRandomUser(createdUsers);
    const post = await createPost(user);
    if (post) {
      await createPostVotes(post, createdUsers);
      await createComments(post, i, createdUsers);
    }
  }

  const comments = await prisma.comment.findMany();
  for (const comment of comments) {
    await createCommentVotes(comment, createdUsers);
  }
}

async function createUsers() {
  console.log("Creating users...");
  const createdUsers = [];

  for (let i = 0; i < 20; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const password = "almaalma"; // Consider using a secure way to generate passwords
    const passwordHash = await new Argon2id().hash(password);
    const userId = generateId(15);

    try {
      const user = await prisma.user.create({
        data: {
          id: userId,
          name,
          email,
          passwordHash,
        },
      });
      createdUsers.push(user);
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  }

  return createdUsers;
}

function getRandomUser(createdUsers) {
  const randomIndex = Math.floor(Math.random() * createdUsers.length);
  return createdUsers[randomIndex];
}

async function createPost(user) {
  const title = faker.lorem.words(5);
  const content = faker.lorem.paragraphs(3);

  try {
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        title,
        content,
      },
    });

    return post;
  } catch (error) {
    console.error("Failed to create post:", error);
    return null;
  }
}

async function createPostVotes(post, createdUsers) {
  const randomVoteCount = Math.floor(Math.random() * createdUsers.length);
  for (let i = 0; i <= randomVoteCount; i++) {
    const votingUser = await getRandomUser(createdUsers);
    const vote = Math.random() > 0.3;

    try {
      const existingVote = await prisma.postVote.findFirst({
        where: {
          postId: post.id,
          userId: votingUser.id,
        },
      });

      if (!existingVote && votingUser.id !== post.userId) {
        await prisma.postVote.create({
          data: {
            postId: post.id,
            userId: votingUser.id,
            vote,
          },
        });

        await prisma.post.update({
          where: {
            id: post.id,
          },
          data: {
            voteCount: {
              [vote ? "increment" : "decrement"]: 1,
            },
          },
        });
      }
    } catch (error) {
      console.error("Failed to create post vote:", error);
    }
  }
}

function createCommentTree(treeState, maxThreadDepth, currentLevel) {
  if (currentLevel === maxThreadDepth || treeState.maxComments <= 0) return;

  const childrenCount = Math.ceil(Math.random() * treeState.maxComments);
  const children = [];
  treeState.maxComments -= childrenCount;
  treeState.depth = Math.max(treeState.depth, currentLevel);

  for (let i = 0; i < childrenCount; i++) {
    children.push(
      createCommentTree(treeState, maxThreadDepth, currentLevel + 1)
    );
  }

  return children;
}

function createCommentInsertData(commentTree, createdUsers, postId) {
  return {
    content: faker.lorem.paragraphs(1),
    userId: getRandomUser(createdUsers).id,
    postId,
    children: {
      create: commentTree?.map((branch) =>
        createCommentInsertData(branch, createdUsers, postId)
      ),
    },
  };
}

async function createComments(post, postNumber, createdUsers) {
  console.log(`Creating comments for post ${postNumber}...`);

  const maxComments = Math.floor(Math.random() * 100);
  const maxThreadDepth = Math.floor(Math.random() * maxComments);

  const treeState = {
    maxComments,
    depth: 0,
  };
  const commentTree = createCommentTree(treeState, maxThreadDepth, 0);

  const commentInsertData =
    commentTree?.map((branch) => ({
      data: createCommentInsertData(branch, createdUsers, post.id),
    })) ?? [];

  for (const comment of commentInsertData) {
    try {
      await prisma.comment.create(comment);
    } catch (error) {
      console.error("Failed to create comment:", error);
    }
  }

  const commentCount = await prisma.comment.count({
    where: { postId: post.id },
  });

  try {
    await prisma.post.update({
      where: {
        id: post.id,
      },
      data: {
        commentCount,
        maxThreadDepth: treeState.depth,
      },
    });
  } catch (error) {
    console.error("Failed to update post:", error);
  }
}

async function createCommentVotes(comment, createdUsers) {
  if (Math.random() > 0.5) return;

  console.log("Creating comment votes for comment " + comment.id + "...");
  const randomVoteCount = Math.floor(Math.random() * createdUsers.length);
  for (let i = 0; i <= randomVoteCount; i++) {
    const votingUser = await getRandomUser(createdUsers);
    const vote = Math.random() > 0.7;

    try {
      const existingVote = await prisma.commentVote.findFirst({
        where: {
          commentId: comment.id,
          userId: votingUser.id,
        },
      });

      if (
        !existingVote &&
        votingUser.id !== comment.userId &&
        Math.random() > 0.3
      ) {
        await prisma.commentVote.create({
          data: {
            commentId: comment.id,
            userId: votingUser.id,
            vote,
          },
        });

        await prisma.comment.update({
          where: {
            id: comment.id,
          },
          data: {
            voteCount: {
              [vote ? "increment" : "decrement"]: 1,
            },
          },
        });
      }
    } catch (error) {
      console.error("Failed to create comment vote:", error);
      process.exit(1);
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
