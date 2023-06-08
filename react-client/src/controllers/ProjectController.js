import { get, post, put, _delete } from './GeneralController';

export const fetchProject = async projectID => await get(`/bucket/projects/${projectID}`);
export const fetchPresets = async () => await get('/bucket/presets');
export const fetchPresetContent = async presetID => (await get(`/bucket/presets/${presetID}`)).content;
export const fetchStages = async projectID => await get(`/bucket/projects/${projectID}/pipeline`);

export const sendProjectName = async (projectID, name) => await put(`/bucket/projects/${projectID}`, { name });
export const sendDeleteProject = async projectID => await _delete(`/bucket/projects/${projectID}`);
export const saveStages = async (projectID, presetID, stages) => await put(`/bucket/projects/${projectID}/pipeline`, { presetID, stages });

export const fetchLinkedDatasets = async projectID => await get(`/bucket/fetch-linked-datasets?id=${projectID}`);
export const sendDatasetLink = async (projectID, datasetID) => await post(`/bucket/projects/${projectID}/datasets/${datasetID}`);
export const sendDatasetUnlink = async (projectID, datasetID) => await _delete(`/bucket/projects/${projectID}/datasets/${datasetID}`);
