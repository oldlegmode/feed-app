const express = require('express');
const { body } = require('express-validator');

const userController = require('../controllers/user');

const User = require('../models/user');

const router = express.Router();

router.put('/signup', [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email.')
    .custom((value, { req }) => {
      return User.findOne({email: value})
        .then(result => result ? Promise.reject('E-mail address already exists!') : Promise.resolve())
    })
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 5 }),
  body('password')
    .trim()
    .notEmpty()
], userController.signup)

router.post('/login', userController.login)

module.exports = router;