import tokenize from './Tokenizer';
import parse from './Parser';

function exportMessage(details) {
    console.log(`${details.type}: ${details.message}`);
}

function compile(source) {
    const tokens = tokenize(source, exportMessage);
    const result = parse(tokens, exportMessage);

    //console.log(JSON.stringify(tokens));
    console.log(JSON.stringify(result));
}

export default compile;
