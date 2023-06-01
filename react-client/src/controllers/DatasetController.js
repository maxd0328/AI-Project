import { get, post, postForm } from './GeneralController';

export const fetchDatasets = async () => await get('/dataset/fetch');
export const fetchDetails = async datasetID => await get(`/dataset/fetch-details?id=${datasetID}`);
export const fetchDatasetFiles = async (datasetID, query, page) => await get(`/dataset/fetch-datafiles?id=${datasetID}&query=${query}&page=${page}`);

export const sendNewDataset = async name => (await post('/dataset/create', { name }, true)).datasetID;
export const sendNewFiles = async (datasetID, files, labelID, customLabel) => {
    const form = new FormData();
    form.append('datasetID', datasetID);
    form.append('labelID', labelID);
    form.append('customLabel', customLabel);
    for(let file of files)
        form.append('files', file);

    return await postForm('/dataset/upload', form, true);
};
export const sendDatasetName = async (datasetID, name) => await post('/dataset/rename', { datasetID, name });
export const sendNewLabel = async (datasetID, string) => await post('/dataset/add-label', { datasetID, string }, true);
export const sendEditLabel = async (datasetID, labelID, string) => await post('/dataset/edit-label', { datasetID, labelID, string });
export const sendDeleteLabel = async (datasetID, labelID) => await post('/dataset/delete-label', { datasetID, labelID });
export const sendUpdateDatafile = async (datasetID, datafileID, name, labelID, customLabel) =>
    await post('/dataset/update-datafile', { datasetID, datafileID, name, labelID, customLabel });
export const sendDeleteDatafile = async (datasetID, datafileID) => await post('/dataset/delete-datafile', { datasetID, datafileID });
export const sendDeleteDataset = async datasetID => await post('/dataset/delete', { datasetID });
