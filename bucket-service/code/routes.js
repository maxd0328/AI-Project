const express = require('express');
const router = express.Router();
const controller = require('./controller');

function ensureLoggedIn(req, res) {
    if(!req.session.loggedIn) {
        res.redirect('/login');
        return false;
    }
    return true;
}

/* POST submit new script. */
router.post('/create-script', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const name = req.body['name'];
    const content = req.body['content'];

    try {
        const scriptID = await controller.createScript(req.session.userID, name, content);
        res.status(201).json({ scriptID });
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST submit script name. */
router.post('/rename-script', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const scriptID = req.body['scriptID'];
    const name = req.body['name'];

    try {
        await controller.updateScriptName(req.session.userID, scriptID, name);
        res.status(200).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST submit script content. */
router.post('/save-script', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const scriptID = req.body['scriptID'];
    const content = req.body['content'];

    try {
        await controller.updateScriptContent(req.session.userID, scriptID, content);
        res.status(200).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST delete script. */
router.post('/delete-script', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const scriptID = req.body['scriptID'];

    try {
        await controller.deleteScript(req.session.userID, scriptID);
        res.status(200).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* GET request scripts. */
router.get('/fetch-scripts', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;

    try {
        const scripts = await controller.getScripts(req.session.userID);
        res.status(200).json(scripts);
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* GET request script content. */
router.get('/script-content', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const scriptID = req.query.id;

    try {
        const content = await controller.getScriptContent(req.session.userID, scriptID);
        res.status(200).json({ content });
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST submit new project. */
router.post('/create-project', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const name = req.body['name'];
    const type = req.body['type'];

    try {
        const projectID = await controller.createProject(req.session.userID, name, type);
        res.status(201).json({ projectID });
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST submit project name. */
router.post('/rename-project', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const projectID = req.body['projectID'];
    const name = req.body['name'];

    try {
        await controller.updateProjectName(req.session.userID, projectID, name);
        res.status(200).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST delete project. */
router.post('/delete-project', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const projectID = req.body['projectID'];

    try {
        await controller.deleteProject(req.session.userID, projectID);
        res.status(200).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* GET request projects. */
router.get('/fetch-projects', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;

    try {
        const projects = await controller.getProjects(req.session.userID);
        res.status(200).json(projects);
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* GET request specific project. */
router.get('/fetch-project', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const projectID = req.query.id;

    try {
        const project = await controller.getProject(req.session.userID, projectID);
        res.status(200).json(project);
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

module.exports = router;
