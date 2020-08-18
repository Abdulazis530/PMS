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
    checkTrackerIssue: true,
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


    // **************START OF PROJECTS ************//

    //localhost:3000/projects
    router.get('/', helpers.isLogIn, async (req, res, next) => {
        const { fiturBrowser, pageBrowse, checkboxId, checkboxName, checkboxMember, projectid, projectname, member, pageDisplay } = req.query
        const limit = 5
        const status = req.session.user.status

        if (fiturBrowser === "yes" || pageBrowse) {
            let currentPage = pageBrowse || 1
            let page = "pageBrowse"
            if (fiturBrowser) condition = []
            if (checkboxId === "on" && projectid.length !== 0) condition.push(`projects.projectid = ${Number(projectid)}`)
            if (checkboxName === "on" && projectname.length !== 0) condition.push(`projects.name ILIKE '%${projectname}%'`)
            if (checkboxMember === "on" && member.length !== 0 && member !== 'Open this select menu') condition.push(`CONCAT(users.firstname, ' ', users.lastname) ILIKE '%${member}%'`)

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
                    res.render('projects/list', {
                        currentPage,
                        totalPage,
                        data: getData.rows,
                        nameOfPage: page,
                        fullnames: fullname.rows,
                        optionCheckBox,
                        tab,
                        status
                    })

                } catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })

                }

            }

        } else {
            try {
                let currentPage = pageDisplay || 1
                let page = "pageDisplay"
                let queryTotal = `SELECT COUNT(DISTINCT projects.projectid) FROM ((users JOIN members ON users.userid=members.userid)JOIN projects ON projects.projectid = members.projectid)`
                let queryGetData = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,', 'ORDER BY users.firstname,users.lastname) members FROM((users JOIN members ON users.userid=members.userid)JOIN projects ON projects.projectid = members.projectid) GROUP BY projects.projectid LIMIT ${limit} OFFSET ${limit * currentPage - limit};`

                const total = await db.query(queryTotal)
                const fullname = await db.query("SELECT CONCAT(firstname, ' ', lastname) AS fullname FROM users")
                const getData = await db.query(queryGetData)
                let totalPage = Math.ceil(Number(total.rows[0].count) / limit)

                res.render('projects/list', {
                    status,
                    currentPage,
                    totalPage,
                    data: getData.rows,
                    nameOfPage: page,
                    fullnames: fullname.rows,
                    optionCheckBox,
                    tab
                });
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })

            }

        }
    });
    router.post('/', helpers.isLogIn, async (req, res, next) => {
        const { checkboxId, checkboxName, checkboxMember, option } = req.body
        if (option) {
            typeof checkboxId === "undefined" ? optionCheckBox.checkId = false : optionCheckBox.checkId = true
            typeof checkboxName === "undefined" ? optionCheckBox.checkName = false : optionCheckBox.checkName = true
            typeof checkboxMember === "undefined" ? optionCheckBox.checkMember = false : optionCheckBox.checkMember = true
            res.redirect('/projects')
        }
    })

    // localhost:3000/projects/add
    router.get('/add', helpers.isLogIn, async (req, res, next) => {

        const status = req.session.user.status

        try {
            const queryGetusers = "SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname FROM users;"
            const getUsers = await db.query(queryGetusers)
            const users = result.rows
            res.render('projects/form', {
                data: users,
                pesanKesalahan: req.flash('pesanKesalahan'),
                pesanKeberhasilan: req.flash('pesanKeberhasilan'),
                tab,
                status
            })
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
        const status = req.session.user.status
        const projectid = Number(req.params.id)
        let members = []

        try {
            const queryGetusers = "SELECT userid, CONCAT(firstname, ' ', lastname) AS fullname FROM users;"
            const alluser = await db.query(queryGetusers)
            let data = alluser.rows

            const queryOldmembers = 'SELECT users.userid FROM((projects JOIN members ON projects.projectid=members.projectid)JOIN users ON users.userid=members.userid) WHERE projects.projectid =$1'
            const dataOldMembers = await db.query(queryOldmembers, [projectid])
            let oldMembers = dataOldMembers.rows

            const queryGetProject = 'SELECT name FROM projects WHERE projectid = $1;'
            const getProject = await db.query(queryGetProject, [projectid])
            let projectName = getProject.rows[0].name


            oldMembers.forEach(e => {
                members.push(e.userid)
            })

            let page = `edit/${projectid}`

            res.render('projects/form', {
                projectName,
                data,
                pesanKesalahan: req.flash('pesanKesalahan'),
                pesanKeberhasilan: req.flash('pesanKeberhasilan'),
                members,
                page,
                tab,
                status
            })

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });

    // localhost:3000/projects/edit/1 method:post
    router.post('/edit/:id', helpers.isLogIn, async (req, res, next) => {
        const project = req.body.project
        const newProjectMembers = req.body.cb
        const id = Number(req.params.id)
        if (project.length === 0 || typeof newProjectMembers === 'undefined') {
            req.flash('pesanKesalahan', 'Update tidak dapat dilakukan')
            res.redirect(req.params.id)
        }
        else {
            try {
                let queryUpdate = 'UPDATE projects SET name = $1 Where projectid = $2'
                let queryDelete = 'DELETE FROM members WHERE projectid =$1'
                let queryInsert = `INSERT INTO members (role,userid,projectid) VALUES ($1,$2,$3)`

                await db.query(queryUpdate, [project, id])
                await db.query(queryDelete, [id])
                newProjectMembers.forEach(async (newMember) => {
                    await db.query(queryInsert, ['belum ditentukan', newMember, id])
                })
                req.flash('pesanKeberhasilan', 'Project have been edited succesfully!')

                res.redirect(id)
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
                req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
            }

        }
    });

    // localhost:3000/projects/delete/1
    router.get('/delete/:id', helpers.isLogIn, async (req, res, next) => {

        const id = req.params.id
        try {
            const delActivity = 'DELETE FROM activity WHERE projectid=$1'
            await db.query(delActivity, [id])

            const delDataIssues = 'DELETE FROM issues WHERE projectid=$1'
            await db.query(delDataIssues, [id])

            const delDataMembers = 'DELETE FROM members WHERE projectid=$1'
            await db.query(delDataMembers, [id])

            const delDataProject = 'DELETE FROM projects WHERE projectid=$1'
            await db.query(delDataProject, [id])

            res.redirect('/projects')
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });
    //*****************END OF PROJECTS ************/


    // **************START OF OVERVIEW ************//
    // localhost:3000/projects/overview/1
    router.get('/overview/:projectid', helpers.isLogIn, async (req, res, next) => {
        const status = req.session.user.status
        const projectid = Number(req.params.projectid)

        try {
            const trackers = ["bug", "feature", "support"]
            const bug = { openBug: 0, totalBug: 0 }
            const feature = { openFeature: 0, totalFeature: 0 }
            const support = { openSupport: 0, totalSupport: 0 }

            trackers.forEach(async tracker => {

                try {
                    //get any tracker
                    const sqlGetTotalTracker = `SELECT COUNT(tracker) FROM issues WHERE tracker ILIKE '%${tracker}%' AND projectid= $1 `
                    const getTotalTracker = await db.query(sqlGetTotalTracker, [projectid])
                    const totalTracker = Number(getTotalTracker.rows[0].count)

                    //get total closed traccker
                    const sqlGetClosedTracker = `SELECT COUNT(tracker) FROM issues WHERE tracker ILIKE '%${tracker}%' AND status ILIKE '%closed%' AND projectid= $1`
                    const getClosedTracker = await db.query(sqlGetClosedTracker, [projectid])
                    const closedTracker = Number(getClosedTracker.rows[0].count)

                    const openTracker = totalTracker - closedTracker

                    if (tracker == 'bug') {

                        bug.openBug += openTracker
                        bug.totalBug += totalTracker

                    }
                    if (tracker == 'feature') {
                        feature.openFeature += openTracker
                        feature.totalFeature += totalTracker


                    }
                    if (tracker == 'support') {
                        support.openSupport += openTracker
                        support.totalSupport += totalTracker


                    }
                } catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })

                }

            })

            const queryGetMembers = "SELECT CONCAT(users.firstname, ' ', users.lastname) AS fullname,members.role FROM users JOIN members ON users.userid = members.userid WHERE members.projectid =$1"
            const getMembers = await db.query(queryGetMembers, [projectid])
            const members = getMembers.rows


            const sqlGetProjectName = 'SELECT name FROM projects WHERE projectid=$1'
            const getProjectName = await db.query(sqlGetProjectName, [projectid])
            const projectName = getProjectName.rows[0].name

            res.render('projects/overview/view', {
                members,
                projectName,
                url: projectid,
                tab,
                bug,
                support,
                feature,
                status
            })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });
    //*****************END OF OVERVIEW ************/



    // **************START OF MEMBER ************//

    // localhost:3000/projects/members/1
    router.get('/members/:projectid', helpers.isLogIn, async (req, res, next) => {

        const status = req.session.user.status
        const {
            fiturBrowserUsers,
            pageBrowseUsers,
            checkboxIdUsers,
            checkboxNameUsers,
            checkboxRoleUsers,
            inputIdUsers,
            inputNameUsers,
            inputRoleUsers,
            pageMember
        } = req.query

        const limit = 3
        const projectId = Number(req.params.projectid)

        if (fiturBrowserUsers === "yes" || pageBrowseUsers) {
            let currentPage = pageBrowseUsers || 1
            let page = "pageBrowseUsers"

            if (checkboxIdUsers === "on" && inputIdUsers.length !== 0) conditionUser.push(`members.id = ${Number(inputIdUsers)}`)
            if (checkboxNameUsers === "on" && inputNameUsers.length !== 0) conditionUser.push(`CONCAT(firstname, ' ', lastname) ILIKE '%${inputNameUsers}%'`)
            if (checkboxRoleUsers === "on" && inputRoleUsers.length !== 0 && inputRoleUsers !== 'Open this select menu') conditionUser.push(`members.role= '${inputRoleUsers}'`)

            if (conditionUser.length == 0) {
                res.redirect(`/projects/members/${projectId}`)
            } else {
                const conditionsUser = conditionUser.join(" OR ")
                conditionUser = []
                try {
                    let queryPosition = `SELECT DISTINCT role as Position FROM members `
                    const numberOfusers = `SELECT COUNT(users.userid) FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 AND (${conditionsUser})`
                    const getNumberOfUsers = await db.query(numberOfusers, [projectId])
                    const totalData = getNumberOfUsers.rows[0].count
                    const totalPage = Math.ceil(Number(totalData) / limit)

                    const members = `SELECT members.id, CONCAT(firstname, ' ', lastname) AS fullname, members.role AS position FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 AND (${conditionsUser})  ORDER BY members.id LIMIT ${limit} OFFSET ${currentPage * limit - limit}`
                    const getMembers = await db.query(members, [projectId])
                    const data = getMembers.rows

                    const optionRole = await db.query(queryPosition)
                    const selectRoles = optionRole.rows


                    res.render('projects/members/list', {
                        url: projectId,
                        data,
                        currentPage,
                        totalPage,
                        nameOfPage: page,
                        selectRoles,
                        optionCheckBox,
                        tab,
                        status
                    })

                } catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })
                }
            }
        } else {

            let currentPage = pageMember || 1
            let page = "pageMember"
            try {
                const numberOfusers = `SELECT COUNT(users.userid) FROM ((projects  JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1 `
                const getNumberOfUsers = await db.query(numberOfusers, [projectId])
                const totalData = getNumberOfUsers.rows[0].count
                const totalPage = Math.ceil(Number(totalData) / limit)

                const members = `SELECT members.id, CONCAT(firstname, ' ', lastname) AS fullname, members.role AS position FROM ((projects JOIN members ON projects.projectid = members.projectid)JOIN users ON users.userid = members.userid) WHERE members.projectid=$1  ORDER BY members.id  LIMIT ${limit} OFFSET ${currentPage * limit - limit}`
                const getMembers = await db.query(members, [projectId])
                const data = getMembers.rows

                const queryPosition = `SELECT DISTINCT role as Position FROM members `
                const optionRole = await db.query(queryPosition)
                const selectRoles = optionRole.rows

                res.render('projects/members/list', {
                    url: projectId,
                    data,
                    currentPage,
                    totalPage,
                    nameOfPage: page,
                    selectRoles,
                    optionCheckBox,
                    tab,
                    status
                })
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }
        }

    });

    // localhost:3000/projects/members/1
    router.post('/members/:projectid', helpers.isLogIn, async (req, res, next) => {
        const { optionUsers, checkOptionIdUsers, checkOptionNameUsers, checkOptionRoleUsers } = req.body
        const projectId = req.params.projectid
        if (optionUsers) {
            typeof checkOptionIdUsers === "undefined" ? optionCheckBox.checkIdMembers = false : optionCheckBox.checkIdMembers = true
            typeof checkOptionNameUsers === "undefined" ? optionCheckBox.checkNameUsers = false : optionCheckBox.checkNameUsers = true
            typeof checkOptionRoleUsers === "undefined" ? optionCheckBox.checkRoleUsers = false : optionCheckBox.checkRoleUsers = true
            res.redirect(`/projects/members/${projectId}`)
        }


    })

    // localhost:3000/projects/members/1/delete/2
    router.get('/members/:projectid/delete/:memberid', helpers.isLogIn, async (req, res, next) => {

        const projectId = Number(req.params.projectid)
        const memberId = Number(req.params.memberid)
        try {
            const delDataMembers = 'DELETE FROM members WHERE projectid=$1 AND id=$2'
            await db.query(delDataMembers, [projectId, memberId])
            res.redirect(`/projects/members/${projectId}`)
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }

    });

    // localhost:3000/projects/members/1/add
    router.get('/members/:projectid/add', helpers.isLogIn, async (req, res, next) => {
        const status = req.session.user.status
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
                tab,
                status
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
        const status = req.session.user.status
        const url = req.params.projectid
        try {
            const sqlGetUser = "SELECT CONCAT(users.firstname, ' ', users.lastname) as fullname,members.id FROM members JOIN users on members.userid=users.userid WHERE members.id=$1"
            const getUsers = await db.query(sqlGetUser, [req.params.memberid])
            const data = getUsers.rows[0]

            let queryPosition = `SELECT DISTINCT role as Position FROM members`
            const optionRole = await db.query(queryPosition)
            const selectRoles = optionRole.rows

            res.render('projects/members/edit', {
                url,
                data,
                selectRoles,
                tab,
                status
            })
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

    //*****************END OF MEMBERS ************/



    // **************START OF ISSUE ************//

    // localhost:3000/projects/issues/1
    router.get('/issues/:projectid', helpers.isLogIn, async (req, res, next) => {
        const {
            fiturBrowseIssue,
            pageBrowseIssue,
            pageIssue,
            checkboxIdIssues,
            checkboxSubjectIssues,
            checkboxTracker,
            inputIdIssues,
            inputSubjectIssue,
            inputTracker
        } = req.query

        const status = req.session.user.status
        const limit = 3
        const url = req.params.projectid

        if (fiturBrowseIssue === "yes" || pageBrowseIssue) {

            let currentPage = pageBrowseIssue || 1
            let page = "pageBrowseIssue"


            if (checkboxIdIssues === "on" && inputIdIssues.length !== 0) conditionIssues.push(`issues.issueid = ${Number(inputIdIssues)}`)
            if (checkboxSubjectIssues === "on" && inputSubjectIssue.length !== 0) conditionIssues.push(`issues.subject ILIKE '%${inputSubjectIssue}%'`)
            if (checkboxTracker === "on" && inputTracker.length !== 0 && inputTracker !== 'Open this select menu') conditionIssues.push(`issues.tracker ILIKE '%${inputTracker}%'`)

            if (conditionIssues.length == 0) {
                res.redirect(`/projects/issues/${url}`)
            }
            else {

                const conditions = conditionIssues.join(" OR ")
                conditionIssues = []
                try {
                    const issuesQuery = `SELECT issueid,projectid,tracker,subject,description,status,priority,startdate,duedate,estimatedtime,done,files,spenttime,targetversion,crateddate,updateddate,closeddate,parenttask FROM issues WHERE projectid=$1 AND (${conditions}) ORDER by issueid LIMIT ${limit} OFFSET ${limit * currentPage - limit} `
                    const getIssues = await db.query(issuesQuery, [url])
                    const issues = getIssues.rows


                    const queryTotal = `SELECT COUNT(*) FROM issues WHERE projectid=$1 AND (${conditions})`
                    const total = await db.query(queryTotal, [url])
                    const totalPage = Math.ceil(Number(total.rows[0].count) / limit)

                    issues.forEach((issue) => {
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

                    })
                    res.render('projects/issues/list', {
                        url,
                        currentPage,
                        totalPage,
                        data: issues,
                        nameOfPage: page,
                        optionCheckBox,
                        tab,
                        status
                    })
                }
                catch (error) {
                    console.log(error)
                    res.status(500).json({ error: true, message: error })
                }

            }

        } else {

            try {
                let currentPage = pageIssue || 1
                let page = "pageIssue"

                const issuesQuery = `SELECT *FROM issues WHERE projectid=$1 ORDER by issueid LIMIT ${limit} OFFSET ${limit * currentPage - limit}`
                const getIssues = await db.query(issuesQuery, [url])
                const issues = getIssues.rows

                let queryTotal = `SELECT COUNT(*) FROM issues WHERE projectid=$1`
                const total = await db.query(queryTotal, [url])
                const totalPage = Math.ceil(Number(total.rows[0].count) / limit)

                issues.forEach((issue) => {
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

                })

                res.render('projects/issues/list', {
                    url,
                    currentPage,
                    totalPage,
                    data: issues,
                    nameOfPage: page,
                    optionCheckBox,
                    tab,
                    status
                })
            } catch (error) {
                console.log(error)
                res.status(500).json({ error: true, message: error })
            }
        }


    });
    router.post('/issues/:projectid', helpers.isLogIn, async (req, res, next) => {
        const {
            option,
            checkIdIssue,
            checkStatusIssue,
            checkDueDateIssue,
            checkTargetVersionIssue,
            checkSubjectIssue,
            checkPriorityIssue,
            checkEstimatedTimeIssue,
            checkTrackerIssue,
            checkSpentTimeIssue,
            checkCreatedDateIssue,
            checkDescriptionIssue,
            checkStartDateIssue,
            checkDoneIssue,
            checkUpdateDateIssue,
            checkClosedIssue,
            checkFileIssue } = req.body
        const projectId = req.params.projectid

        if (option) {
            typeof checkIdIssue === "undefined" ? optionCheckBox.checkIdIssue = false : optionCheckBox.checkIdIssue = true
            typeof checkStatusIssue === "undefined" ? optionCheckBox.checkStatusIssue = false : optionCheckBox.checkStatusIssue = true
            typeof checkDueDateIssue === "undefined" ? optionCheckBox.checkDueDateIssue = false : optionCheckBox.checkDueDateIssue = true
            typeof checkTargetVersionIssue === "undefined" ? optionCheckBox.checkTargetVersionIssue = false : optionCheckBox.checkTargetVersionIssue = true
            typeof checkSubjectIssue === "undefined" ? optionCheckBox.checkSubjectIssue = false : optionCheckBox.checkSubjectIssue = true
            typeof checkPriorityIssue === "undefined" ? optionCheckBox.checkPriorityIssue = false : optionCheckBox.checkPriorityIssue = true
            typeof checkEstimatedTimeIssue === "undefined" ? optionCheckBox.checkEstimatedTimeIssue = false : optionCheckBox.checkEstimatedTimeIssue = true
            typeof checkTrackerIssue === "undefined" ? optionCheckBox.checkTrackerIssue = false : optionCheckBox.checkTrackerIssue = true
            typeof checkSpentTimeIssue === "undefined" ? optionCheckBox.checkSpentTimeIssue = false : optionCheckBox.checkSpentTimeIssue = true
            typeof checkCreatedDateIssue === "undefined" ? optionCheckBox.checkCreatedDateIssue = false : optionCheckBox.checkCreatedDateIssue = true
            typeof checkDescriptionIssue === "undefined" ? optionCheckBox.checkDescriptionIssue = false : optionCheckBox.checkDescriptionIssue = true
            typeof checkStartDateIssue === "undefined" ? optionCheckBox.checkStartDateIssue = false : optionCheckBox.checkStartDateIssue = true
            typeof checkDoneIssue === "undefined" ? optionCheckBox.checkDoneIssue = false : optionCheckBox.checkDoneIssue = true
            typeof checkUpdateDateIssue === "undefined" ? optionCheckBox.checkUpdateDateIssue = false : optionCheckBox.checkUpdateDateIssue = true
            typeof checkClosedIssue === "undefined" ? optionCheckBox.checkClosedIssue = false : optionCheckBox.checkClosedIssue = true
            typeof checkFileIssue === "undefined" ? optionCheckBox.checkFileIssue = false : optionCheckBox.checkFileIssue = true
            res.redirect(`/projects/issues/${projectId}`)


        }

    })

    // localhost:3000/projects/issues/1/delete/2
    router.get('/issues/:projectid/delete/:issueid', helpers.isLogIn, async (req, res, next) => {

        const projectId = req.params.projectid
        const issueId = Number(req.params.issueid)
        try {
            const sqlDelete = 'DELETE FROM issues WHERE issueid=$1'
            await db.query(sqlDelete, [issueId])
            res.redirect(`/projects/issues/${projectId}`)

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }



    });

    // localhost:3000/projects/issues/1/add
    router.get('/issues/:projectid/add', helpers.isLogIn, async (req, res, next) => {
        const status = req.session.user.status
        const url = req.params.projectid
        try {
            const sqlGetMembers = `SELECT CONCAT(users.firstname, ' ', users.lastname) as assignee,users.userid FROM users JOIN members ON users.userid =members.userid WHERE projectid=$1 `
            const getMembers = await db.query(sqlGetMembers, [url])
            const members = getMembers.rows

            res.render('projects/issues/add', {
                url,
                members,
                tab,
                status
            })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });

    // localhost:3000/projects/issues/1/add method:post
    router.post('/issues/:projectid/add', helpers.isLogIn, async (req, res, next) => {
        const projectId = req.params.projectid
        const author = req.session.user.userid
        const { tracker, subject, description, status, priority, assignee, startDate, dueDate, estimatedTime, done } = req.body

        try {
            if (req.files) {

                const file = req.files.inputFile
                const fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-')

                let addQuery = "INSERT INTO issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, crateddate)   VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())"
                let value = [Number(projectId), tracker, subject, description, status, priority, assignee, startDate, dueDate, Number(estimatedTime), Number(done), fileName, author]
                await db.query(addQuery, value)

                await file.mv(path.join(__dirname, "..", "public", "upload", fileName))

            } else {
                let addQuery = "INSERT INTO issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, crateddate)   VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())"
                let value = [Number(projectId), tracker, subject, description, status, priority, assignee, startDate, dueDate, Number(estimatedTime), Number(done), author]
                await db.query(addQuery, value)
            }
            res.redirect(`/projects/issues/${projectId}`)

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }


    });

    // localhost:3000/projects/issues/1/edit/2
    router.get('/issues/:projectid/edit/:issueid', helpers.isLogIn, async (req, res, next) => {

        const status = req.session.user.status
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
            let currentAssigne = getCurrentAssignee.rows[0]
            if (typeof currentAssigne === "undefined") {
                currentAssigne = {
                    assignee: "Select User",
                    userid: ""

                }
            }

            //author    
            const sqlGetAuthor = "SELECT CONCAT(users.firstname, ' ', users.lastname) as author, users.userid FROM users JOIN issues ON users.userid=issues.author WHERE issueid=$1"
            const getAuthor = await db.query(sqlGetAuthor, [issueid])
            let author = getAuthor.rows[0]
            if (typeof author === "undefined") {
                author = {
                    author: "",
                    userid: ""

                }
            }
            console.log(author)
            //getParentask
            const sqlParentTasks = `SELECT issueid as parenttask, subject,tracker FROM issues WHERE projectid = $1`
            const getParentTasks = await db.query(sqlParentTasks, [url])
            const parentTasks = getParentTasks.rows

            res.render('projects/issues/edit', {
                url,
                members,
                issueData,
                currentAssigne,
                moment,
                parentTasks,
                author,
                tab,
                status
            })

        } catch (error) {

            console.log(error)
            res.status(500).json({ error: true, message: error })

        }
    });

    // localhost:3000/projects/issues/1/edit/2 method:post
    router.post('/issues/:projectid/edit/:issueid', helpers.isLogIn, async (req, res, next) => {

        const { tracker, subject, description, status, priority, dueDate, done, parentTask, spentTime, targetVersion, previousDone, previousSpent } = req.body
        const issueid = req.params.issueid
        const titleActivity = `${subject} #${issueid} (${tracker}) -[${status}]`
        const descActivity = `Spent Time by Hours : from ${previousSpent} updated to ${spentTime}`
        const user = req.session.user.userid
        const projectid = req.params.projectid

        try {
            let queryActivity = `INSERT INTO activity (time, title, description, author, projectid, previousdone, currentdone) VALUES(NOW(), $1, $2, $3, $4, $5, $6)`
            let values = [titleActivity, descActivity, user, Number(projectid), previousDone, Number(done)]
            let sqltUpdateIssue

            //handling if user deleted from database and author become null,this purpose is to added new author into list
            let addAuthor = `UPDATE issues SET author = $1 WHERE issueid =$2`


            if (req.files) {
                const file = req.files.inputFile
                const fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-')
                if (req.body.author) {
                    await db.query(addAuthor, [req.body.author, issueid])
                }
                if (status == "closed") {
                    sqltUpdateIssue = "UPDATE issues SET updateddate = NOW(),closeddate= NOW(),tracker=$1, subject =$2, description=$3, status=$4, priority=$5, duedate=$6,done=$7,parenttask =$8, spenttime =$9, targetversion =$10,files=$11 WHERE issueid= $12"
                } else {
                    sqltUpdateIssue = "UPDATE issues SET updateddate = NOW(),tracker=$1, subject =$2, description=$3, status=$4, priority=$5, duedate=$6,done=$7,parenttask =$8, spenttime =$9, targetversion =$10,files=$11 WHERE issueid= $12"
                }

                await db.query(queryActivity, values)
                const valQuery = [
                    tracker,
                    subject,
                    description,
                    status,
                    priority,
                    dueDate,
                    Number(done),
                    Number(parentTask),
                    Number(spentTime),
                    targetVersion,
                    fileName,
                    issueid
                ]

                await db.query(sqltUpdateIssue, valQuery)
                await file.mv(path.join(__dirname, "..", "public", "upload", fileName))



            } else {
                if (req.body.author) {
                    await db.query(addAuthor, [req.body.author, issueid])
                }
                if (status == "closed") {
                    sqltUpdateIssue = "UPDATE issues SET updateddate = NOW(),closeddate= NOW(),tracker=$1, subject =$2, description=$3, status=$4, priority=$5, duedate=$6,done=$7,parenttask =$8, spenttime =$9, targetversion =$10 WHERE issueid= $11"
                } else {
                    sqltUpdateIssue = "UPDATE issues SET updateddate = NOW(),tracker=$1, subject =$2, description=$3, status=$4, priority=$5, duedate=$6,done=$7,parenttask =$8, spenttime =$9, targetversion =$10 WHERE issueid= $11"
                }
                await db.query(queryActivity, values)

                const valQuery = [
                    tracker,
                    subject,
                    description,
                    status,
                    priority,
                    dueDate,
                    Number(done),
                    Number(parentTask),
                    Number(spentTime),
                    targetVersion,
                    issueid
                ]

                await db.query(sqltUpdateIssue, valQuery)
            }
            res.redirect(`/projects/issues/${req.params.projectid}`)

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })
        }
    });

    //*****************END OF ISSUE ************/


    // **************START OF ACTIVITY ************//

    // localhost:3000/projects/activity/1
    router.get('/activity/:projectid', helpers.isLogIn, async (req, res, next) => {

        const status = req.session.user.status
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
                tab,
                status
            })


        } catch (error) {
            console.log(error)
            res.status(500).json({ error: true, message: error })

        }

    });

    //*****************END OF ACTIITY ************/

    return router;
}


