import { get, post } from './GeneralController';

export const fetchProjects = async () => await get('/bucket/fetch-projects');

export const sendNewProject = async (name, type, presetID) => (await post('/bucket/create-project', { name, type, presetID }, true)).projectID;

export async function logout() {
    const response = await fetch('/user/logout');

    if(response.redirected)
        window.location.href = response.url;
}
