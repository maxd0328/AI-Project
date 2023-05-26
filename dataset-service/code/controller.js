const db = require('../commons/database');
const s3 = require('../commons/s3');

// Unique keys for locating datafiles within the S3
const genS3DatafileKey = (datasetID, datafileID) => `datafile-${datasetID}-${datafileID}.matej`;

async function datasetExists(userID, datasetID, connection = db) {
    // Use an 'exists' query to see if a dataset with the matching userID is found
    // (SELECT 1 is because we don't actually care *what* we're selecting, just whether it exists)
    const query = `SELECT EXISTS(SELECT 1 FROM datasets WHERE datasetID = ? AND userID = ?) AS rowExists`;
    const values = [datasetID, userID];

    const [result] = await connection.query(query, values);
    return result[0].rowExists;
}

async function labelExists(datasetID, labelID, connection = db) {
    const query = `SELECT EXISTS(SELECT 1 FROM dataLabels WHERE datasetID = ? AND labelID = ?) AS rowExists`;
    const values = [datasetID, labelID];

    const [result] = await connection.query(query, values);
    return result[0].rowExists;
}

async function createDataset(userID, name) {
    // Pretty straightforward insertion into the datasets table
    const query = `INSERT INTO datasets (userID, name, nextLabel, nextFile, lastModified) values (?, ?, ?, ?, ?)`;
    const values = [userID, name, 1, 1, Date.now()];

    const [result] = await db.query(query, values);

    // Return the ID of the newly created dataset so the client can know
    return result.insertId;
}

async function uploadFiles(userID, datasetID, files, labelID, customLabel) {
    // Keep track of added keys, so we can roll back the S3 if necessary
    const addedKeys = [];

    // It's all one big transaction :)
    return await db.transaction(async connection => {
        // Ensure that the dataset exists and belongs to the user before we operate on it
        if(!await datasetExists(userID, datasetID, connection))
            throw new Error('No such dataset exists');

        // Find out if the files point to a custom label or not, and if not, let's ensure that the label exists in this dataset
        const usesCustomLabel = labelID === undefined || labelID === null;
        if(!usesCustomLabel && !await labelExists(datasetID, labelID, connection))
            throw new Error('No such label exists');

        // Get the next available datafile ID from the dataset (we store it in the database per dataset)
        // Note that 'FOR UPDATE' here places a lock on the next available datafile ID so that no other transactions can read
        // from it until we're done (because we're inserting those IDs and will update the next available pointer afterwards)
        let query = `SELECT nextFile FROM datasets WHERE datasetID = ? FOR UPDATE`;
        let values = [datasetID];

        const [nextFileResult] = await connection.query(query, values);
        const nextFile = nextFileResult[0].nextFile;
        const fileIDs = [];

        for(let i = 0 ; i < files.length ; ++i) {
            // The ID of each file will be the next available index offset by its index in the add list
            const datafileID = nextFile + i;
            query = `INSERT INTO datafiles (datasetID, datafileID, filename, labelID, customLabel, dateAdded) VALUES (?, ?, ?, ?, ?, ?)`;
            values = [datasetID, datafileID, files[i].originalname, !usesCustomLabel ? labelID : null, usesCustomLabel ? customLabel || '' : null, Date.now()];

            await connection.query(query, values);

            // Store the contents of the file in S3 and push the key to the addedKeys list, so it can be deleted from S3 if the transaction fails
            const s3Key = genS3DatafileKey(datasetID, datafileID);
            await s3.putResource(process.env.S3_USER_BUCKET, s3Key, files[i].buffer);
            addedKeys.push(s3Key);

            // Store new file ID in array of file IDs to return
            fileIDs.push(datafileID);
        }

        // Now we update the next available datafileID pointer and lastModified info for the dataset
        // Note that the lock on the available datafileID pointer isn't released until the transaction commits (so after this callback)
        query = `UPDATE datasets SET nextFile = ?, lastModified = ? WHERE datasetID = ?`;
        values = [nextFile + files.length, Date.now()];

        await connection.query(query, values);

        return fileIDs;
    }, async err => {
        // In the event of an error, the transaction rolls back, and we ensure all added S3 keys are removed
        for(let addedKey of addedKeys)
            await s3.deleteResource(process.env.S3_USER_BUCKET, addedKey);
    });
}

