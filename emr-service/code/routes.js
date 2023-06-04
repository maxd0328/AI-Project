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
        // replace "http://emr-cluster-url" with the URL of your EMR cluster
        const response = await fetch(`http://${controller.getEMRLink}/api/training/stop`, { method: 'POST' });

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

module.exports = router;
