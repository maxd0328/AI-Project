
export async function fetchProjects() {
    const response = await fetch('/bucket/fetch-projects');

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function logout() {
    const response = await fetch('/user/logout');

    if(response.redirected)
        window.location.href = response.url;
}
