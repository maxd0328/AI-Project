
const validators = [
    {
        item: 'annotation',
        keys: ['template', 'use'],
        assertion: function(annotation, params, defKey, defValue) {
            if(matejScriptType(defValue) !== 'layer')
                return { type: 'warning', message: `Annotation '@${annotation}' should be applied to a layer` };
        }
    },
    {
        item: 'annotation',
        keys: ['use'],
        assertion: function(annotation, params, defKey, defValue) {
            if(params.length === 0)
                return { type: 'warning', message: `Annotation '@${annotation}' should have at least one parameter` };
        }
    }
];

function matejScriptType(value) {
    if(value === null) return 'empty';
    if(Array.isArray(value)) return 'array';
    if(typeof value === 'number') return 'number';
    if(typeof value === 'string') return 'enum';
    if(typeof value === 'object') return 'layer';
}

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
                const result = e.assertion(annotation, item[annotation], key, parent[key]);
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
        item.sourceMap = undefined;
    }

    // Validate fields: loop through every field in parent
    for(let key in parent) {
        if(!parent.hasOwnProperty(key) || key === 'sourceMap' || key === 'annotations')
            continue;

        // Validate field using matching assertions
        const predicate = (e => e.item === 'definition' && (!e.scope || e.scopes.includes(scope)) && (!e.keys || e.keys.includes(key)));
        validators.filter(predicate).forEach(e => {
            const result = e.assertion(key, parent[key]);
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
    parent.sourceMap = undefined;
}

function validate(output, exportMessage) {
    implValidate(output, 'global', exportMessage);
}

export default validate;
