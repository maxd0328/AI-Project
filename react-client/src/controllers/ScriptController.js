import { get, post } from './GeneralController';

export const fetchScripts = async () => await get('/bucket/fetch-scripts');
export const fetchScriptContent = async scriptID => (await get(`/bucket/script-content?id=${scriptID}`)).content;

export const sendNewScript = async (name, content) => (await post('/bucket/create-script', { name, content }, true)).scriptID;
export const sendScriptName = async (scriptID, name) => await post('/bucket/rename-script', { scriptID, name });
export const sendScriptContent = async (scriptID, content) => await post('/bucket/save-script', { scriptID, content });
export const sendDeleteScript = async scriptID => await post('/bucket/delete-script', { scriptID });
