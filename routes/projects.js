const express = require('express');
const router = express.Router();
const helpers = require('../helpers/auth');
const moment = require('moment');
const path = require('path');

let optionCheckBox = {
    checkId: true,
    checkName: true,
    checkMember: true,
    checkIdMembers: true,
    checkNameUsers: true,
    checkRoleUsers: true,
    checkIdIssue: true,
    checkStatusIssue: true,
    checkDueDateIssue: true,
    checkTargetVersionIssue: true,
    checkSubjectIssue: true,
    checkPriorityIssue: true,
    checkEstimatedTimeIssue: true,
    checkAuthorIssue: true,
    checkTrackerIssue: true,
    checkAssigneIssue: true,
    checkSpentTimeIssue: true,
    checkCreatedDateIssue: true,
    checkDescriptionIssue: true,
    checkDoneIssue: true,
    checkUpdateDateIssue: true,
    checkClosedIssue: true,
    checkFileIssue: true,
    checkStartDateIssue: true

}

module.exports = (db) => {

    let condition = []
    let conditionUser = []
    let conditionAddMembers = []
    let conditionIssues = []
    const tab = "projects"

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
          
                try {
                    let queryTotal = `SELECT COUNT(DISTINCT projects.projectid) FROM ((users JOIN members ON users.userid=members.userid)JOIN projects ON projects.projectid = members.projectid) WHERE ${conditions}`
                    let queryGetData = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,', ' ORDER BY users.firstname, users.lastname) AS members FROM ((users JOIN members ON users.userid=members.userid) JOIN projects ON projects.projectid = members.projectid) WHERE ${conditions} GROUP BY projects.projectid LIMIT ${limit} OFFSET ${limit * currentPage - limit}`

                    const total = await db.query(queryTotal)
                    const getData = await db.query(queryGetData)
                    const fullname = await db.query("SELECT CONCAT(firstname, ' ', lastname) AS fullname FROM users")
                    let totalPage = Math.ceil(Number(total.rows[0].count) / limit)
                    res.render('projects/view', { currentPage, totalPage, data: getData.rows, nameOfPage: page, fullnames: fullname.rows, optionCheckBox, tab })

                } catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })

                }

            }

        } else {
            try {
                let currentPage = req.query.page || 1
                let page = "page"
                let queryTotal = `SELECT COUNT(DISTINCT projects.projectid) FROM ((users JOIN members ON users.userid=members.userid)JOIN projects ON projects.projectid = members.projectid)`
                let queryGetData = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,', 'ORDER BY users.firstname,users.lastname) members FROM((users JOIN members ON users.userid=members.userid)JOIN projects ON projects.projectid = members.projectid) GROUP BY projects.projectid LIMIT ${limit} OFFSET ${limit * currentPage - limit};`

                const total = await db.query(queryTotal)
                const fullname = await db.query("SELECT CONCAT(firstname, ' ', lastname) AS fullname FROM users")
                const getData = await db.query(queryGetData)

                let totalPage = Math.ceil(Number(total.rows[0].count) / limit)
                res.render('projects/view', { user: req.session.user, currentPage, totalPage, data: getData.rows, nameOfPage: page, fullnames: fullname.rows, optionCheckBox, tab });
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })

            }

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
            res.render('projects/form', { data: result.rows, pesanKesalahan: req.flash('pesanKesalahan'), pesanKeberhasilan: req.flash('pesanKeberhasilan'), tab })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }

    });

    // localhost:3000/projects/add method:post
    router.post('/add', helpers.isLogIn, async (req, res, next) => {

        const newProject = req.body.project
        const newProjectMembers = req.body.cb

        if (typeof newProjectMembers == 'undefined' || newProject.length == 0) {

            req.flash('pesanKesalahan', 'Update tidak dapat dilakukan')
            res.redirect('add')
        } else {
            try {

                await db.query("INSERT INTO projects (name) VALUES($1)", [newProject])

                const result = await db.query("SELECT projectid FROM projects WHERE name =$1", [newProject])
                const newProjectId = result.rows[0].projectid

                if (typeof newProjectMembers != "object") {
                    await db.query(`INSERT INTO members (role,userid,projectid) VALUES ($1,$2,$3)`, ['belum ditentukan', Number(newProjectMembers), Number(newProjectId)])
                } else {
                    newProjectMembers.forEach(async (newMember) => {
                        await db.query(`INSERT INTO members (role,userid,projectid) VALUES ($1,$2,$3)`, ['belum ditentukan', Number(newMember), Number(newProjectId)])
                    })
                }

                req.flash('pesanKeberhasilan', 'New Project added succesfully!')
                res.redirect('add')

            } catch (error) {
                console.log(error)
                req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
                res.status(500).json({ error: true, message: error })

            }

        }


    });

    // localhost:3000/projects/edit/1
    router.get('/edit/:id', helpers.isLogIn, async (req, res, next) => {

        const queryGetProject = 'SELECT name FROM projects WHERE projectid = $1;'
        const queryGetusers = "SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname FROM users;"
        const queryOldmembers = 'SELECT users.userid FROM((projects JOIN members ON projects.projectid=members.projectid)JOIN users ON users.userid=members.userid) WHERE projects.projectid =$1'
        const projectid = Number(req.params.id)
        let members = []

        try {

            const alluser = await db.query(queryGetusers)
            const dataOldMembers = await db.query(queryOldmembers, [projectid])
            const getProject = await db.query(queryGetProject, [projectid])

            let oldMembers = dataOldMembers.rows
            let data = alluser.rows
            let projectName = getProject.rows[0].name


            oldMembers.forEach(e => {
                members.push(e.userid)
            })
            let page = `edit/${req.params.id}`
            res.render('projects/form', { projectName, data, pesanKesalahan: req.flash('pesanKesalahan'), pesanKeberhasilan: req.flash('pesanKeberhasilan'), members, page, tab })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });

    // localhost:3000/projects/edit/1 method:post
    router.post('/edit/:id', helpers.isLogIn, async (req, res, next) => {
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
                let queryInsert = `INSERT INTO members (role,userid,projectid) VALUES ($1,$2,$3)`

                await db.query(queryUpdate, [project, req.params.id])
                await db.query(queryDelete, [req.params.id])
                newProjectMembers.forEach(async (newMember) => {
                    await db.query(queryInsert, ['belum ditentukan', newMember, req.params.id])
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

    // localhost:3000/projects/overview/1
    router.get('/overview/:projectid', helpers.isLogIn, async (req, res, next) => {
        const projectid = req.params.projectid
        try {
            const trackers = ["bug", "feature", "support"]
            const bug = { openBug: 0, totalBug: 0 }
            const feature = { openFeature: 0, totalFeature: 0 }
            const support = { openSupport: 0, totalSupport: 0 }

            trackers.forEach(async tracker => {
                //get any tracker
                try {

                    const sqlGetTotalTracker = `SELECT COUNT(tracker) FROM issues WHERE tracker ILIKE '%${tracker}%' AND projectid= $1 `
                    const getTotalTracker = await db.query(sqlGetTotalTracker, [Number(projectid)])
                    const totalTracker = Number(getTotalTracker.rows[0].count)

                    //get total closed traccker
                    const sqlGetClosedTracker = `SELECT COUNT(tracker) FROM issues WHERE tracker ILIKE '%${tracker}%' AND status ILIKE '%closed%' AND projectid= $1`
                    const getClosedTracker = await db.query(sqlGetClosedTracker, [Number(projectid)])
                    const closedTracker = Number(getClosedTracker.rows[0].count)

                    const openTracker = totalTracker - closedTracker

                    if (tracker == 'bug') {

                        bug.openBug += openTracker
                        bug.totalBug += totalTracker
                        console.log(bug)
                    }
                    if (tracker == 'feature') {
                        feature.openFeature += openTracker
                        feature.totalFeature += totalTracker
                        console.log(feature)

                    }
                    if (tracker == 'support') {
                        support.openSupport += openTracker
                        support.totalSupport += totalTracker
                        console.log(support)

                    }
                } catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })

                }


            })

            const queryGetMembers = "SELECT CONCAT(users.firstname, ' ', users.lastname) AS fullname,members.role FROM users JOIN members ON users.userid = members.userid WHERE members.projectid =$1"
            const members = await db.query(queryGetMembers, [Number(projectid)])
            console.log(members)

            const sqlGetProjectName = 'SELECT name FROM projects WHERE projectid=$1'
            const getProjectName = await db.query(sqlGetProjectName, [Number(projectid)])
            const projectName = getProjectName.rows[0].name

            res.render('projects/overview/view', {
                members: members.rows,
                projectName,
                url: projectid,
                tab,
                bug,
                support,
                feature
            })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });

    // localhost:3000/projects/members/1
    router.get('/members/:projectid', helpers.isLogIn, async (req, res, next) => {

        const limit = 3
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
                    let numberOfusers = `SELECT COUNT(users.userid) FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 AND (${conditionsUser})`
                    let members = `SELECT members.id, CONCAT(firstname, ' ', lastname) AS fullname, members.role AS position FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 AND (${conditionsUser})  ORDER BY members.id LIMIT ${limit} OFFSET ${currentPage * limit - limit}`
                    let queryPosition = `SELECT DISTINCT role as Position FROM members `

                    const getNumberOfUsers = await db.query(numberOfusers, [req.params.projectid])
                    const getMembers = await db.query(members, [req.params.projectid])
                    const optionRole = await db.query(queryPosition)
                    const selectRoles = optionRole.rows
                    const totalData = getNumberOfUsers.rows[0].count
                    const totalPage = Math.ceil(Number(totalData) / limit)

                    res.render('projects/members/view', { url: req.params.projectid, data: getMembers.rows, currentPage, totalPage, nameOfPage: page, selectRoles, optionCheckBox, tab })

                } catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })

                }

            }

        } else {

            let currentPage = req.query.pageMember || 1
            let page = "pageMember"
            let numberOfusers = `SELECT COUNT(users.userid) FROM ((projects  JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 `
            let members = `SELECT members.id, CONCAT(firstname, ' ', lastname) AS fullname, members.role AS position FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1  ORDER BY members.id  LIMIT ${limit} OFFSET ${currentPage * limit - limit}`
            let queryPosition = `SELECT DISTINCT role as Position FROM members `
            try {
                const getNumberOfUsers = await db.query(numberOfusers, [req.params.projectid])
                const getMembers = await db.query(members, [req.params.projectid])
                const optionRole = await db.query(queryPosition)

                const selectRoles = optionRole.rows
                const totalData = getNumberOfUsers.rows[0].count
                const totalPage = Math.ceil(Number(totalData) / limit)

                res.render('projects/members/view', { url: req.params.projectid, data: getMembers.rows, currentPage, totalPage, nameOfPage: page, selectRoles, optionCheckBox, tab })
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }
        }

    });
    // localhost:3000/projects/members/1
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
    // localhost:3000/projects/members/1/add
    router.get('/members/:projectid/add', helpers.isLogIn, async (req, res, next) => {
        const url = req.params.projectid
        try {
            let queryPosition = `SELECT DISTINCT role as Position FROM members`
            const optionRole = await db.query(queryPosition)
            const selectRoles = optionRole.rows

            const userInmember = `SELECT userid FROM members WHERE projectid =$1`
            const alreadyMember = await db.query(userInmember, [Number(req.params.projectid)])

            const userMember = alreadyMember.rows
            userMember.forEach(e => {
                conditionAddMembers.push(`users.userid != ${e.userid}`)
            })

            const conditionsAddMembers = conditionAddMembers.join(" AND ")
            let getUser = `SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname FROM users WHERE ${conditionsAddMembers} `
            const users = await db.query(getUser)

            res.render('projects/members/add', {
                url,
                data: users.rows,
                selectRoles,
                tab
            })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });

    // localhost:3000/projects/members/1/add method:post
    router.post('/members/:projectid/add', helpers.isLogIn, async (req, res, next) => {
        const idUser = Number(req.body.inputIdMembers)
        const inputRole = req.body.inputRoleMembers

        if (idUser == NaN || inputRole == 'Open this select menu') {
            res.redirect('add')
        }

        try {

            let queryAdd = `INSERT INTO members (role,userid,projectid) VALUES ($1,$2,$3)`
            await db.query(queryAdd, [inputRole, idUser, Number(req.params.projectid)])
            res.redirect(`/projects/members/${req.params.projectid}`)

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }

    });

    // localhost:3000/projects/members/1/edit/2
    router.get('/members/:projectid/edit/:memberid', helpers.isLogIn, async (req, res, next) => {
        const url = req.params.projectid
        try {
            const sqlGetUser = "SELECT CONCAT(users.firstname, ' ', users.lastname) as fullname,members.id FROM members JOIN users on members.userid=users.userid WHERE members.id=$1"
            const getUsers = await db.query(sqlGetUser, [req.params.memberid])
            const users = getUsers.rows[0]

            let queryPosition = `SELECT DISTINCT role as Position FROM members`
            const optionRole = await db.query(queryPosition)
            const selectRoles = optionRole.rows
            console.log(users)
            res.render('projects/members/edit', { url, data: users, selectRoles, tab })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }


    });

    // localhost:3000/projects/members/1/edit/2 method:post
    router.post('/members/:projectid/edit/:memberid', helpers.isLogIn, async (req, res, next) => {
        const newRole = req.body.inputRoleMembers

        try {
            const queryEdit = 'UPDATE members SET role =$1 WHERE projectid=$2 AND id=$3'
            await db.query(queryEdit, [newRole, req.params.projectid, req.params.memberid])
            res.redirect(`/projects/members/${req.params.projectid}`)
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }

    });

    // localhost:3000/projects/issues/1
    router.get('/issues/:projectid', helpers.isLogIn, async (req, res, next) => {
        const limit = 3
        const url = req.params.projectid
        if (req.query.fiturBrowseIssue === "yes" || req.query.pageBrowseIssue) {

            let currentPage = req.query.pageBrowseIssue || 1
            let page = "pageBrowseIssue"

            console.log(req.query)
            if (req.query.checkboxIdIssues === "on" && req.query.inputIdIssues.length !== 0) conditionIssues.push(`issues.issueid = ${Number(req.query.inputIdIssues)}`)
            if (req.query.checkboxSubjectIssues === "on" && req.query.inputSubjectIssue.length !== 0) conditionIssues.push(`issues.subject ILIKE '%${req.query.inputSubjectIssue}%'`)
            if (req.query.checkboxTracker === "on" && req.query.inputTracker.length !== 0 && req.query.inputTracker !== 'Open this select menu') conditionIssues.push(`issues.tracker ILIKE '%${req.query.inputTracker}%'`)
            console.log(conditionIssues)
            if (conditionIssues.length == 0) {
                res.redirect(url)
            }
            else {
                console.log('here too')
                const conditions = conditionIssues.join(" OR ")
                conditionIssues = []
                try {
                    const issuesQuery = `SELECT issueid,projectid,tracker,subject,description,status,priority,startdate,duedate,estimatedtime,done,files,spenttime,targetversion,crateddate,updateddate,closeddate,parenttask FROM issues WHERE projectid=$1 AND (${conditions}) ORDER by issueid LIMIT ${limit} OFFSET ${limit * currentPage - limit} `
                    const getIssues = await db.query(issuesQuery, [url])
                    const issues = getIssues.rows

                    const queryAssignee = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS assigneName FROM users JOIN issues ON users.userid = issues.assignee WHERE projectid=$1 AND (${conditions}) ORDER by issueid LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                    const getAssigneeUsers = await db.query(queryAssignee, [url])
                    const assigneeUsers = getAssigneeUsers.rows

                    const queryAuthor = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS authorName FROM users JOIN issues ON users.userid =issues.author WHERE projectid=$1 AND (${conditions}) ORDER by issueid LIMIT ${limit} OFFSET ${limit * currentPage - limit} `
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
                    res.render('projects/issues/view', {
                        url,
                        currentPage,
                        totalPage,
                        data: issues,
                        nameOfPage: page,
                        optionCheckBox,
                        tab
                    })


                }
                catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })
                }

            }

        } else {

            try {
                let currentPage = req.query.pageIssue || 1
                let page = "pageIssue"



                const issuesQuery = `SELECT *FROM issues WHERE projectid=$1 ORDER by issueid LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                const getIssues = await db.query(issuesQuery, [url])
                const issues = getIssues.rows


                const queryAssignee = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS assigneName FROM users JOIN issues ON users.userid = issues.assignee WHERE projectid=$1 ORDER by issueid LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                const getAssigneeUsers = await db.query(queryAssignee, [url])
                const assigneeUsers = getAssigneeUsers.rows

                const queryAuthor = `SELECT CONCAT(users.firstname, ' ', users.lastname) AS authorName FROM users JOIN issues ON users.userid =issues.author WHERE projectid=$1  ORDER by issueid LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
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

                res.render('projects/issues/view', {
                    url,
                    currentPage,
                    totalPage,
                    data: issues,
                    nameOfPage: page,
                    optionCheckBox,
                    tab
                })
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }
        }


    });
    router.post('/issues/:projectid', helpers.isLogIn, async (req, res, next) => {
        if (req.body.option) {
            typeof req.body.checkIdIssue === "undefined" ? optionCheckBox.checkIdIssue = false : optionCheckBox.checkIdIssue = true
            typeof req.body.checkStatusIssue === "undefined" ? optionCheckBox.checkStatusIssue = false : optionCheckBox.checkStatusIssue = true
            typeof req.body.checkDueDateIssue === "undefined" ? optionCheckBox.checkDueDateIssue = false : optionCheckBox.checkDueDateIssue = true
            typeof req.body.checkTargetVersionIssue === "undefined" ? optionCheckBox.checkTargetVersionIssue = false : optionCheckBox.checkTargetVersionIssue = true
            typeof req.body.checkSubjectIssue === "undefined" ? optionCheckBox.checkSubjectIssue = false : optionCheckBox.checkSubjectIssue = true
            typeof req.body.checkPriorityIssue === "undefined" ? optionCheckBox.checkPriorityIssue = false : optionCheckBox.checkPriorityIssue = true
            typeof req.body.checkEstimatedTimeIssue === "undefined" ? optionCheckBox.checkEstimatedTimeIssue = false : optionCheckBox.checkPriorityIssue = true
            typeof req.body.checkAuthorIssue === "undefined" ? optionCheckBox.checkAuthorIssue = false : optionCheckBox.checkAuthorIssue = true
            typeof req.body.checkTrackerIssue === "undefined" ? optionCheckBox.checkTrackerIssue = false : optionCheckBox.checkTrackerIssue = true
            typeof req.body.checkAssigneIssue === "undefined" ? optionCheckBox.checkAssigneIssue = false : optionCheckBox.checkAssigneIssue = true
            typeof req.body.checkSpentTimeIssue === "undefined" ? optionCheckBox.checkSpentTimeIssue = false : optionCheckBox.checkSpentTimeIssue = true
            typeof req.body.checkCreatedDateIssue === "undefined" ? optionCheckBox.checkCreatedDateIssue = false : optionCheckBox.checkCreatedDateIssue = true
            typeof req.body.checkDescriptionIssue === "undefined" ? optionCheckBox.checkDescriptionIssue = false : optionCheckBox.checkDescriptionIssue = true
            typeof req.body.checkStartDateIssue === "undefined" ? optionCheckBox.checkStartDateIssue = false : optionCheckBox.checkStartDateIssue = true
            typeof req.body.checkDoneIssue === "undefined" ? optionCheckBox.checkDoneIssue = false : optionCheckBox.checkDoneIssue = true
            typeof req.body.checkUpdateDateIssue === "undefined" ? optionCheckBox.checkUpdateDateIssue = false : optionCheckBox.checkUpdateDateIssue = true
            typeof req.body.checkClosedIssue === "undefined" ? optionCheckBox.checkClosedIssue = false : optionCheckBox.checkClosedIssue = true
            typeof req.body.checkFileIssue === "undefined" ? optionCheckBox.checkFileIssue = false : optionCheckBox.checkFileIssue = true
            res.redirect(`/projects/issues/${req.params.projectid}`)


        } else {
            const issueid = req.body.delete
            try {
                const sqlDelete = 'DELETE FROM issues WHERE issueid=$1'
                await db.query(sqlDelete, [issueid])
                res.redirect(`/projects/issues/${req.params.projectid}`)

            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }
        }

    })

    // localhost:3000/projects/issues/1/add
    router.get('/issues/:projectid/add', helpers.isLogIn, async (req, res, next) => {
        const url = req.params.projectid
        try {
            const sqlGetMembers = `SELECT CONCAT(users.firstname, ' ', users.lastname) as assignee,users.userid FROM users JOIN members ON users.userid =members.userid WHERE projectid=$1 `
            const getMembers = await db.query(sqlGetMembers, [url])
            const members = getMembers.rows

            res.render('projects/issues/add', {
                url,
                members,
                tab
            })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });

    // localhost:3000/projects/issues/1/add method:post
    router.post('/issues/:projectid/add', helpers.isLogIn, async (req, res, next) => {

        const projectid = req.params.projectid
        const tracker = req.body.tracker
        const subject = req.body.subject
        const description = req.body.description
        const status = req.body.status
        const priority = req.body.priority
        const assignee = req.body.assignee
        const startdate = req.body.startDate
        const duedate = req.body.dueDate
        const estimatedtime = Number(req.body.estimatedTime)
        const done = Number(req.body.done)
        const author = req.session.user.userid


        try {
            if (req.files) {
                const file = req.files.inputFile
                const fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-')
                let addQuery = "INSERT INTO issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, crateddate)   VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())"
                let value = [projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, fileName, author]
                await db.query(addQuery, value)
                await file.mv(path.join(__dirname, "..", "public", "upload", fileName))

            } else {
                let addQuery = "INSERT INTO issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, crateddate)   VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())"
                let value = [projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author]
                await db.query(addQuery, value)
            }
            res.redirect(`/projects/issues/${req.params.projectid}`)

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }


    });

    // localhost:3000/projects/issues/1/edit/2
    router.get('/issues/:projectid/edit/:issueid', helpers.isLogIn, async (req, res, next) => {
        const url = req.params.projectid
        const issueid = req.params.issueid

        try {
            //get all member of projectid to be showed in the select input
            const sqlGetMembers = `SELECT CONCAT(users.firstname, ' ', users.lastname) as assignee,users.userid FROM users JOIN members ON users.userid =members.userid WHERE projectid=$1 `
            const getMembers = await db.query(sqlGetMembers, [url])
            const members = getMembers.rows

            //get all data
            const sqlGetAll = `SELECT * FROM issues where issueid =$1`
            const getAll = await db.query(sqlGetAll, [issueid])
            const issueData = getAll.rows[0]

            // currentAssigne
            const sqlCurrentAssignee = `SELECT CONCAT(users.firstname, ' ', users.lastname) as assignee,users.userid FROM users JOIN issues ON users.userid =issues.assignee WHERE issueid=$1`
            const getCurrentAssignee = await db.query(sqlCurrentAssignee, [issueid])
            const currentAssigne = getCurrentAssignee.rows[0]

            //author
            const sqlGetAuthor = "SELECT CONCAT(users.firstname, ' ', users.lastname) as author, users.userid FROM users JOIN issues ON users.userid=issues.author WHERE issueid=$1"
            const getAuthor = await db.query(sqlGetAuthor, [issueid])
            const author = getAuthor.rows[0]

            //getParentask
            const sqlParentTasks = `SELECT issueid as parenttask, subject,tracker FROM issues WHERE projectid = $1`
            const getParentTasks = await db.query(sqlParentTasks, [url])
            const parentTasks = getParentTasks.rows
            console.log(parentTasks)
            res.render('projects/issues/edit', { url, members, issueData, currentAssigne, moment, parentTasks, author, tab })

        } catch (error) {

            console.log(error)
            res.status(500).json({ error: true, message: error })

        }



    });

    // localhost:3000/projects/issues/1/edit/2 method:post
    router.post('/issues/:projectid/edit/:issueid', helpers.isLogIn, async (req, res, next) => {
        const issueid = req.params.issueid
        const tracker = req.body.tracker
        const subject = req.body.subject
        const description = req.body.description
        const status = req.body.status
        const priority = req.body.priority
        const duedate = req.body.dueDate
        const done = req.body.done
        const parentTask = req.body.parentTask
        const spentTime = req.body.spentTime
        const targetVersion = req.body.targetVersion
        const previousDone = req.body.previousDone
        const previousSpent = req.body.previousSpent
        const titleActivity = `${subject} #${issueid} (${tracker}) -[${status}]`
        const descActivity = `Spent Time by Hours : from ${previousSpent} updated to ${spentTime}`
        const user = req.session.user.userid
        const projectid = req.params.projectid

        try {
            let queryActivity = `INSERT INTO activity (time, title, description, author, projectid, previousdone, currentdone) VALUES(NOW(), $1, $2, $3, $4, $5, $6)`
            let values = [titleActivity, descActivity, user, projectid, previousDone, done]
            let sqltUpdateIssue
            if (req.files) {
                const file = req.files.inputFile
                const fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-')
                if (status == "closed") {
                    sqltUpdateIssue = "UPDATE issues SET updateddate = NOW(),closeddate= NOW(),tracker=$1, subject =$2, description=$3, status=$4, priority=$5, duedate=$6,done=$7,parenttask =$8, spenttime =$9, targetversion =$10,files=$11 WHERE issueid= $12"
                } else {
                    sqltUpdateIssue = "UPDATE issues SET updateddate = NOW(),tracker=$1, subject =$2, description=$3, status=$4, priority=$5, duedate=$6,done=$7,parenttask =$8, spenttime =$9, targetversion =$10,files=$11 WHERE issueid= $12"
                }
                //insert into activity table
                await db.query(queryActivity, values)
                //update edited data
                await db.query(sqltUpdateIssue, [tracker, subject, description, status, priority, duedate, Number(done), Number(parentTask), Number(spentTime), targetVersion, fileName, issueid])
                //sent file to public/upload
                await file.mv(path.join(__dirname, "..", "public", "upload", fileName))

            } else {
                if (status == "closed") {
                    sqltUpdateIssue = "UPDATE issues SET updateddate = NOW(),closeddate= NOW(),tracker=$1, subject =$2, description=$3, status=$4, priority=$5, duedate=$6,done=$7,parenttask =$8, spenttime =$9, targetversion =$10 WHERE issueid= $11"
                } else {
                    sqltUpdateIssue = "UPDATE issues SET updateddate = NOW(),tracker=$1, subject =$2, description=$3, status=$4, priority=$5, duedate=$6,done=$7,parenttask =$8, spenttime =$9, targetversion =$10 WHERE issueid= $11"
                }
                await db.query(queryActivity, values)
                await db.query(sqltUpdateIssue, [tracker, subject, description, status, priority, duedate, Number(done), Number(parentTask), Number(spentTime), targetVersion, issueid])


            }

            res.redirect(`/projects/issues/${req.params.projectid}`)

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })

        }

    });

    // localhost:3000/projects/activity/1
    router.get('/activity/:projectid', helpers.isLogIn, async (req, res, next) => {
        const projectid = req.params.projectid
        try {
            //get project
            const sqlGetProject = `SELECT * FROM projects WHERE projectid= ${projectid}`
            const getProject = await db.query(sqlGetProject)
            const project = getProject.rows[0]

            //get activity 
            const sqlActivities = `SELECT activity.*, CONCAT(users.firstname,' ',users.lastname) AS author,
            (time AT TIME ZONE 'Asia/Jakarta'):: time AS timeactivity, 
            (time AT TIME ZONE 'Asia/Jakarta'):: date AS dateactivity
            FROM activity
            LEFT JOIN users ON activity.author = users.userid WHERE projectid= ${projectid} 
            ORDER BY dateactivity DESC, timeactivity DESC`

            const getActivities = await db.query(sqlActivities)
            const activities = getActivities.rows

            activities.forEach(activity => {
                activity.dateactivity = moment(activity.dateactivity).format('YYYY-MM-DD')
                activity.timeactivity = moment(activity.timeactivity, 'HH:mm:ss.SSS').format('HH:mm:ss');

                if (activity.dateactivity == moment().format('YYYY-MM-DD')) {
                    activity.dateactivity = 'Today'
                } else if (activity.dateactivity == moment().subtract(1, 'days').format('YYYY-MM-DD')) {
                    activity.dateactivity = 'Yesterday'
                } else {
                    activity.dateactivity = moment(activity.dateactivity).format("MMMM Do, YYYY")
                }
            })
            res.render(`projects/activity/view`, {
                activities,
                project,
                projectid,
                url: projectid,
                login: req.session.user,
                tab
            })


        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })

        }

    });

    return router;
}


