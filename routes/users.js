const express = require('express');
const router = express.Router();
const helpers = require('../helpers/auth');
const bcrypt = require('bcrypt')

/* GET users listing. */
const optionCheckBox = {
  checkboxIdUser: true,
  checkboxNameUser: true,
  checkboxEmail: true,
  checkboxPosition: true,
  checkboxTypeJob: true,
  checkboxStatus: true

}
module.exports = (db) => {
  const tab = 'users'
  let conditionUser = []
  console.log(conditionUser)

  router.get('/', helpers.isLogIn, async (req, res, next) => {

    const privilege = req.session.user.status
    const limit = 5
    const {
      idUser,
      checkboxIdUser,
      nameUser,
      checkboxNameUser,
      email,
      checkboxEmail,
      position,
      checkboxPosition,
      checkboxTypeJob,
      typeJob,
      fiturBrowserUser,
      userBrowse,
      pageUser
    } = req.query
    console.log(req.query)
    if (fiturBrowserUser || userBrowse) {
      let currentPage = userBrowse || 1
      let page = "userBrowse"
      if(fiturBrowserUser) conditionUser=[]
      if (checkboxIdUser && idUser.length !== 0) conditionUser.push(`userid = ${Number(idUser)}`)
      if (checkboxNameUser && nameUser.length !== 0) conditionUser.push(`CONCAT(firstname, ' ', lastname) ILIKE '%${nameUser}%'`)
      if (checkboxEmail && email.length !== 0) conditionUser.push(`email ILIKE '%${email}%'`)
      if (checkboxPosition && position.length !== 0 && position !== 'Choose position') conditionUser.push(`role ILIKE '%${position}%'`)
      if (checkboxTypeJob && typeJob) conditionUser.push(`worktype ILIKE '%${typeJob}%'`)
      
      if (conditionUser.length == 0) {
        res.redirect('/users')
      } else {

        const conditions = conditionUser.join(" OR ")
      
       
        try {
          const queryGetTotalRow = `SELECT COUNT(userid) FROM users WHERE ${conditions}`
          const getTotalRow = await db.query(queryGetTotalRow)
          const totalRow = getTotalRow.rows[0].count

          const queryGetAllUser = `SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname ,email,worktype,status,role FROM users WHERE ${conditions} ORDER BY userid Limit ${limit} OFFSET ${limit * currentPage - limit}`
          const getAllUser = await db.query(queryGetAllUser)
          const allUser = getAllUser.rows

          let totalPage = Math.ceil(totalRow / limit)

          console.log(currentPage)
          res.render('users/view', {
            tab,
            currentPage,
            totalPage,
            data: allUser,
            nameOfPage:page,
            optionCheckBox,
            privilege
          })

        } catch (error) {
          console.log(error)
          res.status(500).json({ error: true, message: error })

        }
      }

    } else {
      try {

        let currentPage = pageUser || 1
        let page = "pageUser"

        const queryGetTotalRow = `SELECT COUNT(userid) FROM users`
        const getTotalRow = await db.query(queryGetTotalRow)
        const totalRow = getTotalRow.rows[0].count

        const queryGetAllUser = `SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname ,email,worktype,status,role FROM users  ORDER BY userid Limit ${limit} OFFSET ${limit * currentPage - limit}`
        const getAllUser = await db.query(queryGetAllUser)
        const allUser = getAllUser.rows

        let totalPage = Math.ceil(totalRow / limit)


        res.render('users/view', {
          tab,
          currentPage,
          totalPage,
          data: allUser,
          nameOfPage: page,
          optionCheckBox,
          privilege
        })

      } catch (error) {
        console.log(error)
        res.status(500).json({ error: true, message: error })
      }
    }
  });



  return router;
}