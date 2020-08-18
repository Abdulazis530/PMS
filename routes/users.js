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
  const saltRounds = 10

  // START ROUTE USER
  router.get('/', helpers.isLogIn, async (req, res, next) => {
    const status = req.session.user.status

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

    if (fiturBrowserUser || userBrowse) {
      let currentPage = userBrowse || 1
      let page = "userBrowse"
      if (fiturBrowserUser) conditionUser = []
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

          res.render('users/list', {
            tab,
            currentPage,
            totalPage,
            data: allUser,
            nameOfPage: page,
            optionCheckBox,
            status
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

        res.render('users/list', {
          tab,
          currentPage,
          totalPage,
          data: allUser,
          nameOfPage: page,
          optionCheckBox,
          status
        })

      } catch (error) {
        console.log(error)
        res.status(500).json({ error: true, message: error })
      }
    }
  });

  // OPTION ROUTE
  router.post('/', helpers.isLogIn, async (req, res, next) => {
    const { optionUser, checkboxName, checkboxId, checkboxEmail, checkboxPosition, checkboxTypeJob, checkboxStatus } = req.body

    if (optionUser) {
      typeof checkboxId === "undefined" ? optionCheckBox.checkboxIdUser = false : optionCheckBox.checkboxIdUser = true
      typeof checkboxName === "undefined" ? optionCheckBox.checkboxNameUser = false : optionCheckBox.checkboxNameUser = true
      typeof checkboxEmail === "undefined" ? optionCheckBox.checkboxEmail = false : optionCheckBox.checkboxEmail = true
      typeof checkboxPosition === "undefined" ? optionCheckBox.checkboxPosition = false : optionCheckBox.checkboxPosition = true
      typeof checkboxTypeJob === "undefined" ? optionCheckBox.checkboxTypeJob = false : optionCheckBox.checkboxTypeJob = true
      typeof checkboxStatus === "undefined" ? optionCheckBox.checkboxStatus = false : optionCheckBox.checkboxStatus = true
      res.redirect('/users')
    }

  })
  // END OF ROUTE /USER

  //START /USER/ADD
  router.get('/add', helpers.isLogIn, async (req, res, next) => {
    const status = req.session.user.status
    const add = "add"
    res.render('users/form', { add,status, tab, pesanKesalahan: req.flash('pesanKesalahan') })
  });

  router.post('/add', helpers.isLogIn, async (req, res, next) => {
    const {
      firstName,
      secondName,
      newEmail,
      newPassword,
      newPosition,
      newTypeJob,
      newStatus
    } = req.body

    try {
      const sqlCheckEmail = 'SELECT COUNT(email) FROM users WHERE email = $1'
      const checkEmail = await db.query(sqlCheckEmail, [newEmail])
      const email = checkEmail.rows[0].count

      if (email >= 1) {
        req.flash('pesanKesalahan', 'Email Sudah digunakan!')
        res.redirect('add')
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

        const sqlInsertNewUser = 'INSERT INTO users (email,password,firstname,lastname,status,worktype,role) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        const value = [newEmail, hashedPassword, firstName, secondName, newStatus, newTypeJob, newPosition]

        //insert into db
        await db.query(sqlInsertNewUser, value)
        res.redirect('/users')
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: true, message: error })
    }

  });

  // END OF ROUTE /USER/ADD

  //DELETE 
  router.get('/delete/:userid', helpers.isLogIn, async (req, res, next) => {

    const delUser = req.params.userid

    try {

      const sqlDelAuthorActivity = `DELETE FROM activity WHERE author =$1`
      await db.query(sqlDelAuthorActivity, [delUser])

      const setAuthorIssueNull = 'UPDATE issues SET author = NULL WHERE author = $1 '
      await db.query(setAuthorIssueNull, [delUser])

      const setAssigneeIssueNull = 'UPDATE issues SET assignee = NULL WHERE assignee = $1 '
      await db.query(setAssigneeIssueNull, [delUser])


      const delMember = 'DELETE FROM members where userid=$1'
      await db.query(delMember, [delUser])

      const delDataUsers = 'DELETE FROM users WHERE userid=$1'
      await db.query(delDataUsers, [delUser])

      res.redirect('/users')
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: true, message: error })
    }
  });

  //START OF ROUTE USER/EDIT/1
  router.get('/edit/:userid', helpers.isLogIn, async (req, res, next) => {
    const status = req.session.user.status
    const userid = req.params.userid
    const href = `/users/edit/${userid}`

    try {
      const sqlGetUserInfo = "SELECT*FROM users WHERE userid =$1"
      const getUserInfo = await db.query(sqlGetUserInfo, [userid])
      const userInfo = getUserInfo.rows[0]

      res.render('users/form', { data: userInfo, tab,status, pesanKesalahan: req.flash('pesanKesalahan'), href })

    } catch (error) {
      console.log(error)
      res.status(500).json({ error: true, message: error })
    }

  });

  router.post('/edit/:userid', helpers.isLogIn, async (req, res, next) => {
    const userid = req.params.userid
    const { firstName, secondName, newPassword, rePassword, newPosition, newTypeJob, newStatus } = req.body

    try {
      if (newPassword != rePassword) {
        req.flash('pesanKesalahan', 'Password dan Re-type Password tidak cocok!')
        res.redirect(userid)
      } else {

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
        const sqlUpdateUsers = 'UPDATE users set firstname = $1, lastname = $2, password= $3, role =$4, worktype=$5, status=$6 WHERE userid =$7'
        const value = [firstName, secondName, hashedPassword, newPosition, newTypeJob, newStatus, userid]
        await db.query(sqlUpdateUsers, value)
        res.redirect('/users')
      }


    } catch (error) {
      console.log(error)
      res.status(500).json({ error: true, message: error })

    }

  });

  return router;
}