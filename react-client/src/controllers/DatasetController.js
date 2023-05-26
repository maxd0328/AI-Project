
export async function fetchDatasets() {
    return [{ datasetID: 1, name: 'Hello' }, { datasetID: 2, name: 'Another' }];
    const response = await fetch('/dataset/fetch');

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function fetchDatasetFiles(datasetID, query, page) {
    const response = await fetch(`/dataset/fetch-datafiles?id=${datasetID}&query=${query}&page=${page}`);

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

// TODO write request method to upload files using multipart/form

export async function sendNewDataset(name) {
    const response = await fetch('/dataset/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    });

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    const data = await response.json();
    return data.datasetID;
}

export async function sendNewFiles(datasetID, files, labelID, customLabel) {
    const form = new FormData();
    form.append('datasetID', datasetID);
    form.append('labelID', labelID);
    form.append('customLabel', customLabel);
    for(let file of files)
        form.append('files', file);

    const response = await fetch('/dataset/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        body: form
    });

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function sendDatasetChanges(datasetID, name, addLabels, editLabels,
                                         deleteLabels, editFiles, deleteFiles) {
    const response = await fetch('/dataset/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            datasetID,
            name,
            addLabels,
            editLabels,
            deleteLabels,
            editFiles,
            deleteFiles
        })
    });

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function sendDeleteDataset(datasetID) {
    const response = await fetch('/dataset/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ datasetID })
    });

    if(!response.ok)
        throw new Error('BAD_REQUEST');
}
