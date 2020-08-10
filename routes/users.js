var express = require('express');
var router = express.Router();

/* GET users listing. */
module.exports = (db) => {

  router.get('/', function (req, res, next) {
    res.send('respond with a resource');
  });



  return router;
}