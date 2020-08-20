const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const moment = require('moment')
const { Pool } = require('pg')
const session = require('express-session')
const flash = require('connect-flash');
const fileUpload = require('express-fileupload');

const pool = new Pool({
  user: 'fgmvegallqrdff',
  host: 'ec2-3-215-207-12.compute-1.amazonaws.com',
  database: 'd24a8tv4horung',
  password: '574be3936dd5551c5a0447b7845703570400b44b7ba568b407cd6b28fd75a66f',
  port: 5432,
})

// const pool = new Pool({
//   user: 'azis',
//   host: 'localhost',
//   database: 'Project Management System',
//   password: 'azis',
//   port: 5432,
// })


const indexRouter = require('./routes/index')(pool);
var profileRouter = require('./routes/profile')(pool);
const usersRouter = require('./routes/users')(pool);
const projectRouter = require('./routes/projects')(pool)


const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(fileUpload())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'nungguin ya?',
}))

app.use(flash())

app.use('/', indexRouter);
app.use('/profile', profileRouter);
app.use('/users', usersRouter);
app.use('/projects', projectRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
