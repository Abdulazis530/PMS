var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt')
var helpers = require('../helpers/auth')

module.exports = (db) => {
  router.get('/', function (req, res, next) {
    res.render('login', { pesanKesalahan: req.flash('pesanKesalahan') });
  });

  router.post('/login', async (req, res, next) => {
    try {
      const result = await db.query(`SELECT *FROM users WHERE email =$1`, [req.body.email])
      if (result.rows.length == 0) {
        req.flash('pesanKesalahan', 'username atau password')
        return res.redirect('/')
      }
      bcrypt.compare(req.body.password, result.rows[0].password, function (err, found) {
        if (err) {
          req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
          return res.redirect('/')
        }
        if (!found) {
          req.flash('pesanKesalahan', 'username atau password salah')
          return res.redirect('/')
        }
        let user = result.rows[0]
        console.log(user)
        //sebelum dikirim ke front-end password harus di delete terlebih dahulu
        delete user['password']
        //user masuk session  
        req.session.user = user
        res.redirect('/projects')
      });

    } catch (error) {
      req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
      return res.redirect('/')
    }
  });
  router.get('/logout', function (req, res, next) {
    req.session.destroy(err => res.redirect("/"))

  });
  return router
}




