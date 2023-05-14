
export async function fetchProject(projectID) {
    const response = await fetch(`/bucket/fetch-project?id=${projectID}`);

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function sendProjectName(projectID, name) {
    const response = await fetch('/bucket/rename-project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectID, name })
    });

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
}

export async function sendDeleteProject(projectID) {
    const response = await fetch('/bucket/delete-project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectID })
    });

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
}
