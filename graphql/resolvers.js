const bcypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

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
  }
}