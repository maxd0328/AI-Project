const express = require('express');
const router = express.Router();
const controller = require('./controller');
const multer = require('multer');

// TODO maybe switch to disk storage later on, but this shouldn't be a huge issue right now at least, maybe we look into max memory of EC2
const upload = multer({ storage: multer.memoryStorage() });

function ensureLoggedIn(req, res) {
    if(!req.session.loggedIn) {
        res.redirect('/login');
        return false;
    }
    return true;
}

/* POST create new dataset. */
router.post('/create', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const name = req.body['name'];

    try {
        const datasetID = await controller.createDataset(req.session.userID, name);
        res.status(201).json({ datasetID });
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST submit new files to dataset. */
router.post('/upload', upload.array('files'), async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];
    const labelID = req.body['labelID'];
    const customLabel = req.body['customLabel'];

    try {
        const datafileIDs = await controller.uploadFiles(req.session.userID, datasetID, req.files, labelID, customLabel);
        res.status(201).json(datafileIDs);
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST rename dataset. */
router.post('/rename', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];
    const name = req.body['name'];

    try {
        await controller.renameDataset(req.session.userID, datasetID, name);
        res.status(204).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST add label to dataset. */
router.post('/add-label', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];
    const string = req.body['string'];

    try {
        const labelID = await controller.addLabel(req.session.userID, datasetID, string);
        res.status(201).json({ labelID });
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST edit label value. */
router.post('/edit-label', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];
    const labelID = req.body['labelID'];
    const string = req.body['string'];

    try {
        await controller.editLabel(req.session.userID, datasetID, labelID, string);
        res.status(204).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST delete label from dataset. */
router.post('/delete-label', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];
    const labelID = req.body['labelID'];

    try {
        await controller.deleteLabel(req.session.userID, datasetID, labelID);
        res.status(204).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST submit updated datafile fields. */
router.post('/update-datafile', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];
    const datafileID = req.body['datafileID'];
    const name = req.body['name'];
    const labelID = req.body['labelID'];
    const customLabel = req.body['customLabel'];

    try {
        await controller.updateDatafile(req.session.userID, datasetID, datafileID, name, labelID, customLabel);
        res.status(204).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST delete datafile from dataset. */
router.post('/delete-datafile', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];
    const datafileID = req.body['datafileID'];

    try {
        await controller.deleteDatafile(req.session.userID, datasetID, datafileID);
        res.status(204).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* POST delete dataset. */
router.post('/delete', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];

    try {
        await controller.deleteDataset(req.session.userID, datasetID);
        res.status(204).json();
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* GET fetch users' datasets. */
router.get('/fetch', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;

    try {
        const datasets = await controller.getDatasets(req.session.userID);
        res.status(200).json(datasets);
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

/* GET fetch dataset details. */
router.get('/fetch-details', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.query.id;

    try {
        const dataset = await controller.getDatasetDetails(req.session.userID, datasetID);
        res.status(200).json(dataset);
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong '});
    }
});

/* GET fetch a queried page of dataset files. */
router.get('/fetch-datafiles', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.query.id;
    const query = req.query.query || '';
    const page = req.query.page || 0;

    try {
        const files = await controller.getFiles(req.session.userID, datasetID, query, page);
        res.status(200).json(files);
    }
    catch(err) {
        res.status(400).json({ error: 'Something went wrong' });
    }
});

module.exports = router;
