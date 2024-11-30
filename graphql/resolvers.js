const bcypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const { clearImage } = require('../utils/file');
const User = require('../models/user');
const Post = require('../models/post');

module.exports = {
  createUser: async ({ userInput }, req) => {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: 'E-Mail is invalid.' })
    }
    if (
      validator.isEmpty(userInput.password) || 
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push({ message: 'Password too short!' })
    }
    if (errors.length > 0) {
      const error = new Error('Invalida input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const { email, password, name } = userInput;
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      const error = new Error('User already exists!');
      throw error;
    }
    const hashedPw = await bcypt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hashedPw
    })

    const createdUser = await user.save();

    return { ...createdUser._doc, id: createdUser._id.toString() };
  },
  login: async ({email, password}, req) => {
    const userData = await User.findOne({ email });
    if (!userData) {
      const error = new Error('User does not exists!');
      throw error;
    }

    const isEqualPw = await bcypt.compare(password, userData.password);

    if (!isEqualPw) {
      const error = new Error('Wrong password!');
      throw error;
    }

    const token = jwt.sign({ 
        email: userData.email,
        userId: userData._id.toString() 
      }, 
      'somesupersecretsecret', 
      { expiresIn: '1h' }
    );

    return { token, userId: userData._id.toString() };
  },
  createPost: async ({ postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    const errors = [];
    if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5})) {
      errors.push({ message: 'Title is invalid!'});
    }
    if (validator.isEmpty(postInput.imageUrl)) {
      errors.push({ message: 'Image is invalid!'});
    }
    if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5})) {
      errors.push({ message: 'Content is invalid!'});
    }

    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('Invalid user!');
      error.data = errors;
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: postInput.title,
      imageUrl: postInput.imageUrl,
      content: postInput.content,
      creator: user
    })

    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();
    
    return { 
      ...createdPost._doc, 
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    }
  },
  posts: async (page = 1, req) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator');

    return {
      posts: posts.map(item => {
        return {
          ...item._doc, 
          _id: item._id.toString(),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString()
        }
      }), 
      totalPosts 
    };
  },
  post: async ({postId}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    if (!postId) {
      const error = new Error('Bad request!');
      error.code = 400;
      throw error;
    }
    console.log('postId: ', postId)
    const loadedPost = await Post.findById(postId).populate('creator');
    if (!loadedPost) {
      const error = new Error('Post not found!');
      error.code = 404;
      throw error;
    }
    return {
      ...loadedPost._doc,
      _id: loadedPost._id.toString(),
      createdAt: loadedPost.createdAt.toISOString(),
      updatedAt: loadedPost.updatedAt.toISOString()
    }
  },
  updatePost: async ({id, postInput}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('No post found!');
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.code = 403;
      throw error;
    }
    const errors = [];
    if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5})) {
      errors.push({ message: 'Title is invalid!'});
    }
    if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5})) {
      errors.push({ message: 'Content is invalid!'});
    }

    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    
    post.title = postInput.title;
    post.content = postInput.content;
    if (postInput.imageUrl !== 'undefined') {
      post.imageUrl = postInput.imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString()
    }
  },
  deletePost: async ({id}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    
    const post = await Post.findById(id);

    if (!post) {
      const error = new Error('No post found!');
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.code = 403;
      throw error;
    }
    clearImage(post.imageUrl)
    const user = await User.findById(req.userId);
    await Post.findByIdAndRemove(id);
    
    user.posts.pull(id);
    await user.save();

    return true;
  },
  status: async (_, req) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    
    const user = await User.findById(req.userId);
    return user.status;
  },
  changeStatus: async ({status}, req) => {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    
    const user = await User.findById(req.userId);
    user.status = status;
    await user.save();

    return true;
  }
}