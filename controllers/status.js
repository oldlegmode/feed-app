const User = require('../models/user');

exports.getStatus = async (req, res, next) => {
  try {
    const userData = await User.findById(req.userId);
    if (!userData) {
      const error = new Error('A user with this id could not be found.')
      error.statusCode = 401;
      throw error;
    }
    res.status(200).json({message: 'User status', status: userData.status});
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
}

exports.updateStatus = async (req, res, next) => {
  const newStatus = req.body.status;

  try {
    const userData = await User.findById(req.userId);
    if (!userData) {
      const error = new Error('A user with this id could not be found.')
      error.statusCode = 401;
      throw error;
    }
    userData.status = newStatus;
    
    await userData.save();

    res.status(200).json({message: 'Status update success'});
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
}