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

    // const result =await db.query('SELECT*FROM users WHERE userid=$1')
    const result = await db.query(`SELECT *FROM members WHERE userid =$1`, [userid])
    const role = result.rows[0].role
    const type = result.rows[0].type

    res.render('profile/view', {
      email,
      role,
      type,
      pesanKesalahan: req.flash('pesanKesalahan'),
      tab
    })

  });

  router.post('/', helpers.isLogIn, async (req, res, next) => {

    const role = req.body.customRadio
    const type = req.body.customRadioType
    const userid = req.session.user.userid
    try {
      const check = await db.query('SELECT password FROM users WHERE userid= $1', [userid])
      const found = await bcrypt.compare(req.body.password, check.rows[0].password)
      if (found) {
        const result = await db.query(`UPDATE members SET role = $1, type = $2 WHERE userid= $3`, [role, type, userid])
        res.redirect('/projects')
      } else {
        req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
        res.redirect('/profile')
      }

    }
    catch (error) {
      console.log(error)
      req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
      res.redirect('/profile')
    }
  });


  return router;
}


