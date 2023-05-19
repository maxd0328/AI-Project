import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../Tabs.css';
import '../ConfigurationTab.css';
import { compile, matejScriptType } from '../../../compiler/Compiler';
import decompile from '../../../compiler/Decompiler';
import { KEYS } from '../../../compiler/Definitions';

const computeValueType = (key) => {
    const details = KEYS.find(e => e.name === key);
    switch(details ? details.type : null) {
        case 'number': return 1;
        case 'array': return details.length;
        case 'enum': return details.values;
        default: return null;
    }
};

const computeKeyOptions = (json, scope) => KEYS.filter(key => key.scopes.includes(scope) && json[key.name] === undefined).map(key => key.name);

const beautifyCamelCase = str => str.split(/(?=[A-Z])/).map(word => word[0].toUpperCase() + word.substring(1)).join(' ');

const beautifyScreamingSnakeCase = str => str.split('_').map(word => word[0].toUpperCase() + word.substring(1).toLowerCase()).join(' ');

const generateFields = (json, update, remove, rename) => Object.entries(json).map(([keyName, value], index) => {
    if(keyName === 'annotations')
        return null;
    if(matejScriptType(value) === 'layer')
        return (<Layer layerName={keyName} value={value} key={index} callbackSet={update} callbackRemove={remove} callbackRename={rename} />);
    else {
        const valueType = computeValueType(keyName, value);
        if(valueType === null) return null;
        return (<Field keyName={keyName} valueType={valueType} value={value} key={index}
                       callbackSet={update} callbackRemove={remove}/>);
    }
});

const Layer = ({ layerName, value, callbackSet, callbackRemove, callbackRename }) => {
    const scope = 'layer';
    const [addSelection, setAddSelection] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [provisionalName, setProvisionalName] = useState('');

    useEffect(() => {
        const options = computeKeyOptions(value, scope);
        if(!options.includes(addSelection))
            setAddSelection(options.length === 0 ? '' : options[0]);
    }, [value, addSelection]);

    const editNameRef = useRef(null);
    useEffect(() => {
        if(editingName) {
            if(editNameRef.current) editNameRef.current.focus();
            setProvisionalName(layerName);
        }
    }, [editingName, layerName]);

    const keyOptions = useMemo(() => computeKeyOptions(value, scope), [value, scope]);

    const update = (key, newValue) => callbackSet(layerName, {
        ...value,
        [key]: newValue
    });
    const remove = (key) => {
        const { [key]: _, ...newValue } = value;
        callbackSet(layerName, newValue);
    };
    const rename = (oldKey, newKey) => {
        const newValue = {};
        Object.entries(value).forEach(([key, __value]) => newValue[key === oldKey ? newKey : key] = __value);
        callbackSet(layerName, newValue);
    };

    const updateAddSelection = event => setAddSelection(event.target.value);

    const updateProvisionalName = event => setProvisionalName(event.target.value);

    const saveName = () => {
        setEditingName(false);
        callbackRename(layerName, provisionalName);
    };

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

const Field = ({ keyName, valueType, value, callbackSet, callbackRemove }) => {
    const update = event => callbackSet(keyName, event.target.value === '' ? null : event.target.value);

    const arrUpdate = (index, event) => {
        const newArr = value === null ? new Array(valueType).fill(null) : [...value];
        newArr[index] = event.target.value === '' ? null : event.target.value;
        callbackSet(keyName, newArr);
    };

    const numberValue = () => (
        <input type="number" className="text-field" placeholder="Value" style={{width: 25 + '%'}} value={value === null ? '' : value} onChange={update} />
    );

    const arrayValue = (length) => Array.from({  length }, (_, index) => (
        <input type="number" className="text-field" placeholder={'Value ' + (index + 1)} style={{width: 75 + 'px', marginLeft: 10 + 'px'}}
            value={value === null || value[index] === null ? '' : value[index]} onChange={arrUpdate.bind(null, index)} key={index} />
    ));

    const enumValue = (values) => (
        <select className="text-field" style={{width: 25 + '%'}} value={!value ? '' : value} onChange={update}>
            <option value=''>Empty</option>
            { values.map((value, index) => (<option value={value} key={index}>{beautifyScreamingSnakeCase(value)}</option>)) }
        </select>
    );

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

const EasyStageBody = ({ stage, set }) => {
    const scope = 'global';
    const [json, setJson] = useState({});
    const [addSelection, setAddSelection] = useState('');

    useEffect(() => {
        const options = computeKeyOptions(json, scope);
        if(!options.includes(addSelection))
            setAddSelection(options.length === 0 ? '' : options[0]);
    }, [json, addSelection]);

    useEffect(() => {
        console.log(stage.content);
        setJson(compile(stage.content).output);
    }, [stage.content]);

    const keyOptions = useMemo(() => computeKeyOptions(json, scope), [json, scope]);

    const apply = newJson => set({
        ...stage,
        content: decompile(newJson)
    });

    const update = (key, value) => apply({
        ...json,
        [key]: value
    });
    const remove = (key) => {
        const { [key]: _, ...newJson } = json;
        apply(newJson);
    };
    const rename = (oldKey, newKey) => {
        const newJson = {};
        Object.entries(json).forEach(([key, value]) => newJson[key === oldKey ? newKey : key] = value);
        apply(newJson);
    };

    const updateAddSelection = event => setAddSelection(event.target.value);

    const addLayer = () => {
        if(json['newLayer'] === undefined) update('newLayer', {});
        else {
            let iteration = 0;
            while(json['newLayer' + iteration] !== undefined)
                iteration++;
            update('newLayer' + iteration, {});
        }
    };

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
