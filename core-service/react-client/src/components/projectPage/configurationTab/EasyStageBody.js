import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../Tabs.css';
import '../ConfigurationTab.css';
import { compile, matejScriptType } from '../../../compiler/Compiler';
import decompile from '../../../compiler/Decompiler';
import { KEYS } from '../../../compiler/Definitions';

/* Converts from that key's MatejScript type to the UIs internal representation */
const computeValueType = (key) => {
    const details = KEYS.find(e => e.name === key);
    switch(details ? details.type : null) {
        case 'number': return 1;
        case 'array': return details.length;
        case 'enum': return details.values;
        default: return null;
    }
};

/* Get the list of all available keys in a given scope minus the ones already in the JSON */
const computeKeyOptions = (json, scope) => KEYS.filter(key => key.scopes.includes(scope) && json[key.name] === undefined).map(key => key.name);

/* Beautify camelCasePhrases, used to display the keys as regular (spaced) text */
const beautifyCamelCase = str => str.split(/(?=[A-Z])/).map(word => word[0].toUpperCase() + word.substring(1)).join(' ');

/* Beautify SCREAMING_SNAKE_CASE_PHRASES, used to display the enums as regular (spaced) text */
const beautifyScreamingSnakeCase = str => str.split('_').map(word => word[0].toUpperCase() + word.substring(1).toLowerCase()).join(' ');

/* Generate a list of UI elements for a given set of keys (json), differentiating fields and layers */
const generateFields = (json, update, remove, rename) => Object.entries(json).map(([keyName, value], index) => {
    if(keyName === 'annotations') // Skip special annotations object of course
        return null;
    if(matejScriptType(value) === 'layer')
        return (<Layer layerName={keyName} value={value} key={index} callbackSet={update} callbackRemove={remove} callbackRename={rename} />);
    else {
        const valueType = computeValueType(keyName, value); // Get internal type representation
        if(valueType === null) return null;
        return (<Field keyName={keyName} valueType={valueType} value={value} key={index}
                       callbackSet={update} callbackRemove={remove}/>);
    }
});

/* Represents a layer in the easy mode configuration */
const Layer = ({ layerName, value, callbackSet, callbackRemove, callbackRename }) => {
    // Set up states
    const scope = 'layer';
    const [addSelection, setAddSelection] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [provisionalName, setProvisionalName] = useState('');

    // Whenever the children keys in the layer change, get remaining key options and change selected key if it's gone
    useEffect(() => {
        const options = computeKeyOptions(value, scope);
        if(!options.includes(addSelection))
            setAddSelection(options.length === 0 ? '' : options[0]);
    }, [value, addSelection, scope]);

    // When the user presses on the button to edit the layer's name, the text field is automatically focused and filled with the previous name
    const editNameRef = useRef(null);
    useEffect(() => {
        if(editingName) {
            if(editNameRef.current) editNameRef.current.focus();
            setProvisionalName(layerName);
        }
    }, [editingName, layerName]);

    // Remember the available key options, and re-compute when any of the dependencies change (JSON or scope)
    const keyOptions = useMemo(() => computeKeyOptions(value, scope), [value, scope]);

    // The 3 callbacks that the children of this layer call to update their info (update, remove, or rename)
    const update = (key, newValue) => callbackSet(layerName, {
        ...value,
        [key]: newValue
    });
    const remove = (key) => {
        const { [key]: _, ...newValue } = value;
        callbackSet(layerName, newValue);
    };
    const rename = (oldKey, newKey) => {
        const newValue = {}; // This is to preserve the declaration order
        Object.entries(value).forEach(([key, __value]) => newValue[key === oldKey ? newKey : key] = __value);
        callbackSet(layerName, newValue);
    };

    // Event handlers
    const updateAddSelection = event => setAddSelection(event.target.value);

    const updateProvisionalName = event => setProvisionalName(event.target.value);

    const saveName = () => {
        setEditingName(false);
        callbackRename(layerName, provisionalName);
    };

    // Render the layer
    return (
        <div>
            { editingName ? (
                <div className="config-field">
                    <input type="text" className="text-field" style={{flexGrow: 1, marginRight: 5 + 'px'}}
                           placeholder="Layer Name" value={provisionalName} onChange={updateProvisionalName} ref={editNameRef} />
                    <button className="button red" onClick={setEditingName.bind(null, false)}>Cancel</button>
                    <button className="button green" onClick={saveName}>Save</button>
                </div>
            ) : (
                <div className="config-field">
                    <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={callbackRemove.bind(null, layerName)}>
                        <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}} />
                    </button>
                    <p><b>Layer:</b> {layerName}</p>
                    <button className="image-button" style={{width: 22 + 'px', height: 22 + 'px'}} onClick={setEditingName.bind(null, true)}>
                        <img src="/console/images/edit.png" alt="/console/images/edit.png" style={{width: 70 + '%', height: 70 + '%'}} />
                    </button>
                    <input className="text-field" style={{opacity: 0, pointerEvents: 'none'}} />
                </div>
            ) }

            <div className="config-layer">
                { generateFields(value, update, remove, rename) }
                { keyOptions.length > 0 ? (
                    <div className="config-field" style={{border: 'none', marginTop: 5 + 'px', marginBottom: 5 + 'px'}}>
                        <select className="text-field" value={addSelection} onChange={updateAddSelection}>
                            { keyOptions.map((option, index) => (<option value={option} key={index}>{beautifyCamelCase(option)}</option>)) }
                        </select>
                        <button className="button green" style={{marginLeft: 10 + 'px'}}
                                onClick={() => { if(addSelection) update(addSelection, null) }}>Add Field</button>
                    </div>
                ) : null }
            </div>
        </div>
    );
};

