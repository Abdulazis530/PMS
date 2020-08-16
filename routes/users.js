const express = require('express');
const router = express.Router();
const helpers = require('../helpers/auth');
const bcrypt = require('bcrypt')

/* GET users listing. */
module.exports = (db) => {
  const tab='users'
  router.get('/', function (req, res, next) {
    res.render('users/view',{tab})
  });



  return router;
}