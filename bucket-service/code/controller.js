const db = require('../commons/database');
const s3 = require('../commons/s3');

const genS3ScriptKey = (userID, scriptID) => `script-${userID}-${scriptID}.matej`;

async function createScript(userID, name, content) {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        let scriptID;
        for(;;) { // Loop infinitely until a unique ID is found, the loop repeats if ER_DUP_ENTRY occurs
            scriptID = Date.now(); // use POSIX timestamp as script ID
            const query = `INSERT INTO scripts (userID, scriptID, name, lastModified) VALUES (?, ?, ?, ?)`;
            const values = [userID, scriptID, name, scriptID];

            try {
                await connection.query(query, values);
                break;
            }
            catch(err) {
                if(err.code === 'ER_DUP_ENTRY')
                    await new Promise(resolve => setTimeout(resolve, 10));
                else {
                    await connection.rollback();
                    throw err;
                }
            }
        }

        try {
            await s3.putResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID), content);
        }
        catch(err) {
            await connection.rollback();
            throw err;
        }

        await connection.commit();
        return scriptID;
    }
    finally {
        connection.release();
    }
}

async function updateScriptName(userID, scriptID, name) {
    const query = `UPDATE scripts SET name = ?, lastModified = ? WHERE userID = ? AND scriptID = ?`;
    const values = [name, Date.now(), userID, scriptID];

    await db.query(query, values);
}

async function updateScriptContent(userID, scriptID, content) {
    const query = `UPDATE scripts SET lastModified = ? WHERE userID = ? AND scriptID = ?`;
    const values = [Date.now(), userID, scriptID];

    await db.query(query, values);
    await s3.putResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID), content);
}

async function deleteScript(userID, scriptID) {
    const query = `DELETE FROM scripts WHERE userID = ? AND scriptID = ?`;
    const values = [userID, scriptID];

    await db.query(query, values);

    await s3.deleteResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID));
}

async function getScripts(userID) {
    const query = `SELECT scriptID, name, lastModified FROM scripts WHERE userID = ? ORDER BY lastModified DESC`;
    const values = [userID];

    const [rows] = await db.query(query, values);
    return rows;
}

async function getScriptContent(userID, scriptID) {
    return await s3.getResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID));
}

async function createProject(userID, name, type) {
    let projectID;
    for(;;) { // Same concept as creating scripts, refer to createScript(...)
        projectID = Date.now();
        const query = `INSERT INTO projects (userID, projectID, name, type, lastModified) VALUES (?, ?, ?, ?, ?)`;
        const values = [userID, projectID, name, type, projectID];

        try {
            await db.query(query, values);
            break;
        }
        catch(err) {
            if(err.code === 'ER_DUP_ENTRY')
                await new Promise(resolve => setTimeout(resolve, 10));
            else throw err;
        }
    }

    return projectID;
}

async function updateProjectName(userID, projectID, name) {
    const query = `UPDATE projects SET name = ?, lastModified = ? WHERE userID = ? AND projectID = ?`;
    const values = [name, Date.now(), userID, projectID];

    await db.query(query, values);
}

async function deleteProject(userID, projectID) {
    const query = `DELETE FROM projects WHERE userID = ? AND projectID = ?`;
    const values = [userID, projectID];

    await db.query(query, values);
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

module.exports = {
    genS3ScriptKey,
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
    getProject
};
