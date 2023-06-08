import { get, post, postForm, put, _delete } from './GeneralController';

export const fetchDatasets = async () => await get('/datasets');
export const fetchDetails = async datasetID => await get(`/datasets/${datasetID}`);
export const fetchDatasetFiles = async (datasetID, query, page) => await get(`/datasets/${datasetID}/files?query=${query}&page=${page}`);

export const sendNewDataset = async name => (await post('/datasets', { name })).datasetID;
export const sendNewFiles = async (datasetID, files, labelID, customLabel) => {
    const form = new FormData();
    form.append('labelID', labelID);
    form.append('customLabel', customLabel);
    for(let file of files)
        form.append('files', file);

    return await postForm(`/datasets/${datasetID}/files`, form, true);
};
export const sendDatasetName = async (datasetID, name) => await put(`/datasets/${datasetID}`, { name });
export const sendNewLabel = async (datasetID, string) => await post(`/datasets/${datasetID}/labels`, { string });
export const sendEditLabel = async (datasetID, labelID, string) => await put(`/datasets/${datasetID}/labels/${labelID}`, { string });
export const sendDeleteLabel = async (datasetID, labelID) => await _delete(`/datasets/${datasetID}/labels/${labelID}`);
export const sendUpdateDatafile = async (datasetID, datafileID, name, labelID, customLabel) =>
    await put(`/datasets/${datasetID}/files/${datafileID}`, { name, labelID, customLabel });
export const sendDeleteDatafile = async (datasetID, datafileID) => await post(`/datasets/${datasetID}/files/${datafileID}`);
export const sendDeleteDataset = async datasetID => await _delete(`/datasets/${datasetID}`);
