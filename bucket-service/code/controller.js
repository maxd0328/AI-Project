const db = require('../commons/database');
const s3 = require('../commons/s3');

const genS3ScriptKey = (userID, scriptID) => `script-${userID}-${scriptID}.matej`;

const genS3PresetKey = (presetID) => `preset-${presetID}.matej`;

const genS3InternalConfigKey = (projectID, location) => `config-${projectID}-${location}.matej`;

async function createScript(userID, name, content) {
    // Use a transaction to ensure that the database and s3 bucket are updated before committing
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const query = `INSERT INTO scripts (userID, name, lastModified) VALUES (?, ?, ?)`;
        const values = [userID, name, Date.now()];
        let scriptID;

        const [result] = await connection.query(query, values);
        scriptID = result.insertId;

        // Attempt to add the content to S3
        await s3.putResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID), content);

        // Commit the transaction and return the newID
        await connection.commit();
        return scriptID;
    }
    catch(err) {
        await connection.rollback();
        throw err;
    }
    finally {
        connection.release();
    }
}

async function updateScriptName(userID, scriptID, name) {
    const query = `UPDATE scripts SET name = ?, lastModified = ? WHERE userID = ? AND scriptID = ?`;
    const values = [name, Date.now(), userID, scriptID];

    const [result] = await db.query(query, values);
    if(result.affectedRows === 0)
        throw new Error('No such script exists');
}

async function updateScriptContent(userID, scriptID, content) {
    const query = `UPDATE scripts SET lastModified = ? WHERE userID = ? AND scriptID = ?`;
    const values = [Date.now(), userID, scriptID];

    const [result] = await db.query(query, values);
    if(result.affectedRows === 0)
        throw new Error('No such script exists');
    await s3.putResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID), content);
}

async function deleteScript(userID, scriptID) {
    const query = `DELETE FROM scripts WHERE userID = ? AND scriptID = ?`;
    const values = [userID, scriptID];

    const [result] = await db.query(query, values);
    if(result.affectedRows === 0)
        throw new Error('No such script exists');
    await s3.deleteResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID));
}

async function getScripts(userID) {
    const query = `SELECT scriptID, name, lastModified FROM scripts WHERE userID = ? ORDER BY lastModified DESC`;
    const values = [userID];

    const [rows] = await db.query(query, values);
    return rows;
}

async function getScriptContent(userID, scriptID) {
    const query = `SELECT EXISTS(SELECT 1 FROM scripts WHERE userID = ? AND scriptID = ?) AS rowExists`;
    const values = [userID, scriptID];

    const [rows] = await db.query(query, values);
    if(!rows[0].rowExists)
        throw new Error('No such script exists');

    return await s3.getResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID));
}

async function createProject(userID, name, type, presetID) {
    const query = `INSERT INTO projects (userID, name, type, presetID, lastModified) VALUES (?, ?, ?, ?, ?)`;
    const values = [userID, name, type, presetID === undefined ? null : presetID, Date.now()];

    const [result] = await db.query(query, values);

    return result.insertId;
}

async function updateProjectName(userID, projectID, name) {
    const query = `UPDATE projects SET name = ?, lastModified = ? WHERE userID = ? AND projectID = ?`;
    const values = [name, Date.now(), userID, projectID];

    const [result] = await db.query(query, values);
    // Not strictly necessary, but why not let the user know if they updated something that doesn't exist
    if(result.affectedRows === 0)
        throw new Error('No such project exists');
}

async function deleteProject(userID, projectID) {
    const query = `DELETE FROM projects WHERE userID = ? AND projectID = ?`;
    const values = [userID, projectID];

    const [result] = await db.query(query, values);
    // Not strictly necessary, but why not let the user know if they deleted something that already doesn't exist
    if(result.affectedRows === 0)
        throw new Error('No such project exists');
}

async function getProjects(userID) {
    const query = `SELECT projectID, name, type, lastModified FROM projects WHERE userID = ? ORDER BY lastModified DESC`;
    const values = [userID];

    const [rows] = await db.query(query, values);
    return rows;
}

async function getProject(userID, projectID) {
    const query = `SELECT name, type, lastModified, presetID FROM projects WHERE userID = ? AND projectID = ?`;
    const values = [userID, projectID];

    const [rows] = await db.query(query, values);
    // Validate that it actually exists
    if(rows.length > 0)
        return rows[0];
    else throw new Error(`Project with ID ${projectID} does not exist`);
}

async function projectExists(userID, projectID) {
    // SELECT 1 is because we don't actually need any columns from the table, we just want to make sure there is at least one row
    const query = `SELECT EXISTS(SELECT 1 FROM projects WHERE projectID = ? AND userID = ?) AS rowExists`;
    const values = [projectID, userID];

    const [result] = await db.query(query, values);
    return result[0].rowExists;
}

