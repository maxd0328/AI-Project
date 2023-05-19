import tokenize from './Tokenizer';
import parse from './Parser';
import validate from './Validator';

export function matejScriptType(value) {
    if(value === null) return 'empty';
    if(Array.isArray(value)) return 'array';
    if(typeof value === 'number') return 'number';
    if(typeof value === 'string') return 'enum';
    if(typeof value === 'object') return 'layer';
    return 'error';
}

export function compile(source) {
    const annotations = [];
    const exportMessage = message => annotations.push(message);

    const tokens = tokenize(source, exportMessage);
    const output = parse(tokens, exportMessage);
    validate(output, exportMessage);

    return { output, annotations };
}

export default compile;
