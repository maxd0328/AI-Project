import { get, post } from './GeneralController';

export const fetchProjects = async () => await get('/bucket/projects');

export const sendNewProject = async (name, type, presetID) => (await post('/bucket/projects', { name, type, presetID })).projectID;

export async function logout() {
    const response = await fetch('/user/logout', { method: 'POST' });

    if(response.redirected)
        window.location.href = response.url;
}
