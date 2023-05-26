
export async function fetchProject(projectID) {
    const response = await fetch(`/bucket/fetch-project?id=${projectID}`);

    if(!response.ok)
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

    if(!response.ok)
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

    if(!response.ok)
        throw new Error('BAD_REQUEST');
}

export async function fetchPresets() {
    const response = await fetch('/bucket/fetch-presets');

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function fetchPresetContent(presetID) {
    const response = await fetch(`/bucket/preset-content?id=${presetID}`);

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function fetchStages(projectID) {
    const response = await fetch(`/bucket/fetch-pipeline?id=${projectID}`);

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function saveStages(projectID, presetID, stages) {
    const response = await fetch('/bucket/save-pipeline', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectID, presetID, stages })
    });

    if(!response.ok)
        throw new Error('BAD_REQUEST');
}
