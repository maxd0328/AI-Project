
export function getProjectType(code) {
    switch(code) {
        case 'cnn':
            return { name: 'Convolutional Neural Network', image: '/console/images/cnn.png', defaultPreset: null };
        default:
            return { name: 'Coming soon!', image: '/console/images/coming-soon.png', defaultPreset: null };
    }
}

const timeUnits = [
    { name: 'minute', ms: 1000 * 60 },
    { name: 'hour', ms: 1000 * 60 * 60 },
    { name: 'day', ms: 1000 * 60 * 60 * 24 },
    { name: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
    { name: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
    { name: 'year', ms: 1000 * 60 * 60 * 24 * 365 }
];

export function getRelativeTimeString(timestamp) {
    const diff = Date.now() - timestamp;
    let units = timeUnits;

    if(diff < units[0].ms)
        return 'Just now';
    for(let i = 0 ; i < units.length ; ++i) {
        if(i === units.length - 1 || diff < units[i + 1].ms) {
            let qty = Math.floor(diff / units[i].ms);
            return `${qty} ${units[i].name}${qty > 1 ? 's' : ''} ago`;
        }
    }
}

const sizeUnits = [
    { name: 'B', bytes: 1 },
    { name: 'KB', bytes: 1_000 },
    { name: 'MB', bytes: 1_000_000 },
    { name: 'GB', bytes: 1_000_000_000 },
    { name: 'TB', bytes: 1_000_000_000_000 }
];

export function getFileSizeString(sizeBytes) {
    let units = sizeUnits;

    for(let i = 0 ; i < units.length ; ++i) {
        if(i === units.length - 1 || sizeBytes < units[i + 1].bytes) {
            let qty = Math.floor(sizeBytes / units[i].bytes);
            return `${qty} ${units[i].name}`;
        }
    }
}
