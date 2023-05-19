import { matejScriptType } from './Compiler';
import { KEYS } from './Definitions';

const englishIsStupid = (word) => ['a', 'e', 'i', 'o', 'u'].includes(word.toLowerCase().trim()[0]) ? 'an ' + word : 'a ' + word;

const validators = [
    {
        item: 'annotation',
        keys: ['template', 'use'],
        assertion: function(annotation, params, defKey, defValue, scope) {
            if(matejScriptType(defValue) !== 'layer')
                return { type: 'warning', message: `Annotation '@${annotation}' should be applied to a layer` };
        }
    },
    {
        item: 'annotation',
        keys: ['use'],
        assertion: function(annotation, params, defKey, defValue, scope) {
            if(params.length === 0)
                return { type: 'warning', message: `Annotation '@${annotation}' should have at least one parameter` };
        }
    },
    {
        item: 'annotation',
        keys: ['template', 'show'],
        assertion: function(annotation, params, defKey, defValue, scope) {
            if(params.length > 0)
                return { type: 'warning', message: `Annotation '@${annotation}' shouldn't have any parameters` };
        }
    },
    {
        item: 'definition',
        assertion: function(key, value, scope) {
            const details = KEYS.find(e => e.name === key);

            if(details) {
                if(matejScriptType(value) !== details.type && matejScriptType(value) !== 'empty')
                    return { type: 'warning', message:
                            `Key '${key}' should be declared as ${englishIsStupid(details.type)}, not ${englishIsStupid(matejScriptType(value))}`};

                if(matejScriptType(value) === 'enum' && !details.values.includes(value))
                    return { type: 'warning', message: `'${value}' is not a valid enum selection for key '${key}'`};

                if(matejScriptType(value) === 'array' && value.length !== details.length)
                    return { type: 'warning', message: `Incorrect length for array on key '${key}'` };
            }
            else if(matejScriptType(value) !== 'layer')
                return { type: 'warning', message: `Unrecognized key '${key}'` };
            else if(scope !== 'global')
                return { type: 'warning', message: 'Layers should only be declared in a global scope' };
        }
    },
    {
        item: 'definition',
        assertion: function(key, value, scope) {
            const details = KEYS.find(e => e.name === key);

            if(details && !details.scopes.includes(scope))
                return { type: 'warning', message: `Key '${key}' has no meaning in a ${scope} scope` };
        }
    }
];

function implValidate(parent, scope, exportMessage) {
    // Validate annotations: loop through every field copy in annotations entry
    for(let key in parent.annotations) {
        if(!parent.annotations.hasOwnProperty(key))
            continue;

        // Loop through every annotation belonging to that field
        const item = parent.annotations[key];
        for(let annotation in item) {
            if(!item.hasOwnProperty(annotation) || annotation === 'sourceMap')
                continue;

            // Validate annotation using matching assertions
            const predicate = (e => e.item === 'annotation' && (!e.scope || e.scopes.includes(scope)) && (!e.keys || e.keys.includes(annotation)));
            validators.filter(predicate).forEach(e => {
                const result = e.assertion(annotation, item[annotation], key, parent[key], scope);
                if(result)
                    exportMessage({
                        type: result.type,
                        message: result.message,
                        row: item.sourceMap[annotation].row,
                        col: item.sourceMap[annotation].col
                    });
            });
        }
        // Remove annotation source map once we're done
        delete item.sourceMap;
    }

    // Validate fields: loop through every field in parent
    for(let key in parent) {
        if(!parent.hasOwnProperty(key) || key === 'sourceMap' || key === 'annotations')
            continue;

        // Validate field using matching assertions
        const predicate = (e => e.item === 'definition' && (!e.scope || e.scopes.includes(scope)) && (!e.keys || e.keys.includes(key)));
        validators.filter(predicate).forEach(e => {
            const result = e.assertion(key, parent[key], scope);
            if(result)
                exportMessage({
                    type: result.type,
                    message: result.message,
                    row: parent.sourceMap[key].row,
                    col: parent.sourceMap[key].col
                });
        });

        // If the entry is a layer, recurse and validate everything inside of it
        const value = parent[key];
        if(matejScriptType(value) === 'layer')
            implValidate(value, 'layer', exportMessage);
    }

    // Remove source map once we're done
    delete parent.sourceMap;
}

function validate(output, exportMessage) {
    implValidate(output, 'global', exportMessage);
}

export default validate;
