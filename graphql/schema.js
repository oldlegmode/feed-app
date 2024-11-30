const { buildSchema } = require('graphql');

module.exports = buildSchema(`
  type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    password: String!
    posts: [Post!]!
  }

  type AuthData {
    token: String!
    userId: String!
  }

  type PostsData {
    posts: [Post!]
    totalPosts: Int!
  }
  
  input UserInputData {
    email: String!
    name: String!
    password: String!
  }

  input PostInputData {
    title: String!
    imageUrl: String!
    content: String!
  }

  type RootMutation {
    createUser(userInput: UserInputData): User!
    createPost(postInput: PostInputData): Post!
    updatePost(id: String! postInput: PostInputData): Post!
    deletePost(id: String!): Boolean
    changeStatus(status: String!): Boolean
  }

  type RootQuery {
    login(email: String!, password: String!): AuthData! 
    posts(page: Int): PostsData!
    post(postId: String!): Post
    status: String!
  }

  schema {
    query: RootQuery
    mutation: RootMutation 
  }
`);