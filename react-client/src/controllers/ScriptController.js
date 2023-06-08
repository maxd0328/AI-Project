import { get, post, put, _delete } from './GeneralController';

export const fetchScripts = async () => await get('/bucket/scripts');
export const fetchScriptContent = async scriptID => (await get(`/bucket/scripts/${scriptID}`)).content;

export const sendNewScript = async (name, content) => (await post('/bucket/scripts', { name, content })).scriptID;
export const sendScriptName = async (scriptID, name) => await put(`/bucket/scripts/${scriptID}`, { name });
export const sendScriptContent = async (scriptID, content) => await put(`/bucket/scripts/${scriptID}`, { content });
export const sendDeleteScript = async scriptID => await _delete(`/bucket/scripts/${scriptID}`);
