let express = require('express');
let router = express.Router();
const fetch = require('node-fetch');
const controller = require('./controller');

function ensureLoggedIn(req, res) {
    if(!req.session.loggedIn) {
        res.redirect('/login');
        return false;
    }
    return true;
}

router.post('/stop-training', async function(req, res, next) {
    if(!ensureLoggedIn(req, res)) return;
    const projectID = req.body['projectID'];

    try {
        const response = await fetch(`http://${controller.getEMRLink(projectID)}/api/training/stop`, { method: 'POST' });

        // check if the response was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // parse the response as JSON
        const data = await response.json();

        // send the response from the EMR cluster back to the client
        res.json(data);
    } catch (err) {
        // handle error
        console.error(err);
        res.status(500).send('An error occurred while stopping training');
    }
});

router.post('/score', (req, res) => {
    const data = req.body.data;
    console.log('Received data: ', data);
    res.status(200).send('Data received');
});

router.get('/launch-emr', (req, res) => {
    if(!ensureLoggedIn(req, res)) return;
    try {
        emrParams = controller.setUpEMRParams();
        controller.launchEMRCluster(emrParams);
        res.status(200).send('EMR cluster launched successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while launching EMR cluster');
    }
});

module.exports = router;
