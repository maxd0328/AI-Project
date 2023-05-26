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

/* POST submit dataset changes. */
router.post('/submit', async (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    const datasetID = req.body['datasetID'];
    const name = req.body['name'];
    const addLabels = req.body['addLabels'] || [];
    const editLabels = req.body['editLabels'] || [];
    const deleteLabels = req.body['deleteLabels'] || [];
    const editFiles = req.body['editFiles'] || [];
    const deleteFiles = req.body['deleteFiles'] || [];

    try {
        const labelIDs = await controller.updateDataset(req.session.userID,
            datasetID, name, addLabels, editLabels, deleteLabels, editFiles, deleteFiles);
        res.status(labelIDs.length > 0 ? 201 : 200).json({ labelIDs });
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
