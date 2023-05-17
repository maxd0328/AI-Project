import tokenize from './Tokenizer';
import parse from './Parser';
import validate from './Validator';

function compile(source) {
    const annotations = [];
    const exportMessage = message => annotations.push(message);

    const tokens = tokenize(source, exportMessage);
    const output = parse(tokens, exportMessage);
    validate(output, exportMessage);

    console.log(JSON.stringify(output, null, 2));

    return { output, annotations };
}

export default compile;
