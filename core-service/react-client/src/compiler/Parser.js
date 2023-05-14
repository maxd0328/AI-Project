
function parseBlock(stream, dest, after = 'operator<}>') {
    while(!matchesLookAhead(stream, after)) {
        if(matches(stream, 'newline'))
            continue;
        else {
            try {
                if(matchesLookAhead(stream, 'annotation'))
                    parseAnnotation(stream, dest);
                else
                    parseStatement(stream, dest);
                match(stream, 'newline');
            }
            catch(err) {
                panic(err, stream, 'newline');
            }
        }
    }
}

function parseAnnotation(stream, dest) {
    let key = match(stream, 'annotation');

    let params = [];
    if(matches(stream, 'operator<(>')) {
        do params.push(match(stream, 'identifier').value);
        while(matches(stream, 'operator<,>'));
        match(stream, 'operator<)>');
    }
    put(stream, dest, key, params);
}

function parseStatement(stream, dest) {
    let key = matches(stream, 'key');
    if(!key)
        key = match(stream, 'identifier');

    match(stream, 'operator<=>');

    if(matchesLookAhead(stream, 'numeric')) {
        let value = [parseFloat(match(stream, 'numeric').value)];
        while(matches(stream, 'operator<,>'))
            value.push(parseFloat(match(stream, 'numeric').value));

        if(value.length === 1)
            value = value[0];
        put(stream, dest, key, value);
    }
    else if(matchesLookAhead(stream, 'enum')) {
        put(stream, dest, key, match(stream, 'enum').value);
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
        put(stream, dest, key, newDest);
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
        stream.exportMessage({
            type: 'warning',
            message: `Unexpected ${token.family === 'end-of-stream' ? token.family : `token '${token.value}'`}, expected ${family}`,
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
    stream.exportMessage({
        type: 'warning',
        message: `Unexpected ${token.family === 'end-of-stream' ? token.family : `token '${token.value}'`}, expected ${ruleName}`,
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

function put(stream, dest, key, value) {
    if(dest[`${key.value}`])
        stream.exportMessage({
            type: 'warning',
            message: `Duplicate definition of key '${key}'`,
            row: key.row,
            col: key.col
        });
    dest[`${key.value}`] = value;
}


/* Entry point */
function parse(tokens, exportMessage) {
    let stream = {
        tokens: tokens,
        position: 0,
        exportMessage
    };
    let dest = {};

    parseBlock(stream, dest, 'end-of-stream');

    return dest;
}

export default parse;
