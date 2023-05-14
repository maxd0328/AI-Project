
export const KEYS = [
    'activation',
    'dataShape',
    'type',
    'poolingShape',
    'stride',
    'poolingType',
    'padding'
];

export const ENUMS = [
    'POOLING',
    'MAX'
];

export const ANNOTATIONS = [
    '@template',
    '@use'
];

export function toRegex(terms) {
    return `(${terms.join('|')})`;
}
