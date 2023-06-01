import {get, post} from './GeneralController';

export const fetchProject = async projectID => await get(`/bucket/fetch-project?id=${projectID}`);
export const fetchPresets = async () => await get('/bucket/fetch-presets');
export const fetchPresetContent = async presetID => await get(`/bucket/preset-content?id=${presetID}`);
export const fetchStages = async projectID => await get(`/bucket/fetch-pipeline?id=${projectID}`);

export const sendProjectName = async (projectID, name) => await post('/bucket/rename-project', { projectID, name });
export const sendDeleteProject = async projectID => await post('/bucket/delete-project', { projectID });
export const saveStages = async (projectID, presetID, stages) => await post('/bucket/save-pipeline', { projectID, presetID, stages });

export const fetchLinkedDatasets = async projectID => await get(`/bucket/fetch-linked-datasets?id=${projectID}`);
export const sendDatasetLink = async (projectID, datasetID) => await post('/bucket/link-dataset', { projectID, datasetID });
export const sendDatasetUnlink = async (projectID, datasetID) => await post('/bucket/unlink-dataset', { projectID, datasetID });
