const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { graphqlHTTP } = require('express-graphql')
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { clearImage } = require('./utils/file');
const config = require('./config');
const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/user');
const statusRoutes = require('./routes/status');

const schemaGraphql = require('./graphql/schema');
const resolverGraphql = require('./graphql/resolvers');
const auth = require('./middleware/auth');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname)
  }
})

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg'
  ) {
    cb(null, true);
  }
  cb(null, false);
}

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.json());
app.use(multer({storage: fileStorage, fileFilter}).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error('Not authenticated!');
    error.code = 401;
    throw error;
  }
  if (!req.file) {
    return res.status(200).json({
      message: 'No file provided!'
    });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: 'File stored.', filePath: req.file.path });
})

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);
app.use('', statusRoutes);

app.use('/graphql',
  graphqlHTTP({
    schema: schemaGraphql,
    rootValue: resolverGraphql,
    graphiql: true,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || 'An error occured.';
      const status = err.originalError.code || 500;

      return { message, status, data };
    }
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode;
  const message = error.message;
  const data = error.data;
  res.status(status || 500).json({ message, data });
})

mongoose.connect(config.CONNECTION_URL, { 
    useNewUrlParser: true,
    dbName: config.DB_NAME
  })
  .then(() => {
    const server = app.listen(8080);
    const io = require('./socket').init(server);
    
    io.on('connection', socket => {
      console.log('Client connected');
    })
  })
  .catch(console.log);
