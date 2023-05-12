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
            const query = `INSERT INTO scripts (userID, scriptID, name) VALUES (?, ?, ?)`;
            const values = [userID, scriptID, name];

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
    const query = `UPDATE scripts SET name = ? WHERE userID = ? AND scriptID = ?`;
    const values = [name, userID, scriptID];

    await db.query(query, values);
}

async function updateScriptContent(userID, scriptID, content) {
    await s3.putResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID), content);
}

async function deleteScript(userID, scriptID) {
    const query = `DELETE FROM scripts WHERE userID = ? AND scriptID = ?`;
    const values = [userID, scriptID];

    await db.query(query, values);

    await s3.deleteResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID));
}

async function getScripts(userID) {
    const query = `SELECT scriptID, name FROM scripts WHERE userID = ?`;
    const values = [userID];

    const [rows] = await db.query(query, values);
    return rows;
}

async function getScriptContent(userID, scriptID) {
    return await s3.getResource(process.env.S3_USER_BUCKET, genS3ScriptKey(userID, scriptID));
}

module.exports = {
    genS3ScriptKey,
    createScript,
    updateScriptName,
    updateScriptContent,
    deleteScript,
    getScripts,
    getScriptContent
};
