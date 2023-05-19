
export async function fetchProject(projectID) {
    return { projectID: 1, name: 'My Project', type: 'cnn', presetID: 1 };
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
    return [{presetID: 1, name: 'Image Recognition', description: 'An example description'},
        {presetID: 2, name: 'Another One', description: 'Another example description'}];
    const response = await fetch('/bucket/fetch-presets');

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function fetchPresetContent(presetID) {
    return 'activation = RELU\n@show\nsafd = RELU\n@show\nlayer0 = {\n@show\ntype = 3\nactivation = RELU\n}';
    const response = await fetch(`/bucket/preset-content?id=${presetID}`);

    if(!response.ok)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function fetchStages(projectID) {
    return [{ name: 'My Stage', type: 'ext', scriptID: null }];
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
