const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated');
    error.statusCode = 401;
    throw error;
  }

  const token = req.get('Authorization')?.split(' ')?.[1];
  let decodedToken;

  try {
    decodedToken = jwt.verify(token, 'somesupersecretsecret')
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  if (!decodedToken) {
    const err = new Error('Not authenticated.');
    err.statusCode = 401;
    throw err;
  }

  req.userId = decodedToken.userId;
  next();
}