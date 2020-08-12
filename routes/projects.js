var express = require('express');
var router = express.Router();
var helpers = require('../helpers/auth');
var moment = require('moment');

let optionCheckBox = {
    checkId: true,
    checkName: true,
    checkMember: true,
    checkIdMembers: true,
    checkNameUsers: true,
    checkRoleUsers: true
}

module.exports = (db) => {

    let condition = []
    let conditionUser = []
    let conditionAddMembers = []
    let conditionIssues = []
    router.get('/', helpers.isLogIn, async (req, res, next) => {
        console.log(optionCheckBox)
        const limit = 5

        if (req.query.fiturBrowser === "yes" || req.query.pageBrowse) {
            let currentPage = req.query.pageBrowse || 1
            let page = "pageBrowse"

            if (req.query.checkboxId === "on" && req.query.projectid.length !== 0) condition.push(`projects.projectid = ${Number(req.query.projectid)}`)
            if (req.query.checkboxName === "on" && req.query.projectname.length !== 0) condition.push(`projects.name ILIKE '%${req.query.projectname}%'`)
            if (req.query.checkboxMember === "on" && req.query.member.length !== 0 && req.query.member !== 'Open this select menu') condition.push(`CONCAT(users.firstname, ' ', users.lastname) ILIKE '%${req.query.member}%'`)

            if (condition.length == 0) {
                res.redirect('/projects')
            } else {

                const conditions = condition.join(" OR ")
                condition = []
                try {
                    let queryTotal = `SELECT COUNT(DISTINCT projects.projectid) FROM ((users JOIN members ON users.userid=members.userid)JOIN projects ON projects.projectid = members.projectid) WHERE ${conditions}`
                    let queryGetData = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,', ' ORDER BY users.firstname, users.lastname) AS members FROM ((users JOIN members ON users.userid=members.userid) JOIN projects ON projects.projectid = members.projectid) WHERE ${conditions} GROUP BY projects.projectid LIMIT ${limit} OFFSET ${limit * currentPage - limit}`

                    const total = await db.query(queryTotal)
                    const getData = await db.query(queryGetData)
                    const fullname = await db.query("SELECT CONCAT(firstname, ' ', lastname) AS fullname FROM users")
                    let totalPage = Math.ceil(Number(total.rows[0].count) / limit)
                    res.render('projects/view', { currentPage, totalPage, data: getData.rows, nameOfPage: page, fullnames: fullname.rows, optionCheckBox })

                } catch (error) {
                    console.log(error)
                }

            }

        } else {

            let currentPage = req.query.page || 1
            let page = "page"
            let queryTotal = `SELECT COUNT(DISTINCT projects.projectid) FROM ((users JOIN members ON users.userid=members.userid)JOIN projects ON projects.projectid = members.projectid)`
            let queryGetData = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,', 'ORDER BY users.firstname,users.lastname) members FROM((users JOIN members ON users.userid=members.userid)JOIN projects ON projects.projectid = members.projectid) GROUP BY projects.projectid LIMIT ${limit} OFFSET ${limit * currentPage - limit};`

            const total = await db.query(queryTotal)
            const fullname = await db.query("SELECT CONCAT(firstname, ' ', lastname) AS fullname FROM users")
            const getData = await db.query(queryGetData)

            let totalPage = Math.ceil(Number(total.rows[0].count) / limit)
            res.render('projects/view', { user: req.session.user, currentPage, totalPage, data: getData.rows, nameOfPage: page, fullnames: fullname.rows, optionCheckBox });
        }
    });
    router.post('/', helpers.isLogIn, async (req, res, next) => {

        if (req.body.option) {
            typeof req.body.checkboxId === "undefined" ? optionCheckBox.checkId = false : optionCheckBox.checkId = true
            typeof req.body.checkboxName === "undefined" ? optionCheckBox.checkName = false : optionCheckBox.checkName = true
            typeof req.body.checkboxMember === "undefined" ? optionCheckBox.checkMember = false : optionCheckBox.checkMember = true
            res.redirect('/projects')
        } else {
            const delDataMembers = 'DELETE FROM members WHERE projectid=$1'
            const delDataProject = 'DELETE FROM projects WHERE projectid=$1'
            try {
                await db.query(delDataMembers, [req.body.delete])
                await db.query(delDataProject, [req.body.delete])
                res.redirect('/projects')
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }

        }
    })
    // localhost:3000/projects/add
    router.get('/add', helpers.isLogIn, async (req, res, next) => {
        const queryGetusers = "SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname FROM users;"
        try {
            const result = await db.query(queryGetusers)
            res.render('projects/form', { data: result.rows, pesanKesalahan: req.flash('pesanKesalahan'), pesanKeberhasilan: req.flash('pesanKeberhasilan') })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }

    });

    // // localhost:3000/projects/add method:post
    router.post('/add', helpers.isLogIn, async (req, res, next) => {

        const newProject = req.body.project
        const newProjectMembers = req.body.cb

        if (typeof newProjectMembers == 'undefined' || newProject.length == 0) {

            req.flash('pesanKesalahan', 'Update tidak dapat dilakukan')
            res.redirect('add')
        } else {
            try {
                //update project tabel
                await db.query("INSERT INTO projects (name) VALUES($1)", [newProject])
                //select projectid of newProject
                const result = await db.query('SELECT projectid FROM projects WHERE name=$1', [newProject])
                const newProjectId = result.rows[0].projectid
                //update member tabel
                newProjectMembers.forEach(async (newMember) => {
                    await db.query(`INSERT INTO members (role,userid,projectid,type) VALUES ($1,$2,$3,$4)`, ['belum ditentukan', newMember, newProjectId, 'belum ditentukan'])
                })
                req.flash('pesanKeberhasilan', 'New Project added succesfully!')
                res.redirect('add')

            } catch (error) {
                console.log(error)
                req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
                res.status(500).json({ error: true, message: error })

            }

        }


    });

    // // localhost:3000/projects/edit/1
    router.get('/edit/:id', helpers.isLogIn, async (req, res, next) => {

        const queryGetProject = 'SELECT name FROM projects WHERE projectid = $1;'
        const queryGetusers = "SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname FROM users;"
        const queryOldmembers = 'SELECT users.userid FROM((projects JOIN members ON projects.projectid=members.projectid)JOIN users ON users.userid=members.userid) WHERE projects.projectid =$1'
        let members = []

        try {
            //ambil data dari members siapa aja orang yang terlibat dalam project ini
            const alluser = await db.query(queryGetusers)
            const dataOldMembers = await db.query(queryOldmembers, [req.params.id])
            const getProject = await db.query(queryGetProject, [req.params.id])

            let oldMembers = dataOldMembers.rows
            let data = alluser.rows

            let projectName = getProject.rows[0].name

            //store userid into an array 
            oldMembers.forEach(e => {
                members.push(e.userid)
            })
            let page = `edit/${req.params.id}`
            res.render('projects/form', { projectName, data, pesanKesalahan: req.flash('pesanKesalahan'), pesanKeberhasilan: req.flash('pesanKeberhasilan'), members, page })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })

        }


    });

    // // localhost:3000/projects/edit/1 method:post
    router.post('/edit/:id', helpers.isLogIn, async (req, res, next) => {
        console.log(req.body)
        const project = req.body.project
        const newProjectMembers = req.body.cb

        if (project.length === 0 || typeof newProjectMembers === 'undefined') {
            req.flash('pesanKesalahan', 'Update tidak dapat dilakukan')
            res.redirect(req.params.id)
        }
        else {
            try {
                let queryUpdate = 'UPDATE projects SET name = $1 Where projectid = $2'
                let queryDelete = 'DELETE FROM members WHERE projectid =$1'
                let queryInsert = `INSERT INTO members (role,userid,projectid,type) VALUES ($1,$2,$3,$4)`

                //update table projects
                await db.query(queryUpdate, [project, req.params.id])

                //delete rows in member table with projectid =req.params.id
                await db.query(queryDelete, [req.params.id])

                //insert one by one with each of newProjectMembers
                newProjectMembers.forEach(async (newMember) => {
                    await db.query(queryInsert, ['belum ditentukan', newMember, req.params.id, 'belum ditentukan'])
                })
                req.flash('pesanKeberhasilan', 'Project have been edited succesfully!')

                res.redirect(req.params.id)
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
                req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
            }

        }




    });

    // // localhost:3000/projects/delete/1 method:get


    // // localhost:3000/projects/overview/1
    router.get('/overview/:projectid', helpers.isLogIn, async (req, res, next) => {
        const queryGetMembers = "SELECT CONCAT(users.firstname, ' ', users.lastname) AS fullname FROM users JOIN members ON users.userid = members.userid WHERE members.projectid =$1"

        try {
            const members = await db.query(queryGetMembers, [req.params.projectid])
            res.render('projects/overview/view', { members: members.rows, url: req.params.projectid })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });
    router.get('/members/:projectid', helpers.isLogIn, async (req, res, next) => {
        console.log(optionCheckBox)
        const limit = 3
        console.log(req.query)
        if (req.query.fiturBrowserUsers === "yes" || req.query.pageBrowseUsers) {
            let currentPage = req.query.pageBrowseUsers || 1
            let page = "pageBrowseUsers"
            console.log(req.params.projectid)
            if (req.query.checkboxIdUsers === "on" && req.query.inputIdUsers.length !== 0) conditionUser.push(`members.id = ${Number(req.query.inputIdUsers)}`)
            if (req.query.checkboxNameUsers === "on" && req.query.inputNameUsers.length !== 0) conditionUser.push(`CONCAT(firstname, ' ', lastname) ILIKE '%${req.query.inputNameUsers}%'`)
            if (req.query.checkboxRoleUsers === "on" && req.query.inputRoleUsers.length !== 0 && req.query.inputRoleUsers !== 'Open this select menu') conditionUser.push(`members.role= '${req.query.inputRoleUsers}'`)
            console.log(conditionUser)
            if (conditionUser.length == 0) {
                res.redirect(req.params.projectid) //you need to make sure it is right redirect link!
            } else {
                const conditionsUser = conditionUser.join(" OR ")
                conditionUser = []
                try {
                    let numberOfusers = `SELECT COUNT(users.userid) FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 AND (${conditionsUser}) `
                    let members = `SELECT members.id, CONCAT(firstname, ' ', lastname) AS fullname, members.role AS position FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 AND (${conditionsUser}) LIMIT ${limit} OFFSET ${currentPage * limit - limit}`
                    let queryPosition = `SELECT DISTINCT role as Position FROM members`

                    const getNumberOfUsers = await db.query(numberOfusers, [req.params.projectid])
                    const getMembers = await db.query(members, [req.params.projectid])
                    const optionRole = await db.query(queryPosition)
                    const selectRoles = optionRole.rows
                    const totalData = getNumberOfUsers.rows[0].count
                    const totalPage = Math.ceil(Number(totalData) / limit)

                    res.render('projects/members/view', { url: req.params.projectid, data: getMembers.rows, currentPage, totalPage, nameOfPage: page, selectRoles, optionCheckBox })

                } catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })

                }

            }

        } else {

            let currentPage = req.query.pageMember || 1
            let page = "pageMember"
            let numberOfusers = `SELECT COUNT(users.userid) FROM ((projects  JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 `
            let members = `SELECT members.id, CONCAT(firstname, ' ', lastname) AS fullname, members.role AS position FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 LIMIT ${limit} OFFSET ${currentPage * limit - limit}`
            let queryPosition = `SELECT DISTINCT role as Position FROM members`
            try {
                const getNumberOfUsers = await db.query(numberOfusers, [req.params.projectid])
                const getMembers = await db.query(members, [req.params.projectid])
                const optionRole = await db.query(queryPosition)
                console.log(getMembers.rows)
                const selectRoles = optionRole.rows
                const totalData = getNumberOfUsers.rows[0].count
                const totalPage = Math.ceil(Number(totalData) / limit)

                res.render('projects/members/view', { url: req.params.projectid, data: getMembers.rows, currentPage, totalPage, nameOfPage: page, selectRoles, optionCheckBox })
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }
        }

    });

    router.post('/members/:projectid', helpers.isLogIn, async (req, res, next) => {

        if (req.body.optionUsers) {
            typeof req.body.checkOptionIdUsers === "undefined" ? optionCheckBox.checkIdMembers = false : optionCheckBox.checkIdMembers = true
            typeof req.body.checkOptionNameUsers === "undefined" ? optionCheckBox.checkNameUsers = false : optionCheckBox.checkNameUsers = true
            typeof req.body.checkOptionRoleUsers === "undefined" ? optionCheckBox.checkRoleUsers = false : optionCheckBox.checkRoleUsers = true
            res.redirect(req.body.optionUsers)
        }
        else {

            const delDataMembers = 'DELETE FROM members WHERE projectid=$1 AND id=$2'
            console.log(typeof Number(req.body.delete))
            console.log(typeof Number(req.params.projectid))

            try {
                await db.query(delDataMembers, [Number(req.params.projectid), Number(req.body.delete)])
                res.redirect(req.params.projectid)
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }

        }
    })


    // // localhost:3000/projects/activity/1
    // router.get('/activity/:projectid', helpers.isLogIn, function (req, res, next) {
    //     res.render('projects/activity/view')
    // });

    // // localhost:3000/projects/issues/1
    router.get('/issues/:projectid', helpers.isLogIn, async (req, res, next) => {
        const limit = 3
        const url = req.params.projectid
        if (req.query.fiturBrowseIssue === "yes" || req.query.pageBrowseIssue) {

            let currentPage = req.query.pageBrowseIssue || 1
            let page = "pageBrowseIssue"

            console.log(req.query)
            if (req.query.checkboxIdIssues === "on" && req.query.inputIdIssues.length !== 0) conditionIssues.push(`issues.issueid = ${Number(req.query.inputIdIssues)}`)
            if (req.query.checkboxSubjectIssues === "on" && req.query.inputSubjectIssue.length !== 0) conditionIssues.push(`issues.subject ILIKE '%${req.query.inputSubjectIssue}%'`)
            if (req.query.checkboxTracker=== "on" && req.query.inputTracker.length !== 0 && req.query.inputTracker !== 'Open this select menu') conditionIssues.push(`issues.tracker ILIKE '%${req.query.inputTracker}%'`)
            console.log(conditionIssues)
            if (conditionIssues.length == 0) {
                res.redirect(url)
            }
            else {
                console.log('here too')
                const conditions = conditionIssues.join(" OR ")
                conditionIssues = []
                try {
                    const issuesQuery = `SELECT issueid,projectid,tracker,subject,description,status,priority,startdate,duedate,estimatedtime,done,files,spenttime,targetversion,crateddate,updateddate,closeddate,parenttask FROM issues WHERE projectid=$1 AND (${conditions}) LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                    const getIssues = await db.query(issuesQuery, [url])
                    const issues = getIssues.rows

                    const queryAssignee = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS assigneName FROM users JOIN issues ON users.userid = issues.assignee WHERE projectid=$1 AND (${conditions}) LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                    const getAssigneeUsers = await db.query(queryAssignee, [url])
                    const assigneeUsers = getAssigneeUsers.rows

                    const queryAuthor = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS authorName FROM users JOIN issues ON users.userid =issues.author WHERE projectid=$1 AND (${conditions}) LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                    const getAuthor = await db.query(queryAuthor, [url])
                    const authorUsers = getAuthor.rows

                    const queryTotal = `SELECT COUNT(*) FROM issues WHERE projectid=$1 AND (${conditions})`
                    const total = await db.query(queryTotal, [url])
                    const totalPage = Math.ceil(Number(total.rows[0].count) / limit)

                    issues.forEach((issue, i) => {
                        let startDate = moment(issue.startdate).format('YYYY-MM-DD')
                        let dueDate = moment(issue.duedate).format('YYYY-MM-DD')
                        let createdDate = moment(issue.crateddate).format('YYYY-MM-DD')

                        let updateDate = moment(issue.updateddate).format('YYYY-MM-DD')
                        let closeDate = moment(issue.closeddate).format('YYYY-MM-DD')

                        issue.startdate = startDate
                        issue.duedate = dueDate
                        issue.crateddate = createdDate
                        issue.updateddate = updateDate
                        issue.closeddate = closeDate
                        issue.assignee = assigneeUsers[i].assignename
                        issue.author = authorUsers[i].authorname
                    })
                    res.render('projects/issues/view', { url, currentPage, totalPage, data: issues, nameOfPage: page })


                }
                catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })
                }

            }

        } else {
            console.log('here')
            try {
                let currentPage = req.query.pageIssue || 1
                let page = "pageIssue"



                const issuesQuery = `SELECT issueid,projectid,tracker,subject,description,status,priority,startdate,duedate,estimatedtime,done,files,spenttime,targetversion,crateddate,updateddate,closeddate,parenttask FROM issues WHERE projectid=$1 LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                const getIssues = await db.query(issuesQuery, [url])
                const issues = getIssues.rows


                const queryAssignee = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS assigneName FROM users JOIN issues ON users.userid = issues.assignee WHERE projectid=$1 LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                const getAssigneeUsers = await db.query(queryAssignee, [url])
                const assigneeUsers = getAssigneeUsers.rows


                const queryAuthor = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS authorName FROM users JOIN issues ON users.userid =issues.author WHERE projectid=$1 LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                const getAuthor = await db.query(queryAuthor, [url])
                const authorUsers = getAuthor.rows

                let queryTotal = `SELECT COUNT(*) FROM issues WHERE projectid=$1`
                const total = await db.query(queryTotal, [url])
                const totalPage = Math.ceil(Number(total.rows[0].count) / limit)


                issues.forEach((issue, i) => {
                    let startDate = moment(issue.startdate).format('YYYY-MM-DD')
                    let dueDate = moment(issue.duedate).format('YYYY-MM-DD')
                    let createdDate = moment(issue.crateddate).format('YYYY-MM-DD')
                   
                    let updateDate = moment(issue.updateddate).format('YYYY-MM-DD')
                    let closeDate = moment(issue.closeddate).format('YYYY-MM-DD')

                    issue.startdate = startDate
                    issue.duedate = dueDate
                    issue.crateddate = createdDate
                    issue.updateddate = updateDate
                    issue.closeddate = closeDate
                    issue.assignee = assigneeUsers[i].assignename
                    issue.author = authorUsers[i].authorname
                })




                res.render('projects/issues/view', { url, currentPage, totalPage, data: issues, nameOfPage: page })
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }
        }


    });

    // // localhost:3000/projects/issues/1/add
    // router.get('/issues/:projectid/add', helpers.isLogIn, function (req, res, next) {
    //     res.render('projects/issues/add')
    // });

    // // localhost:3000/projects/issues/1/add method:post
    // router.post('/issues/:projectid/add', helpers.isLogIn, function (req, res, next) {
    //     res.redirect(`/projects/issues/${req.params.projectid}`)
    // });

    // // localhost:3000/projects/issues/1/edit/2
    // router.get('/issues/:projectid/edit/:issueid', helpers.isLogIn, function (req, res, next) {
    //     res.render('projects/issues/edit')
    // });

    // // localhost:3000/projects/issues/1/edit/2 method:post
    // router.post('/issues/:projectid/edit/:issueid', helpers.isLogIn, function (req, res, next) {
    //     res.redirect(`/projects/issues/${req.params.projectid}`)
    // });

    // // localhost:3000/projects/issues/1/delete/2
    // router.get('/issues/:projectid/delete/:issueid', helpers.isLogIn, function (req, res, next) {
    //     res.redirect(`/projects/issues/${req.params.projectid}`)
    // });

    // // localhost:3000/projects/members/1
    // router.get('/members/:projectid', helpers.isLogIn, function (req, res, next) {
    //     res.render('projects/members/list')
    // });

    // // localhost:3000/projects/members/1/add
    router.get('/members/:projectid/add', helpers.isLogIn, async (req, res, next) => {
        const url = req.params.projectid
        try {
            let queryPosition = `SELECT DISTINCT role as Position FROM members`
            const optionRole = await db.query(queryPosition)
            const selectRoles = optionRole.rows

            const userInmember = `SELECT userid FROM members WHERE projectid =$1`
            const alreadyMember = await db.query(userInmember, [req.params.projectid])

            const userMember = alreadyMember.rows
            userMember.forEach(e => {
                conditionAddMembers.push(`users.userid != ${e.userid}`)
            })

            const conditionsAddMembers = conditionAddMembers.join(" AND ")
            let getUser = `SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname FROM users WHERE ${conditionsAddMembers} `
            const users = await db.query(getUser)

            res.render('projects/members/add', { url, data: users.rows, selectRoles })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });

    // localhost:3000/projects/members/1/add method:post
    router.post('/members/:projectid/add', helpers.isLogIn, async (req, res, next) => {
        console.log(req.body)
        const idUser = Number(req.body.inputIdMembers)
        const inputRole = req.body.inputRoleMembers
      
        if (idUser == NaN || inputRole == 'Open this select menu') {
            res.redirect('add')
        }

        try {
            
            let queryAdd = `INSERT INTO members (role,userid,projectid,type) VALUES ($1,$2,$3,$4)`
            await db.query(queryAdd, [inputRole, idUser, req.params.projectid, 'fulltime'])
            res.redirect(`/projects/members/${req.params.projectid}`)

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }

    });

    // // localhost:3000/projects/members/1/edit/2
    router.get('/members/:projectid/edit/:memberid', helpers.isLogIn, async (req, res, next) =>{
        const url = req.params.projectid
        try {
            const sqlGetUser= "SELECT CONCAT(users.firstname, ' ', users.lastname) as fullname,members.id FROM members JOIN users on members.userid=users.userid WHERE members.id=$1"
            const getUsers= await db.query(sqlGetUser,[req.params.memberid])
            const users=getUsers.rows[0]

            let queryPosition = `SELECT DISTINCT role as Position FROM members`
            const optionRole = await db.query(queryPosition)
            const selectRoles = optionRole.rows
            console.log(users)
            res.render('projects/members/edit',{url,data:users,selectRoles})
        } catch (error) {
            console.log(error)  
            res.status(500).json({ error: true, message: error })
        }

       
    });

    // localhost:3000/projects/members/1/edit/2 method:post
    router.post('/members/:projectid/edit/:memberid', helpers.isLogIn,async (req, res, next)=> {
        const newRole=req.body.inputRoleMembers

        console.log(req.body)
        try {
            const queryEdit='UPDATE members SET role =$1 WHERE projectid=$2 AND id=$3'
            await db.query(queryEdit,[newRole,req.params.projectid,req.params.memberid])
            res.redirect(`/projects/members/${req.params.projectid}`)
        } catch (error) {
            console.log(error)  
            res.status(500).json({ error: true, message: error })
        }
      
    });

    // // localhost:3000/projects/members/1/delete/2
    // router.get('/members/:projectid/delete/:memberid', helpers.isLogIn, function (req, res, next) {
    //     res.redirect(`/projects/members/${req.params.projectid}`)
    // });


    return router;
}


