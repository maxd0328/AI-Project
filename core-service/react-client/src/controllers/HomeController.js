
export async function fetchProjects() {
    const response = await fetch('/bucket/fetch-projects');

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function sendNewProject(name, type) {
    const response = await fetch('/bucket/create-project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, type })
    });

    if(response.status !== 201)
        throw new Error('BAD_REQUEST');
    const data = await response.json();
    return data.projectID;
}

export async function logout() {
    const response = await fetch('/user/logout');

    if(response.redirected)
        window.location.href = response.url;
}
