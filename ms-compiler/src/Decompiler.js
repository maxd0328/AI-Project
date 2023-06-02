import { matejScriptType } from './Compiler';

export function decompile(json, includeAnnotations = true, showOnly = false, indent = 0) {
    const lines = [];

    for(let key in json) {
        if(!json.hasOwnProperty(key) || key === 'annotations')
            continue;

        if(showOnly && (!json.annotations || !json.annotations[key] || !json.annotations[key].show))
            continue;

        const value = json[key];
        let valueString;

        switch(matejScriptType(value)) {
            case 'number':
            case 'enum':
                valueString = value;
                break;
            case 'empty':
                valueString = 'empty';
                break;
            case 'array':
                valueString = value.map(e => e === null ? 'empty' : e).join(', ');
                break;
            case 'layer':
                valueString = '{\n' + decompile(value, includeAnnotations, showOnly, indent + 1) + '\n}';
                break;
            default:
                valueString = null;
        }

        if(valueString) {
            if(includeAnnotations && json.annotations && json.annotations[key]) {
                const annotations = json.annotations[key];

                for(let annotation in annotations) {
                    if(!annotations.hasOwnProperty(annotation))
                        continue;

                    let params = annotations[annotation];
                    if(params.length > 0)
                        lines.push(`@${annotation}(${params.join(', ')})`);
                    else
                        lines.push(`@${annotation}`);
                }
            }

            lines.push(`${key} = ${valueString}`);
        }
    }

    return lines.map(line => '\t'.repeat(indent) + line).join('\n');
}
