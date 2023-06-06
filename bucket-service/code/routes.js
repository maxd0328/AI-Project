const router = require('express').Router();
const { ActionSequence, Assertions } = require('server-lib').utils;
const { Script, Project, Preset, Dataset } = require('server-lib').entities;

/* POST submit new script. */
router.post('/scripts', new ActionSequence()
    .authenticate()
    .withRequestBody(['name', 'content'])
    .assert(Assertions.isString(), 'name', 'content')
    .openTransaction()
    .createEntity('script', Script, ['userID', 'name'])
    .saveS3Content('content', 'script')
    .append((seq, { script }) => seq.terminate(201, { scriptID: script.scriptID }))
    .export()
);

/* PUT submit script data. */
router.put('/scripts/:scriptID', new ActionSequence()
    .authenticate()
    .withPathParameters(['scriptID'])
    .assert(Assertions.isInt(), 'scriptID')
    .withRequestBody([], ['name', 'content'])
    .assert(Assertions.disjunction().isString().isUndefined().isNull(), 'name', 'content')
    .openTransaction()
    .withEntity('script', Script, ['scriptID'])
    .authorize('script')
    .intermediate(async ({ script, name, connection, content, rollbackEvents }) => {
        if(typeof name === 'string')
            script.name = name;
        await script.save(connection);
        if(typeof content === 'string')
            await script.saveContent(content, rollbackEvents);
    })
    .terminate(204)
    .export()
);

/* DELETE delete script. */
router.delete('/scripts/:scriptID', new ActionSequence()
    .authenticate()
    .withPathParameters(['scriptID'])
    .assert(Assertions.isInt(), 'scriptID')
    .openTransaction()
    .withEntity('script', Script, ['scriptID'])
    .authorize('script')
    .deleteEntity('script')
    .terminate(204)
    .export()
);

/* GET request scripts. */
router.get('/scripts', new ActionSequence()
    .authenticate()
    .withAllEntities('scripts', Script, ['userID'])
    .append((seq, { scripts }) => seq.terminate(200, scripts.map(({ scriptID, name, lastModified }) => ({ scriptID, name, lastModified }))))
    .export()
);

/* GET request script data. */
router.get('/scripts/:scriptID', new ActionSequence()
    .authenticate()
    .withPathParameters(['scriptID'])
    .assert(Assertions.isInt(), 'scriptID')
    .openTransaction()
    .withEntity('script', Script, ['scriptID'])
    .authorize('script')
    .withS3Content('content', 'script')
    .append((seq, { script: { name, lastModified }, content }) => seq.terminate(200, { name, lastModified, content }))
    .export()
);

/* POST submit new project. */
router.post('/projects', new ActionSequence()
    .authenticate()
    .withRequestBody(['name', 'type', 'presetID'])
    .assert(Assertions.isString(), 'name')
    .assert(Assertions.isOneOf('cnn'), 'type')
    .assert(Assertions.disjunction().isInt().isNull(), 'presetID')
    .openTransaction()
    .createEntity('project', Project, ['userID', 'name', 'type', 'presetID'])
    .append((seq, { project }) => seq.terminate(201, { projectID: project.projectID }))
    .export()
);

/* POST submit project details. */
router.put('/projects/:projectID', new ActionSequence()
    .authenticate()
    .withPathParameters(['projectID'])
    .assert(Assertions.isInt(), 'projectID')
    .withRequestBody(['name'])
    .assert(Assertions.isString(), 'name')
    .openTransaction()
    .withEntity('project', Project, ['projectID'])
    .authorize('project')
    .intermediate(async ({ project, name, connection }) => {
        project.name = name;
        await project.save(connection);
    })
    .terminate(204)
    .export()
);

/* PUT submit project pipeline. */
router.put('/projects/:projectID/pipeline', new ActionSequence()
    .authenticate()
    .withPathParameters(['projectID'])
    .withRequestBody(['presetID', 'stages'])
    .assert(Assertions.isInt(), 'projectID', 'presetID')
    .assert(Assertions.isArray(), 'stages')
    .openTransaction()
    .withEntity('project', Project, ['projectID'])
    .authorize('project')
    .append(async (seq, { project, stages, presetID, connection, rollbackEvents }) => {
        await project.clearStages(connection, rollbackEvents);
        for(let i = 0 ; i < stages[i].length ; ++i) {
            const { name, type, scriptID, content } = stages[i];
            const stageObj = project.newStage(i, { name, type, scriptID });
            await stageObj.create(connection);
            if(stageObj.type !== 'ext')
                await stageObj.saveContent(content || '', rollbackEvents);
        }
        project.presetID = presetID;
        await project.save(connection);
        seq.terminate(204);
    })
    .export()
);

