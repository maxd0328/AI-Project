const db = require('../commons/database');
const s3 = require('../commons/s3');

const genS3ScriptKey = (userID, scriptID) => `script-${userID}-${scriptID}.matej`;

const genS3PresetKey = (presetID) => `preset-${presetID}.matej`;

async function createScript(userID, name, content) {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const query = `INSERT INTO scripts (userID, name, lastModified) VALUES (?, ?, ?)`;
        const values = [userID, name, Date.now()];
        let scriptID;

        try {
            const [result] = await connection.query(query, values);
            scriptID = result.insertId;
        }
        catch(err) {
            await connection.rollback();
            throw err;
        }

        try {
            await s3.putResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID), content);
            await connection.commit();
        }
        catch(err) {
            await connection.rollback();
            throw err;
        }

        return scriptID;
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

async function createProject(userID, name, type) {
    const query = `INSERT INTO projects (userID, name, type, lastModified) VALUES (?, ?, ?, ?)`;
    const values = [userID, name, type, Date.now()];

    const [result] = await db.query(query, values);

    return result.insertId;
}

async function updateProjectName(userID, projectID, name) {
    const query = `UPDATE projects SET name = ?, lastModified = ? WHERE userID = ? AND projectID = ?`;
    const values = [name, Date.now(), userID, projectID];

    const [result] = await db.query(query, values);
    if(result.affectedRows === 0)
        throw new Error('No such project exists');
}

async function deleteProject(userID, projectID) {
    const query = `DELETE FROM projects WHERE userID = ? AND projectID = ?`;
    const values = [userID, projectID];

    const [result] = await db.query(query, values);
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
    const query = `SELECT name, type FROM projects WHERE userID = ? AND projectID = ?`;
    const values = [userID, projectID];

    const [rows] = await db.query(query, values);
    if(rows.length > 0)
        return rows[0];
    else throw new Error(`Project with ID ${projectID} does not exist`);
}

async function projectExists(userID, projectID) {
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
    const query = `SELECT EXISTS(SELECT 1 FROM presets WHERE presetID = ?) AS rowExists`;
    const values = [presetID];

    const [rows] = await db.query(query, values);
    if(!rows[0].rowExists)
        throw new Error('No such preset exists');

    return await s3.getResource(process.env.S3_USER_BUCKET, genS3PresetKey(presetID));
}

async function getConfigStages(userID, projectID) {
    if(!await projectExists(userID, projectID))
        throw new Error('No such project exists');

    const query = `SELECT c.configID, c.name, c.type, c.scriptID FROM configs c 
                    INNER JOIN projects p ON p.projectID = c.projectID
                    WHERE c.projectID = ? AND p.userID = ?
                    ORDER BY c.index ASC`;
    const values = [projectID, userID];

    const [rows] = await db.query(query, values);
    return rows;
}

async function saveConfigStages(userID, projectID, stages) {
    const connection = await db.getConnection();

    // TODO perhaps switch to a more efficient algorithm in the future
    // To adhere to stupid MySQL constraints mid-transaction, all configs are deleted and re-inserted
    try {
        await connection.beginTransaction();

        if(!await projectExists(userID, projectID))
            throw new Error('No such project exists');

        let query = `DELETE FROM configs WHERE projectID = ?`;
        let values = [projectID];

        await db.query(query, values);

        for(let i = 0 ; i < stages.length ; ++i) {
            query = `INSERT INTO configs (projectID, name, index, type, scriptID) VALUES (?, ?, ?, ?, ?)`;
            values = [projectID, i, stages[i].name, stages[i].type, stages[i].scriptID];

            await db.query(query, values);
        }
    }
    catch(err) {
        await connection.rollback();
        throw err;
    }
    finally {
        connection.release();
    }
}

module.exports = {
    genS3ScriptKey,
    genS3PresetKey,
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
