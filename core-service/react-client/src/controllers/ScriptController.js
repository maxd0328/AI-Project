
export async function fetchScripts() {
    const response = await fetch('/bucket/fetch-scripts');

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
    return await response.json();
}

export async function fetchScriptContent(scriptID) {
    const response = await fetch(`/bucket/script-content?id=${scriptID}`);

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
    const data = await response.json();
    return data.content;
}

export async function sendNewScript(name, content) {
    const response = await fetch('/bucket/create-script', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, content })
    });

    if(response.status !== 201)
        throw new Error('BAD_REQUEST');
    const data = await response.json();
    return data.scriptID;
}

export async function sendScriptName(scriptID, name) {
    const response = await fetch('/bucket/rename-script', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scriptID, name })
    });

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
}

export async function sendScriptContent(scriptID, content) {
    const response = await fetch('/bucket/save-script', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scriptID, content })
    });

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
}

export async function sendDeleteScript(scriptID) {
    const response = await fetch('/bucket/delete-script', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scriptID })
    });

    if(response.status !== 200)
        throw new Error('BAD_REQUEST');
}