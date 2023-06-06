let express = require('express');
let router = express.Router();
const fetch = require('node-fetch');
const controller = require('./controller');
const configurations = require('./configuration');

/**
 * NOTICE
 *
 * This implementation is DEPRECATED
 * For now, the EMR service has been removed from the Docker Compose
 * Post-MVP development will likely involve updating this module
 */

router.delete('/:id', new ActionSequence().authenticate().withPathParameters(['id']).assert(Assertions.isInt(), 'id')
    .withEntity('project', Project, ['id']).authorize('project').append(async (seq, {project}) => {
        const response = await fetch(`http://${controller.getEMRLink(project.projectID)}/api/training/stop`, { method: 'POST' });
        if (!response.ok) {
            seq.terminate(500, { error: 'An error occurred while stopping training' });
            return;
        }
        configurations.deleteEMRConfiguration(project.projectID);
        seq.terminate(204);
    }).export());

router.get('/:id', new ActionSequence().authenticate().withPathParameters(['id']).assert(Assertions.isInt(), 'id')
    .withEntity('project', Project, ['id']).authorize('project').append(async (seq, {project}) => {
        emrParams = await controller.setUpEMRParams(project.projectID);
        controller.launchEMRCluster(emrParams);
        seq.terminate(204);
    }).export());

router.post('/score', (req, res) => {
    const data = req.body.data;
    console.log('Received data: ', data);
    res.status(200).send('Data received');
});

module.exports = router;
