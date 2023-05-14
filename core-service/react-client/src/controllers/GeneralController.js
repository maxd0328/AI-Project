
export function getProjectType(code) {
    switch(code) {
        case 'cnn':
            return { name: 'Convolutional Neural Network', image: '/console/images/cnn.png' };
        default:
            return { name: 'Coming soon!', image: '/console/images/coming-soon.png' };
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
