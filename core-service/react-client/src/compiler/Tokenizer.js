import * as Definitions from './Definitions';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-@';
const SYMBOLIC = '={},()';
const WHITESPACE = ' \t\n\r';
const COMMENTS = '#';

function scanLine(line, startingIndex, lineNo, exportMessage) {
    let begin = startingIndex;
    let length = 0;
    while(begin < line.length) {
        if(ALPHANUMERIC.includes(line[begin])) {
            do length++;
            while (begin + length < line.length && ALPHANUMERIC.includes(line[begin + length]));
            break;
        }
        else if(SYMBOLIC.includes(line[begin])) {
            length++;
            break;
        }
        else if(WHITESPACE.includes(line[begin])) {
            begin++;
        }
        else if(COMMENTS.includes(line[begin])) {
            throw 'comment';
        }
        else {
            exportMessage({
                type: 'warning',
                message: `Usage of disallowed character '${line[begin]}'`,
                row: lineNo,
                col: startingIndex + begin + 1
            });
            begin++;
        }
    }

    return {
        advance: begin - startingIndex,
        token: line.substring(begin, begin + length)
    };
}

function classifyToken(token, exportMessage) {
    let family;
    if(new RegExp('^' + Definitions.toRegex(Definitions.KEYS) + '$').test(token.value)) family = 'key';
    else if(new RegExp('^' + Definitions.toRegex(Definitions.ENUMS) + '$').test(token.value)) family = 'enum';
    else if(new RegExp('^' + Definitions.toRegex(Definitions.ANNOTATIONS) + '$').test(token.value)) family = 'annotation';
    else if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(token.value)) family = 'identifier';
    else if(/^[={},()]$/.test(token.value)) family = `operator<${token.value}>`;
    else if(/^-?(\d+\.?|\d*\.\d+)$/.test(token.value)) family = 'numeric';
    else {
        exportMessage({
            type: 'warning',
            message: `Unrecognized token '${token.value}'`,
            row: token.row,
            col: token.col
        });
        family = 'error';
    }

    token.family = family;
}

function tokenize(source, exportMessage) {
    const lines = source.split('\n');
    let tokens = [];

    for(let row = 1 ; row <= lines.length ; ++row) {
        let line = lines[row - 1];
        let col = 0;
        let result;

        do {
            try {
                result = scanLine(line, col, row, exportMessage);
                col += result.advance;
            }
            catch(err) {
                if(err === 'comment')
                    break;
                else throw err;
            }

            if(result.token.length > 0) {
                let token = {
                    value: result.token,
                    row: row,
                    col: col + 1
                };
                classifyToken(token, exportMessage);
                tokens.push(token);

                col += result.token.length;
            }
        }
        while(result.token.length > 0);

        tokens.push({
            family: 'newline',
            value: 'newline',
            row: row,
            col: line.length
        });
    }

    tokens.push({
        family: 'end-of-stream',
        value: '',
        row: lines.length,
        col: lines[lines.length - 1].length
    });

    return tokens;
}

export default tokenize;
