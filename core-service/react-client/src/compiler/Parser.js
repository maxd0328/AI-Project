
function parseBlock(stream, dest, after = 'operator<}>') {
    let annotations = {};
    while(!matchesLookAhead(stream, after)) {
        if(matches(stream, 'newline'))
            continue;
        else {
            try {
                if(matchesLookAhead(stream, 'annotation'))
                    parseAnnotation(stream, annotations);
                else {
                    parseStatement(stream, dest, annotations);
                    annotations = {};
                }
                match(stream, 'newline');
            }
            catch(err) {
                panic(err, stream, 'newline');
            }
        }
    }

    // Special case: annotations without a corresponding definition
    for(let key in annotations)
        if(annotations.hasOwnProperty(key) && key !== 'sourceMap' && key !== 'annotations')
            stream.exportMessage({
                type: 'warning',
                message: `Annotation '@${key}' is not associated with a definition. Line will be ignored`,
                row: annotations.sourceMap[key].row,
                col: annotations.sourceMap[key].col
            });
}

function parseAnnotation(stream, dest) {
    let key = match(stream, 'annotation');
    key.value = key.value.substring(1);

    let params = [];
    if(matches(stream, 'operator<(>')) {
        do params.push(match(stream, 'identifier').value);
        while(matches(stream, 'operator<,>'));
        match(stream, 'operator<)>');
    }
    put(stream, dest, key, params, null);
}

function parseStatement(stream, dest, annotations) {
    let key = matches(stream, 'key');
    if(!key)
        key = match(stream, 'identifier');

    match(stream, 'operator<=>');

    if(matchesLookAhead(stream, 'number')) {
        let value = [parseFloat(match(stream, 'number').value)];
        while(matches(stream, 'operator<,>'))
            value.push(parseFloat(match(stream, 'number').value));

        if(value.length === 1)
            value = value[0];
        put(stream, dest, key, value, annotations);
    }
    else if(matchesLookAhead(stream, 'enum')) {
        put(stream, dest, key, match(stream, 'enum').value, annotations);
    }
    else if(matchesLookAhead(stream, 'operator<{>')) {
        match(stream, 'operator<{>');
        try {
            match(stream, 'newline');
        }
        catch(err) {
            panic(err, stream, 'newline');
        }

        let newDest = {};
        put(stream, dest, key, newDest, annotations);
        parseBlock(stream, newDest);

        match(stream, 'operator<}>');
    }
    else backtrack(stream, 'value');
}

/* Matching utilities */
function match(stream, family) {
    let token = matches(stream, family);
    if(token) return token;
    else {
        token = stream.tokens[stream.position];

        let familyLegible = family.replace(/operator<(.*)>/, '\'$1\'');
        let tokenLegible = token.family === 'end-of-stream' || token.family === 'newline' ? token.family : `token '${token.value}'`;
        stream.exportMessage({
            type: 'warning',
            message: `Unexpected ${tokenLegible}, expected ${familyLegible}. Line may be ignored`,
            row: token.row,
            col: token.col
        });
        throw 'panic';
    }
}

function matches(stream, family) {
    let token = matchesLookAhead(stream, family);
    if(token) {
        stream.position++;
        return token;
    }
    else return null;
}

function matchesLookAhead(stream, family) {
    let token = stream.tokens[stream.position];
    if(token.family === family)
        return token;
    else return null;
}

function backtrack(stream, ruleName) {
    let token = stream.tokens[stream.position];
    let tokenLegible = token.family === 'end-of-stream' || token.family === 'newline' ? token.family : `token '${token.value}'`;
    stream.exportMessage({
        type: 'warning',
        message: `Unexpected ${tokenLegible}, expected ${ruleName}. Line may be ignored`,
        row: token.row,
        col: token.col
    });
    throw 'panic';
}

function panic(err, stream, stop) {
    if(err !== 'panic')
        throw err;
    let token = stream.tokens[stream.position], scopes = 0;
    while((token.family !== stop || scopes) && token.family !== 'end-of-stream') {
        if(token.family === 'operator<{>')
            scopes++;
        else if(scopes && token.family === 'operator<}>')
            scopes--;

        stream.position++;
        token = stream.tokens[stream.position];
    }
    if(!matches(stream, stop))
        throw 'abort';
}

function put(stream, dest, key, value, annotations) {
    if(key.value === 'sourceMap' || key.value === 'annotations') {
        stream.exportMessage({
            type: 'warning',
            message: `'${key.value}' is a reserved identifier and may not be used. Line will be ignored`,
            row: key.row,
            col: key.col
        });
        return;
    }

    if(dest[`${key.value}`])
        stream.exportMessage({
            type: 'warning',
            message: `Duplicate definition of key '${key}'`,
            row: key.row,
            col: key.col
        });
    dest[`${key.value}`] = value;

    if(dest.sourceMap === undefined)
        dest.sourceMap = {};
    dest.sourceMap[`${key.value}`] = { row: key.row, col: key.col };

    if(annotations !== null) {
        if(dest.annotations === undefined)
            dest.annotations = {};
        dest.annotations[`${key.value}`] = annotations;
    }
}


/* Entry point */
function parse(tokens, exportMessage) {
    let stream = {
        tokens: tokens,
        position: 0,
        exportMessage
    };
    let dest = {};

    try {
        parseBlock(stream, dest, 'end-of-stream');
    }
    catch(err) {
        if(err !== 'abort')
            throw err;
    }

    return dest;
}

export default parse;
