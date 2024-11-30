const express = require('express');
const { body } = require('express-validator');

const feedController = require('../controllers/feed');
const isAuth = require('../middleware/auth');

const router = express.Router();
// GET /feed/routes
router.get('/posts', isAuth, feedController.getPosts);
// POST /feed/routes
router.post('/post', isAuth, [
    body('title')
      .trim()
      .isLength({min: 7}),
    body('content')
      .trim()
      .isLength({min: 5}),
  ], 
  feedController.postPost
);

router.get('/post/:postId', isAuth, feedController.getPost);

router.put('/post/:postId', isAuth, [
  body('title')
    .trim()
    .isLength({min: 7}),
  body('content')
    .trim()
    .isLength({min: 5}),
  ],
  feedController.updatedPost
);

router.delete('/post/:postId', isAuth, feedController.deletePost)

module.exports = router;