async function updateDataset(userID, datasetID, name, addLabels, editLabels, deleteLabels, editFiles, deleteFiles) {
    // Keep track of all deleted S3 keys, this is so that if we roll back we can put everything back in the S3
    const deletedS3 = [];

    return await db.transaction(async connection => {
        // Ensure that the dataset exists and is owned by the user
        if(!await datasetExists(userID, datasetID, connection))
            throw new Error('No such dataset exists');

        // We store all new label IDs to return to the user
        const labelIDs = [];

        // If we want to add labels, then we do something very similar to uploading images
        if(addLabels.length > 0) {
            // Get the next available label ID (just like datafile ID) and place a lock on it
            let query = `SELECT nextLabel FROM datasets WHERE datasetID = ? FOR UPDATE`;
            let values = [datasetID];

            const [nextLabelResult] = await connection.query(query, values);
            const nextLabel = nextLabelResult[0].nextLabel;

            // For every new label we want to add, we insert it into the table with IDs starting at the acquired next available one
            for(let i = 0 ; i < addLabels.length ; ++i) {
                query = `INSERT INTO dataLabels (datasetID, labelID, string) VALUES (?, ?, ?)`;
                values = [datasetID, nextLabel + i, addLabels[i].value];

                await connection.query(query, values);
                labelIDs.push(nextLabel + i);
            }

            // Now we write back the new next available labelID (note that the lock still isn't released until we commit the transaction)
            query = `UPDATE datasets SET nextlabel = ? WHERE datasetID = ?`;
            values = [nextLabel + addLabels.length];

            await connection.query(query, values);
        }

        // For these next few blocks, we just handle each case for editing the dataset
        // Firstly, we apply all label edits
        for(let editLabel of editLabels) {
            // For each label edit, find the row containing its ID and give the new desired value
            const query = `UPDATE dataLabels SET string = ? WHERE datasetID = ? AND labelID = ?`;
            const values = [editLabel.value, datasetID, editLabel.labelID];

            await connection.query(query, values);
        }

        // Next, we apply all label deletions
        for(let deleteLabel of deleteLabels) {
            // For each one, find the row containing that label ID and delete it
            const query = `DELETE FROM dataLabels WHERE datasetID = ? AND labelID = ?`;
            const values = [datasetID, deleteLabel.labelID];

            await connection.query(query, values);
        }

        // Next, we apply all file edits
        for(let editFile of editFiles) {
            // Find out if the desired file configuration involves a custom label, and if not we make sure that label exists
            const usesCustomLabel = editFile.labelID === undefined || editFile.labelID === null;
            if(!usesCustomLabel && !await labelExists(datasetID, editFile.labelID, connection))
                throw new Error('No such label exists');

            // Now we just write the new configuration to the correct database row (including new filename and new label reference)
            const query = `UPDATE datafiles SET filename = ?, labelID = ?, customLabel = ? WHERE datasetID = ? AND datafileID = ?`;
            const values = [editFile.filename, !usesCustomLabel ? editFile.labelID : null,
                usesCustomLabel ? editFile.customLabel || '' : null, datasetID, editFile.datafileID];

            await connection.query(query, values);
        }

        // Finally, we apply all file deletions
        for(let deleteFile of deleteFiles) {
            // For each one, we find the row containing that datafile and delete the row
            const query = `DELETE FROM datafiles WHERE datasetID = ? AND datafileID = ?`;
            const values = [datasetID, deleteFile.datafileID];

            await connection.query(query, values);

            // Here, we locate the S3 key of this file and create a backup of it
            // We then delete the resource from S3 and store the backup in our deletedS3 buffer, so it can be restored if the transaction fails
            const s3Key = genS3DatafileKey(datasetID, deleteFile.datafileID);
            const backup = { key: s3Key, content: await s3.getResource(process.env.S3_USER_BUCKET, s3Key) };
            await s3.deleteResource(process.env.S3_USER_BUCKET, s3Key);
            deletedS3.push(backup);
        }

        // Set the new name of the dataset (if any) and update the lastModified field
        const query = `UPDATE datasets SET name = ?, lastModified = ? WHERE datasetID = ?`;
        const values = [name, Date.now()];

        await connection.query(query, values);

        return labelIDs;
    }, async err => {
        // If the transaction fails and rolls back, we go through every created S3 backup and restore it
        for(let backup of deletedS3)
            await s3.putResource(process.env.S3_USER_BUCKET, backup.key, backup.content);
    });
}

