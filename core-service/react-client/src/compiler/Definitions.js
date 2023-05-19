
export const KEYS = [
    {
        name: 'dataShape',
        type: 'array',
        length: 4,
        scopes: ['global']
    },
    {
        name: 'regression',
        type: 'enum',
        values: ['REGRESSION', 'CLASSIFICATION'],
        scopes: ['global']
    },
    {
        name: 'activation',
        type: 'enum',
        values: ['RELU', 'TANH', 'SIGMOID', 'CUBE', 'SOFTMAX', 'RRELU', 'ELU', 'HARDTANH', 'HARDSIGMOID',
            'IDENTITY', 'LEAKYRELU', 'RATIONALTANH', 'RECTIFIEDTANH', 'SELU', 'SOFTPLUS', 'SOFTSIGN'],
        scopes: ['global', 'layer']
    },
    {
        name: 'updater',
        type: 'enum',
        values: ['ADAM', 'ADAGRAD', 'ADADELTA', 'ADAMAX', 'NESTEROVS', 'RMSPROP', 'SGD', 'NONE'],
        scopes: ['global']
    },
    {
        name: 'weightInit',
        type: 'enum',
        values: ['XAVIER', 'RELU', 'DISTRIBUTION', 'RELU_UNIFORM', 'SIGMOID_UNIFORM',
            'UNIFORM', 'XAVIER_FAN_IN', 'XAVIER_LEGACY', 'XAVIER_UNIFORM', 'ZERO'],
        scopes: ['global']
    },
    {
        name: 'learningRate',
        type: 'number',
        scopes: ['global']
    },
    {
        name: 'useRegulariser',
        type: 'enum',
        values: ['L1', 'L2', 'DROPOUT'],
        scopes: ['global', 'layer']
    },
    {
        name: 'regularisationRateL1',
        type: 'number',
        scopes: ['global', 'layer']
    },
    {
        name: 'regularisationRateL2',
        type: 'number',
        scopes: ['global', 'layer']
    },
    {
        name: 'type',
        type: 'enum',
        values: ['CONVOLUTIONAL', 'DENSE', 'POOLING', 'OUTPUT'],
        scopes: ['layer']
    },
    {
        name: 'filterShape',
        type: 'array',
        length: 2,
        scopes: ['layer']
    },
    {
        name: 'filterChannels',
        type: 'number',
        scopes: ['layer']
    },
    {
        name: 'stride',
        type: 'array',
        length: 2,
        scopes: ['layer']
    },
    {
        name: 'padding',
        type: 'array',
        length: 2,
        scopes: ['layer']
    },
    {
        name: 'poolingShape',
        type: 'array',
        length: 2,
        scopes: ['layer']
    },
    {
        name: 'poolingType',
        type: 'enum',
        values: ['MAX'],
        scopes: ['layer']
    },
    {
        name: 'outputs',
        type: 'number',
        scopes: ['layer']
    },
    {
        name: 'lossFunction',
        type: 'enum',
        values: ['MSE', 'NEGATIVELOGLIKELYHOOD'],
        scopes: ['layer']
    },
    {
        name: 'convolutionMode',
        type: 'enum',
        values: ['SAME', 'TRUNCATED'],
        scopes: ['layer']
    },
    {
        name: 'dropoutRate',
        type: 'number',
        scopes: ['local']
    }
];

export const ANNOTATIONS = [
    '@template',
    '@use',
    '@show'
];

export function getKeyRegex() {
    return `(${KEYS.map(key => key.name).join('|')})`;
}

export function getEnumRegex() {
    return `(${KEYS.filter(key => key.type === 'enum').map(key => key.values.join('|')).join('|')})`;
}

export function getAnnotationRegex() {
    return `(${ANNOTATIONS.join('|')})`;
}