async function getPresets() {
    const query = `SELECT presetID, name, description FROM presets`;
    const values = [];

    const [rows] = await db.query(query, values);
    return rows;
}

async function getPresetContent(presetID) {
    // Make sure the preset actually exists
    const query = `SELECT EXISTS(SELECT 1 FROM presets WHERE presetID = ?) AS rowExists`;
    const values = [presetID];

    const [rows] = await db.query(query, values);
    if(!rows[0].rowExists)
        throw new Error('No such preset exists');

    // If so, return the content from S3
    return await s3.getResource(process.env.S3_USER_BUCKET, genS3PresetKey(presetID));
}

async function getConfigStages(userID, projectID) {
    // Make sure the project actually exists
    if(!await projectExists(userID, projectID))
        throw new Error('No such project exists');

    // Do a big query to get all the matching rows of the config table; order by location so the stages are received in order
    const query = `SELECT c.name, c.type, c.scriptID FROM configs c 
                    INNER JOIN projects p ON p.projectID = c.projectID
                    WHERE c.projectID = ? AND p.userID = ?
                    ORDER BY c.location ASC`;
    const values = [projectID, userID];

    const [rows] = await db.query(query, values);

    // For all rows that aren't external (i.e. script contained externally in the script table), add content field containing that stage's content from S3
    for(let i = 0 ; i < rows.length ; ++i) {
        if(rows[i].type !== 'ext') {
            const content = await s3.getResource(process.env.S3_USER_BUCKET, genS3InternalConfigKey(projectID, i));
            rows[i].content = content === null ? '' : content;
            delete rows[i].scriptID;
        }
    }
    return rows;
}

async function saveConfigStages(userID, projectID, presetID, stages) {
    // TODO perhaps switch to a more efficient algorithm in the future, current implementation is bullshit
    // To adhere to table constraints mid-transaction, all configs are deleted and re-inserted

    // Project must exist (and belong to the user)
    if(!await projectExists(userID, projectID))
        throw new Error('No such project exists');

    // Create a snapshot of the S3 entries in case transaction fails
    let query = `SELECT location FROM configs WHERE projectID = ?`;
    let values = [projectID];

    const [rows] = await db.query(query, values);
    let snapshot = [];
    for(let i = 0 ; i < rows.length ; ++i) {
        const key = genS3InternalConfigKey(projectID, rows[i].location); // Snapshot contains key and associated content
        snapshot.push({ key, content: await s3.getResource(process.env.S3_USER_BUCKET, key) });
    }

    // Create connection for database transaction
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Delete all config rows from the project
        query = `DELETE FROM configs WHERE projectID = ?`;
        values = [projectID];

        await connection.query(query, values);

        // For every stage received from the client, re-insert it
        for(let i = 0 ; i < stages.length ; ++i) {
            query = `INSERT INTO configs (projectID, location, name, type, scriptID) VALUES (?, ?, ?, ?, ?)`;
            values = [projectID, i, stages[i].name, stages[i].type, stages[i].scriptID !== undefined ? stages[i].scriptID : null];

            await connection.query(query, values);
            if(stages[i].type !== 'ext') // If the script is internal, make sure it's stored in the S3
                await s3.putResource(process.env.S3_USER_BUCKET, genS3InternalConfigKey(projectID, i), stages[i].content ? stages[i].content : '');
        }

        // Finally, let's update the project table to apply the new preset and set lastModified field to the current timestamp
        query = `UPDATE projects SET presetID = ?, lastModified = ? WHERE projectID = ?`;
        values = [presetID === undefined ? null : presetID, Date.now(), projectID];
        await connection.query(query, values);

        // Commit the transaction
        await connection.commit();
    }
    catch(err) {
        // In the event of an error, we roll back the transaction
        await connection.rollback();

        // We also recover previous S3 entries from the snapshot
        for(let i = 0 ; i < snapshot.length ; ++i) // TODO because if any of these put operations fail, the user's data is fucked
            await s3.putResource(process.env.S3_USER_BUCKET, snapshot.key, snapshot.content);
        // Let the route handler know there was an error
        throw err;
    }
    finally { // Make sure the connection is released
        connection.release();
    }
}

module.exports = {
    genS3ScriptKey,
    genS3PresetKey,
    genS3InternalConfigKey,
    createScript,
    updateScriptName,
    updateScriptContent,
    deleteScript,
    getScripts,
    getScriptContent,
    createProject,
    updateProjectName,
    deleteProject,
    getProjects,
    getProject,
    getPresets,
    getPresetContent,
    getConfigStages,
    saveConfigStages
};