async function deleteDataset(userID, datasetID) {
    // Make sure to include the userID in this query so that the user can't delete a dataset they don't own
    const query = `DELETE FROM datasets WHERE datasetID = ? AND userID = ?`;
    const values = [datasetID, userID];

    const [result] = await db.query(query, values);

    // As with other deletions/updates like this, it's not necessary to do this because nothing goes wrong
    // otherwise, but why not let the user know they fucked up
    if(result.affectedRows === 0)
        throw new Error('No such dataset exists');
}

async function getDatasets(userID) {
    return await db.transaction(async connection => {
        // First we select all datasets that the user owns, ordered by last modified as always
        let query = `SELECT datasetID, name, lastModified FROM datasets WHERE userID = ? ORDER BY lastModified DESC`;
        let values = [userID];

        const [datasets] = await connection.query(query, values);

        // Next, we select all labels associated with datasets owned by the user
        query = `SELECT l.datasetID, l.labelID, l.string FROM dataLabels l JOIN datasets d ON l.datasetID = d.datasetID WHERE d.userID = ?`;
        values = [userID];

        const [labels] = await connection.query(query, values);

        // Now with all the data fetched, we create a map of dataset IDs to a list of all its labels
        const labelMap = {};
        for(let label of labels) {
            if(!labelMap[label.datasetID])
                labelMap[label.datasetID] = [];
            labelMap[label.datasetID].push({ labelID: label.labelID, value: label.string });
        }

        // Finally, for each dataset we add a property for its labels from the label map
        for(let dataset of datasets)
            dataset.labels = labelMap[dataset.datasetID] || [];

        return datasets;
    });
}

async function getFiles(userID, datasetID, searchQuery, page) {
    return await db.transaction(async connection => {
        // We define a constant page size, we can export this somewhere else later on, maybe as an environment variable
        const pageSize = 20;

        // Ensure that the dataset exists and is owned by the user
        if(!await datasetExists(userID, datasetID, connection))
            throw new Error('No such dataset exists');

        // Query to fetch all files matching the search query AND limited by page constraints (limit to page size, offset by page size * page number)
        const query = `SELECT datafileID, filename, labelID, customLabel FROM datafiles
                                                  WHERE datasetID = ? AND filename LIKE ?
                                                  ORDER BY dateAdded DESC
                                                  LIMIT ? OFFSET ?`;
        const values = [datasetID, '%' + searchQuery.trim() + '%', pageSize, page * pageSize];

        // Execute the query to get all file entries
        const [rows] = await connection.query(query, values);

        // For every row, we figure out where it's stored in S3 and generate a pre-signed URL (valid for the default amount of time, 1 hour at the
        // time of writing this comment) so that the user can view the image
        for(const row of rows)
            row.url = s3.getPresignedURL(process.env.S3_USER_BUCKET, genS3DatafileKey(datasetID, row.datafileID));
        return rows;
    });
}

module.exports = {
    genS3DatafileKey,
    datasetExists,
    createDataset,
    uploadFiles,
    updateDataset,
    deleteDataset,
    getDatasets,
    getFiles
};
