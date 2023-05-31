
export async function fetchDatasets() {
    const response = await fetch('/dataset/fetch');

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function fetchDetails(datasetID) {
    const response = await fetch(`/dataset/fetch-details?id=${datasetID}`);

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

async function updateDataset(route, body, results) {
    const response = await fetch(`/dataset/${route}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body
    });

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    if(results)
        return await response.json();
}

export const sendDatasetName = async (datasetID, name) => updateDataset('rename', { datasetID, name });
export const sendNewLabel = async (datasetID, string) => updateDataset('add-label', { datasetID, string }, true);
export const sendEditLabel = async (datasetID, labelID, string) => updateDataset('edit-label', { datasetID, labelID, string });
export const sendDeleteLabel = async (datasetID, labelID) => updateDataset('delete-label', { datasetID, labelID });
export const sendUpdateDatafile = async (datasetID, datafileID, name, labelID, customLabel) =>
    updateDataset('update-datafile', { datasetID, datafileID, name, labelID, customLabel });
export const sendDeleteDatafile = async (datasetID, datafileID) => updateDataset('delete-datafile', { datasetID, datafileID });

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