/* DELETE delete project. */
router.delete('/projects/:projectID', new ActionSequence()
    .authenticate()
    .withPathParameters(['projectID'])
    .assert(Assertions.isInt(), 'projectID')
    .openTransaction()
    .withEntity('project', Project, ['projectID'])
    .authorize('project')
    .deleteEntity('project')
    .terminate(204)
    .export()
);

/* GET request projects. */
router.get('/projects', new ActionSequence()
    .authenticate()
    .openTransaction()
    .withAllEntities('projects', Project, ['userID'], true)
    .append((seq, { projects }) => seq.terminate(200, projects.map(({ projectID, name, type, lastModified }) => ({ projectID, name, type, lastModified }))))
    .export()
);

/* GET request project details. */
router.get('/projects/:projectID', new ActionSequence()
    .authenticate()
    .withPathParameters(['projectID'])
    .assert(Assertions.isInt(), 'projectID')
    .openTransaction()
    .withEntity('project', Project, ['projectID'])
    .authorize('project')
    .append((seq, { project: { name, type, lastModified, datasetIDs } }) => seq.terminate(200, { name, type, lastModified, datasetIDs }))
    .export()
);

/* GET project pipeline stages. */
router.get('/projects/:projectID/pipeline', new ActionSequence()
    .authenticate()
    .withPathParameters(['projectID'])
    .assert(Assertions.isInt(), 'projectID')
    .openTransaction()
    .withEntity('project', Project, ['projectID'])
    .authorize('project')
    .withDynamic('stages', async ({ project, connection }) => await project.fetchStages(connection))
    .append(async (seq, { stages }) => {
        const results = [];
        for(let i = 0 ; i < stages.length ; ++i)
            results.push(stages[i].type === 'ext' ? { name: stages[i].name, type: stages[i].type, scriptID: stages[i].scriptID }
                : { name: stages[i].name, type: stages[i].type, content: await stages[i].fetchContent() || '' });
        seq.terminate(200, results);
    })
    .export()
);

/* POST link dataset to project. */
router.post('/projects/:projectID/datasets/:datasetID', new ActionSequence()
    .authenticate()
    .withPathParameters(['projectID', 'datasetID'])
    .assert(Assertions.isInt(), 'projectID', 'datasetID')
    .openTransaction()
    .withEntity('project', Project, ['projectID'])
    .authorize('project')
    .withEntity('dataset', Dataset, ['datasetID'])
    .authorize('dataset')
    .append(async (seq, { project, datasetID, connection }) => {
        project.datasetIDs.push(datasetID);
        await project.save(connection);
        seq.terminate(204);
    })
    .export()
);

/* DELETE unlink dataset from project. */
router.delete('/projects/:projectID/datasets/:datasetID', new ActionSequence()
    .authenticate()
    .withPathParameters(['projectID', 'datasetID'])
    .assert(Assertions.isInt(), 'projectID', 'datasetID')
    .openTransaction()
    .withEntity('project', Project, ['projectID'])
    .authorize('project')
    .append(async (seq, { project, datasetID, connection }) => {
        const index = project.datasetIDs.indexOf(datasetID);
        if(index >= 0) {
            project.datasetIDs.splice(index, 1);
            await project.save(connection);
            seq.terminate(204);
        }
        else seq.terminate(404, { message: 'Requested dataset ID is not linked to the project' });
    })
    .export()
);

/* GET request presets. */
router.get('/presets', new ActionSequence()
    .authenticate()
    .withAllEntities('presets', Preset, [])
    .append((seq, { presets }) => seq.terminate(200, presets.map(({ presetID, name, description }) => ({ presetID, name, description }))))
    .export()
);

/* GET request preset details. */
router.get('/presets/:presetID', new ActionSequence()
    .authenticate()
    .withPathParameters(['presetID'])
    .assert(Assertions.isInt(), 'presetID')
    .openTransaction()
    .withEntity('preset', Preset, ['presetID'])
    .withS3Content('content', 'preset')
    .append((seq, { preset: { presetID, name, description }, content }) => seq.terminate(200, { presetID, name, description, content }))
    .export()
);

module.exports = router;
