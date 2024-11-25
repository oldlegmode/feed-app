const { validationResult } = require('express-validator');
const bcypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    next(error);
  }

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  try {
    const hash = await bcypt.hash(password, 12);
    const user = new User({
      email,
      password: hash,
      name,
    })
    
    await user.save();

    res.status(201).json({ message: 'User created!', userId: user._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
}

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  
  try {
    let userData = await User.findOne({email});
    if (!userData) {
      const error = new Error('A user with this email could not be found.');
      error.statusCode = 401;
      throw error;
    }
    
    const isEqual = await bcypt.compare(password, userData.password);
    
    if (!isEqual) {
      const error = new Error('Wrong password');
      error.statusCode = 401;
      throw error;
    }
    const token = jwt.sign({ 
        email: userData.email,
        userId: userData._id.toString() 
      }, 
      'somesupersecretsecret', 
      { expiresIn: '1h' }
    );
    res.status(200).json({ token, userId: userData._id.toString() });
  } catch(err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
}