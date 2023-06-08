import React, { useEffect, useState, useRef } from 'react';
import * as GenController from 'controllers/GeneralController';

export const ProvisionalFile = ({ file, remove }) => {
    return (
        <div className="page-list-item">
            <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px', marginRight: 10 + 'px'}} onClick={remove.bind(null, file)}>
                <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
            <p style={{flexGrow: 1}}>{file.name}</p>
            <p style={{width: 20 + '%'}}>{GenController.getFileSizeString(file.size)}</p>
            <p style={{width: 20 + '%'}}>{file.type}</p>
        </div>
    );
};

export const DataLabel = ({ label, callbackEdit, callbackRemove }) => {
    const [editing, setEditing] = useState(false);
    const [provisionalLabel, setProvisionalLabel] = useState('');
    const editField = useRef(null);

    useEffect(() => {
        if(editing && editField.current)
            editField.current.select();
    }, [editing]);

    const updateProvisionalValue = event => setProvisionalLabel(event.target.value);

    const editFieldKeyDown = event => {
        if(event.key === 'Enter')
            saveLabel();
    };

    const editLabel = () => {
        setEditing(true);
        setProvisionalLabel(label.string);
    }

    const saveLabel = () => {
        setEditing(false);
        callbackEdit(label.labelID, provisionalLabel.trim());
    };

    if(editing) return (
        <div className="data-label-item" style={{paddingTop: 0, paddingBottom: 0}}>
            <input type="text" placeholder="Label" className="text-field" ref={editField} onKeyDown={editFieldKeyDown}
                   value={provisionalLabel} onChange={updateProvisionalValue} style={{marginRight: 5 + 'px'}} />
            <button className="button red" onClick={setEditing.bind(null, false)}>Cancel</button>
            <button className="button green" onClick={saveLabel}>Save</button>
        </div>
    );

    return (
        <div className="data-label-item">
            <p>{label.string}</p>
            <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={editLabel}>
                <img src="/console/images/edit.png" alt="/console/images/edit.png" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
            <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={callbackRemove.bind(null, label.labelID)}>
                <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
        </div>
    );
};

/*
 * Value must contain fields labelID and customLabel
 * Callback is of the form (labelID, customLabel) => void
 */
export const LabelChooser = ({ labels, value, callback }) => {
    const [provisionalCustomLabel, setProvisionalCustomLabel] = useState('');
    const customField = useRef(null);

    useEffect(() => setProvisionalCustomLabel(value.customLabel ? value.customLabel : ''), [value]);

    const updateChoice = event => {
        if(event.target.value === '')
            callback(null, provisionalCustomLabel);
        else callback(event.target.value, null);
    };

    const updateCustom = event => {
        if(!event.key || event.key === 'Enter')
            callback(null, provisionalCustomLabel);
    };

    const updateProvisionalCustomLabel = event => setProvisionalCustomLabel(event.target.value);

    return (
        <div style={{display: 'flex', flexDirection: 'row', flexGrow: 1}}>
            <select className="text-field" style={{margin: 0, minWidth: 20 + '%', flexGrow: 1}} value={value.labelID === null ? '' : value.labelID} onChange={updateChoice}>
                { labels.map((label, index) => <option value={label.labelID} key={index}>{label.string}</option>) }
                <option value={''}>Custom</option>
            </select>
            { value.labelID === null ? (
                <input type="text" placeholder="Value" className="text-field" style={{margin: '0 0 0 5px', flexGrow: 1}} ref={customField}
                       value={provisionalCustomLabel} onChange={updateProvisionalCustomLabel} onKeyDown={updateCustom} onBlur={updateCustom} />
            ) : null }
        </div>
    );
};

export const DataFile = ({ file, dataLabels, callbackSet, callbackRemove }) => {
    const [details, setDetails] = useState(null);
    const [editing, setEditing] = useState(false);
    const [provisionalName, setProvisionalName] = useState('');
    const editNameField = useRef(null);

    const fetchImageDetails = async url => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            setDetails({ size: blob.size, type: blob.type });
        }
        catch(err) {
            setDetails({ size: 0, type: 'Error' });
        }
    };

    useEffect(() => { fetchImageDetails(file.url).then(); }, [file.url]);

    useEffect(() => {
        if(editing && editNameField.current)
            editNameField.current.select();
    }, [editing]);

    const editName = () => {
        setEditing(true);
        setProvisionalName(file.filename);
    };

    const editNameFieldKeyDown = event => {
        if(event.key === 'Enter')
            saveName();
    };

    const updateProvisionalName = event => setProvisionalName(event.target.value);

    const saveName = () => {
        setEditing(false);
        callbackSet(file.datafileID, provisionalName, file.labelID, file.customLabel);
    };

    if(editing) return (
        <div className="datasets-file">
            <input type="text" placeholder="Filename" className="text-field" style={{flexGrow: 1, margin: 0}}
                   value={provisionalName} onChange={updateProvisionalName} ref={editNameField} onKeyDown={editNameFieldKeyDown} />
            <button className="button red" onClick={setEditing.bind(null, false)}>Cancel</button>
            <button className="button green" onClick={saveName}>Save</button>
        </div>
    );

    return (
        <div className="datasets-file">
            <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px', marginRight: 10 + 'px'}} onClick={callbackRemove.bind(null, file.datafileID)}>
                <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
            <img src={file.url} alt=":(" style={{width: 37 + 'px', height: 37 + 'px'}}/>
            <div style={{width: 40 + '%', display: 'flex', flexDirection: 'row'}}>
                <p style={{marginLeft: 10 + 'px'}}>{file.filename}</p>
                <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={editName}>
                    <img src="/console/images/edit.png" alt="Edit" style={{width: 70 + '%', height: 70 + '%'}} />
                </button>
            </div>
            <p style={{width: 15 + '%'}}>{details ? GenController.getFileSizeString(details.size) : '...'}</p>
            <p style={{width: 15 + '%'}}>{details ? details.type : '...'}</p>
            <LabelChooser style={{width: 25 + '%'}} labels={dataLabels} value={file} callback={callbackSet.bind(null, file.datafileID, file.filename)} />
        </div>
    );
};
