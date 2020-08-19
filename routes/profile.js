const express = require('express');
const router = express.Router();
const helpers = require('../helpers/auth');
const bcrypt = require('bcrypt')


/* GET home page. */
module.exports = (db) => {
  const tab = "profile"
  router.get('/', helpers.isLogIn, async (req, res, next) => {
    const email = req.session.user.email
    const userid = req.session.user.userid

    const status = req.session.user.status

    const name = `${req.session.user.firstname} ${req.session.user.lastname}`
    const result = await db.query('SELECT role,worktype as type FROM users WHERE userid=$1', [userid])
    const role = result.rows[0].role
    const type = result.rows[0].type

    res.render('profile/view', {
      email,
      role,
      type,
      pesanKesalahan: req.flash('pesanKesalahan'),
      pesanKeberhasilan: req.flash('pesanKeberhasilan'),
      tab,
      status,
      name
    })

  });

  router.post('/', helpers.isLogIn, async (req, res, next) => {

    const role = req.body.customRadio
    const type = req.body.customRadioType
    const userid = req.session.user.userid

    try {

      await db.query(`UPDATE users SET role = $1, worktype = $2 WHERE userid= $3`, [role, type, userid])
      req.flash('pesanKeberhasilan', 'Data berhasil terupdate')
      res.redirect('/profile')
    }
    catch (error) {
      console.log(error)
      req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
      res.redirect('/profile')
    }
  });

  router.get('/password', helpers.isLogIn, async (req, res, next) => {
    const status = req.session.user.status
    res.render('profile/password/form', {
      tab,
      status,
      pesanKesalahan: req.flash('pesanKesalahan'),
      pesanKeberhasilan: req.flash('pesanKeberhasilan')
    })
  });

  router.post('/password', helpers.isLogIn, async (req, res, next) => {
    const { newPassword, rePassword } = req.body
    const userid = req.session.user.userid
    const saltRounds = 10

    if (newPassword != rePassword) {
      req.flash('pesanKesalahan', 'Password tidak cocok!')
      return res.redirect('/profile/password')
    }
    try {
      const hashedPass = await bcrypt.hash(newPassword, saltRounds)
      const sqlUpdatePassword = 'UPDATE users SET password=$1 WHERE userid =$2'
      await db.query(sqlUpdatePassword, [hashedPass, userid])
      req.flash('pesanKeberhasilan', 'Password berhasil diupdate')

      res.redirect('/profile/password')
    } catch (error) {
      console.log(error)
      req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
      res.redirect('/profile/password')
    }
  });


  return router;
}