/* Represents a single field in the easy mode configuration */
const Field = ({ keyName, valueType, value, callbackSet, callbackRemove }) => {
    // When updating the value of this field, it calls the callback of its parent to set its data (UI can't handle null so '' = null)
    const update = event => callbackSet(keyName, event.target.value === '' ? null : event.target.value);

    // Same function as above, but specifically for updating a single element if the value of this field is an array
    const arrUpdate = (index, event) => {
        const newArr = value === null ? new Array(valueType).fill(null) : [...value];
        newArr[index] = event.target.value === '' ? null : event.target.value;
        callbackSet(keyName, newArr);
    };

    // HTML if this field is a number
    const numberValue = () => (
        <input type="number" className="text-field" placeholder="Value" style={{width: 25 + '%'}} value={value === null ? '' : value} onChange={update} />
    );

    // HTML if this field is an array
    const arrayValue = (length) => Array.from({  length }, (_, index) => (
        <input type="number" className="text-field" placeholder={'Value ' + (index + 1)} style={{width: 75 + 'px', marginLeft: 10 + 'px'}}
            value={value === null || value[index] === null ? '' : value[index]} onChange={arrUpdate.bind(null, index)} key={index} />
    ));

    // HTML if this field is an enum
    const enumValue = (values) => (
        <select className="text-field" style={{width: 25 + '%'}} value={!value ? '' : value} onChange={update}>
            <option value=''>Empty</option>
            { values.map((value, index) => (<option value={value} key={index}>{beautifyScreamingSnakeCase(value)}</option>)) }
        </select>
    );

    // Render the field based on the type
    return (
        <div className="config-field">
            <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={callbackRemove.bind(null, keyName)}>
                <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
            <p>{beautifyCamelCase(keyName)}</p>
            <div style={{flexGrow: 1}} />
            {
                valueType === 1 ? numberValue()
                    : valueType > 1 ? arrayValue(valueType)
                    : Array.isArray(valueType) ? enumValue(valueType)
                    : null
            }
        </div>
    );
};

/* The entire easy mode component */
const EasyStageBody = ({ stage, set }) => {
    // Set up states
    const scope = 'global';
    const [json, setJson] = useState({});
    const [addSelection, setAddSelection] = useState('');

    // Same as in layers, we change the currently selected key if it becomes no longer available (usually after a change in the JSON)
    useEffect(() => {
        const options = computeKeyOptions(json, scope);
        if(!options.includes(addSelection))
            setAddSelection(options.length === 0 ? '' : options[0]);
    }, [json, addSelection, scope]);

    // Changes to the state always go through the MatejScript content (stored in the parent, updated through 'set' callback)
    // As such, this effect updates the internal JSON representation needed by the UI whenever the MatejScript changes
    useEffect(() => setJson(compile(stage.content).output), [stage.content]);

    // Remember available keys, and recalculate when JSON (or technically, but not practically, scope) changes
    const keyOptions = useMemo(() => computeKeyOptions(json, scope), [json, scope]);

    // Applies a new JSON configuration to the state
    // Since the MatejScript content is the core of the easy mode's state and is stored in the parent, the new JSON configuration is
    // decompiled into MatejScript and sent to the parent via the 'set' callback. Notice how the internal JSON representation is not
    // set in this method. This is because the effect above is responsible for propagating changes from the MatejScript content to
    // the internal JSON representation used by the UI
    const apply = newJson => set({
        ...stage,
        content: decompile(newJson)
    });

    // As in the layers, these are the 3 callbacks that the children of the global scope call to update their info (update, remove, or rename)
    const update = (key, value) => apply({
        ...json,
        [key]: value
    });
    const remove = (key) => {
        const { [key]: _, ...newJson } = json;
        apply(newJson);
    };
    const rename = (oldKey, newKey) => {
        const newJson = {}; // Preserve order of course, because keys
        Object.entries(json).forEach(([key, value]) => newJson[key === oldKey ? newKey : key] = value);
        apply(newJson);
    };

    // Event handlers
    const updateAddSelection = event => setAddSelection(event.target.value);

    const addLayer = () => {
        if(json['newLayer'] === undefined) update('newLayer', {});
        else {
            let iteration = 0; // This is just to make sure that the name isn't 'newLayer' if there already is a 'newLayer'
            while(json['newLayer' + iteration] !== undefined) // It goes newLayer0, newLayer1, ... until one is available
                iteration++;
            update('newLayer' + iteration, {});
        }
    };

    // Render the easy mode page
    return (
        <div style={{marginBottom: 5 + 'px'}}>
            { generateFields(json, update, remove, rename) }
            <div className="config-field" style={{border: 'none', marginTop: 5 + 'px'}}>
                { keyOptions.length > 0 ? [
                    <select className="text-field" value={addSelection} onChange={updateAddSelection} key={1}>
                        { keyOptions.map((option, index) => (<option value={option} key={index}>{beautifyCamelCase(option)}</option>)) }
                    </select>,
                    <button className="button green" style={{marginLeft: 10 + 'px'}}
                            onClick={() => { if(addSelection) update(addSelection, null) }} key={2}>Add Field</button>
                ] : null }
                <div style={{flexGrow: 1}} />
                <button className="button green" onClick={addLayer}>Add Layer</button>
            </div>
        </div>
    );
};

export default EasyStageBody;
