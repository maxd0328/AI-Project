const router = require('express').Router();
const multer = require('multer');
const { ActionSequence, Assertions } = require('server-lib').utils;
const { Dataset } = require('server-lib').entities;

// TODO maybe switch to disk storage later on, but this shouldn't be a huge issue right now at least, maybe we look into max memory of EC2
const upload = multer({ storage: multer.memoryStorage() });

/* POST create new dataset. */
router.post('/', new ActionSequence()
    .authenticate()
    .withRequestBody(['name'])
    .assert(Assertions.isString(), 'name')
    .openTransaction()
    .createEntity('dataset', Dataset, ['userID', 'name'])
    .append((seq, { dataset }) => seq.terminate(201, { datasetID: dataset.datasetID }))
    .export()
);

/* PUT submit dataset details. */
router.put('/:datasetID', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID'])
    .assert(Assertions.isInt(), 'datasetID')
    .withRequestBody(['name'])
    .assert(Assertions.isString(), 'name')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .intermediate(async ({ dataset, name, connection }) => {
        dataset.name = name;
        await dataset.save(connection);
    })
    .terminate(204)
    .export()
);

/* DELETE delete dataset. */
router.delete('/:datasetID', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID'])
    .assert(Assertions.isInt(), 'datasetID')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .deleteEntity('dataset')
    .terminate(204)
    .export()
);

/* GET request datasets. */
router.get('/', new ActionSequence()
    .authenticate()
    .openTransaction()
    .withAllEntities('datasets', Dataset, ['userID'], true)
    .append((seq, { datasets }) => seq.terminate(200, datasets.map(({ datasetID, name, lastModified }) => ({ datasetID, name, lastModified }))))
    .export()
);

/* GET request dataset details. */
router.get('/:datasetID', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID'])
    .assert(Assertions.isInt(), 'datasetID')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .append((seq, { dataset: { name, lastModified, labels } }) => seq.terminate(200, { name, lastModified, labels: labels.map(({ labelID, string }) => ({ labelID, string })) }))
    .export()
);

/* POST add dataset label. */
router.post('/:datasetID/labels', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID'])
    .assert(Assertions.isInt(), 'datasetID')
    .withRequestBody(['string'])
    .assert(Assertions.isString(), 'string')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .append(async (seq, { dataset, string, connection }) => {
        const label = dataset.addLabel(string);
        await dataset.save(connection);
        seq.terminate(201, { labelID: label.labelID });
    })
    .export()
);

/* PUT edit dataset label. */
router.put('/:datasetID/labels/:labelID', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID', 'labelID'])
    .assert(Assertions.isInt(), 'datasetID', 'labelID')
    .withRequestBody(['string'])
    .assert(Assertions.isString(), 'string')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .intermediate(async ({ dataset, labelID, string, connection }) => {
        dataset.updateLabel(labelID, string);
        await dataset.save(connection);
    })
    .terminate(204)
    .export()
);

/* DELETE delete dataset label. */
router.delete('/:datasetID/labels/:labelID', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID', 'labelID'])
    .assert(Assertions.isInt(), 'datasetID', 'labelID')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .intermediate(async ({ dataset, labelID, connection }) => {
        dataset.deleteLabel(labelID);
        await dataset.save(connection);
    })
    .terminate(204)
    .export()
);

/* POST upload new datafiles. */
router.post('/:datasetID/files', upload.array('files'), new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID'])
    .assert(Assertions.isInt(), 'datasetID')
    .withRequestBody([], ['labelID', 'customLabel'])
    .assert(Assertions.disjunction().isString().isNull().isUndefined(), 'labelID', 'customLabel')
    .withDynamic('labelID', ({ labelID }) => typeof labelID === 'undefined' || labelID === null || labelID === 'null' ? null : parseInt(labelID))
    .withRequestProperty('files')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .append(async (seq, { dataset, files, labelID, customLabel, connection, rollbackEvents }) => {
        const datafileIDs = [];
        for(let i = 0 ; i < files.length ; ++i) {
            const datafile = dataset.newDatafile(files[i].originalname, labelID, customLabel);
            await datafile.create(connection);
            await datafile.saveContent(files[i].buffer, rollbackEvents);
            datafileIDs.push(datafile.datafileID);
        }
        await dataset.save(connection);
        seq.terminate(201, datafileIDs);
    })
    .export()
);

/* PUT update datafile details. */
router.put('/:datasetID/files/:datafileID', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID', 'datafileID'])
    .assert(Assertions.isInt(), 'datasetID', 'datafileID')
    .withRequestBody(['name', 'labelID', 'customLabel'])
    .assert(Assertions.isString(), 'name')
    .assert(Assertions.disjunction().isInt().isNull().isUndefined(), 'labelID')
    .assert(Assertions.disjunction().isString().isNull().isUndefined(), 'customLabel')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .withDynamic('datafile', async ({ dataset, datafileID, connection }) => await dataset.fetchDatafile(datafileID, connection))
    .terminateIfNotExists('datafile', 404, { message: 'Requested datafile does not exist' })
    .intermediate(async ({ dataset, datafile, name, labelID, customLabel, connection }) => {
        datafile.filename = name;
        datafile.labelID = labelID;
        datafile.customLabel = customLabel;
        await datafile.save(connection);
        await dataset.save(connection);
    })
    .terminate(204)
    .export()
);

/* DELETE delete datafile. */
router.delete('/:datasetID/files/:datafileID', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID', 'datafileID'])
    .assert(Assertions.isInt(), 'datasetID', 'datafileID')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .withDynamic('datafile', async ({ dataset, datafileID, connection }) => await dataset.fetchDatafile(datafileID, connection))
    .terminateIfNotExists('datafile', 404, { message: 'Requested datafile does not exist' })
    .deleteEntity('datafile')
    .saveEntity('dataset')
    .terminate(204)
    .export()
);

/* GET request datafiles. */
router.get('/:datasetID/files', new ActionSequence()
    .authenticate()
    .withPathParameters(['datasetID'])
    .assert(Assertions.isInt(), 'datasetID')
    .withQueryParameters([], ['query', 'page'])
    .assert(Assertions.disjunction().isString().isNull().isUndefined(), 'query')
    .assert(Assertions.disjunction().nested(Assertions.isInt().greaterThanOrEqual(1)).isNull().isUndefined(), 'page')
    .openTransaction()
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .withDynamic('files', async ({ dataset, connection, query, page }) => await dataset.searchDatafiles(query, page, 20, connection))
    .append(async (seq, { files }) => seq.terminate(200, await Promise.all(files.map(async datafile => {
        const { datafileID, filename, labelID, customLabel, dateAdded } = datafile;
        const url = await datafile.createPresignedURL();
        return { datafileID, filename, labelID, customLabel, dateAdded, url };
    }))))
    .export()
);

module.exports = router;
