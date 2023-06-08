import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DataLabel, DataFile, ProvisionalFile, LabelChooser } from './DatasetUtils';
import * as Controller from 'controllers/DatasetController';
import * as GenController from 'controllers/GeneralController';

const DatasetBody = ({ datasetID, updateName, remove }) => {
    const [dataset, setDataset] = useState(null);
    const [loadingDataset, setLoadingDataset] = useState(false);
    const [datasetError, setDatasetError] = useState(false);

    const [debouncedSearchFiles, setDebouncedSearchFiles] = useState('');
    const [searchFiles, setSearchFiles] = useState('');
    const [filePage, setFilePage] = useState(1);
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [fileError, setFileError] = useState(false);

    const [provisionalName, setProvisionalName] = useState('');
    const [provisionalFiles, setProvisionalFiles] = useState([]);
    const [uploadDragging, setUploadDragging] = useState(false);
    const [defaultLabel, setDefaultLabel] = useState({ labelID: null, customLabel: '' });
    const [deleteFailed, setDeleteFailed] = useState(false);
    const fileInput = useRef(null);

    const reload = useCallback((silent = false, callback) => {
        if(!silent) setLoadingDataset(true);
        Controller.fetchDetails(datasetID).then(result => {
            setDataset(result);
            setProvisionalName(result.name);
            setLoadingDataset(false);
            setDatasetError(false);
            if(callback) callback(result);
        }).catch(err => {
            setLoadingDataset(false);
            setDatasetError(true);
        });
    }, [datasetID]);

    const reloadSilent = reload.bind(null, true);

    const reloadFiles = useCallback((silent = false) => {
        if(!silent) setLoadingFiles(true);
        Controller.fetchDatasetFiles(datasetID, debouncedSearchFiles, filePage).then(result => {
            setFiles(result);
            setLoadingFiles(false);
            setFileError(false);
        }).catch(err => {
            setLoadingFiles(false);
            setFileError(true);
        });
    }, [datasetID, debouncedSearchFiles, filePage]);

    const reloadFilesSilent = reloadFiles.bind(null, true);

    const searchFilesTimeout = useRef(null);
    const doDebounceSearch = useCallback(searchQuery => {
        const later = () => {
            clearTimeout(searchFilesTimeout.current);
            setDebouncedSearchFiles(searchQuery);
        }

        clearTimeout(searchFilesTimeout.current);
        searchFilesTimeout.current = setTimeout(later, 2000); // 2 seconds
    }, []);

    useEffect(reload, [reload]);
    useEffect(reloadFiles, [reloadFiles]);
    useEffect(() => doDebounceSearch(searchFiles), [searchFiles, doDebounceSearch]);

    useEffect(() => {
        if(defaultLabel.labelID !== null && dataset.labels.find(e => e.labelID === defaultLabel.labelID) < 0)
            setDefaultLabel({ labelID: null, customLabel: '' });
    }, [defaultLabel, dataset]);

    const addProvisionalFile = event => setProvisionalFiles(provisionalFiles => [...provisionalFiles, ...Array.from(event.target.files)]);

    const removeProvisionalFile = file => setProvisionalFiles(provisionalFiles => {
        const newFiles = [...provisionalFiles];
        const index = newFiles.indexOf(file);
        if(index >= 0)
            newFiles.splice(index, 1);
        return newFiles;
    });

    const removeProvisionalFiles = () => setProvisionalFiles([]);

    const promptAddFile = () => {
        if(fileInput.current)
            fileInput.current.click();
    };

    const uploadFilesDragOver = event => {
        event.preventDefault();
        setUploadDragging(true);
    };

    const uploadFilesDragLeave = event => {
        event.preventDefault();
        setUploadDragging(false);
    };

    const uploadFilesDrop = event => {
        event.preventDefault();
        setUploadDragging(false);

        const files = [];

        if(event.dataTransfer.items)
            for(let i = 0 ; i < event.dataTransfer.items.length ; ++i)
                if(event.dataTransfer.items[i].kind === 'file')
                    files.push(event.dataTransfer.items[i].getAsFile());
                else if(event.dataTransfer.files)
                    for(let i = 0 ; i < event.dataTransfer.files.length ; ++i)
                        files.push(event.dataTransfer.files[i]);

        setProvisionalFiles(provisionalFiles => [...provisionalFiles, ...files]);
    };

    const updateDefaultLabel = (labelID, customLabel) => setDefaultLabel({ labelID, customLabel });

    const updateProvisionalName = event => setProvisionalName(event.target.value);
    const updateSearchFiles = event => setSearchFiles(event.target.value);

    const saveName = event => {
        if(!event.key || event.key === 'Enter') Controller.sendDatasetName(datasetID, provisionalName)
            .then(() => reloadSilent(dataset => updateName(dataset.name))).catch(err => setDatasetError(true));
    };

    const uploadFiles = () => Controller.sendNewFiles(datasetID, provisionalFiles, defaultLabel.labelID, defaultLabel.customLabel).then(() => {
        setProvisionalFiles([]);
        reloadFilesSilent();
    }).catch(err => setDatasetError(true));

    const addDataLabel = () => Controller.sendNewLabel(datasetID, 'New Label').then(() => reloadSilent()).catch(err => setDatasetError(true));

    const updateDataLabel = (labelID, string) => Controller.sendEditLabel(datasetID, labelID, string).then(() => reloadSilent()).catch(err => setDatasetError(true));

    const removeDataLabel = (labelID) => Controller.sendDeleteLabel(datasetID, labelID).then(() => {
        reloadSilent();
        reloadFilesSilent(); // Because we might have a situation where a deleted label is still present in the visible files
    }).catch(err => setDatasetError(true));

    const updateFile = (datafileID, name, labelID, customLabel) => Controller.sendUpdateDatafile(datasetID, datafileID, name, labelID, customLabel)
        .then(reloadFilesSilent).catch(err => setFileError(true));

    const removeFile = datafileID => Controller.sendDeleteDatafile(datasetID, datafileID).then(reloadFilesSilent).catch(err => setFileError(true));

    if(!dataset) return null;
    if(loadingDataset) return (
        <div className="centered-container" style={{flexGrow: 1}}>
            <p>Loading dataset...</p>
        </div>
    );
    if(datasetError) return (
        <div className="centered-container" style={{flexGrow: 1}}>
            <p>Something went wrong, please try again later.</p>
            <button className="button blue" onClick={reload}>Reload</button>
        </div>
    );

    return (
        <div className="page" style={{flexGrow: 1}}>
            <div className="row" style={{marginTop: 20 + 'px', marginBottom: 10 + 'px'}}>
                <input type="text" placeholder="Name" className="outer-element text-field" style={{margin: 0, flexGrow: 1, fontSize: 18 + 'px'}}
                       value={provisionalName} onChange={updateProvisionalName} onKeyDown={saveName} onBlur={saveName} />
                <button className="button red" onClick={remove.bind(null, datasetID)} style={{marginLeft: 10 + 'px'}}>Delete</button>
            </div>
            { deleteFailed ? <p className="outer-element" style={{color: '#ff3333'}}>Failed to delete dataset</p> : null }
            <p className="outer-element">Last Modified: {GenController.getRelativeTimeString(dataset.lastModified)}</p>

            <div className="page-block">
                <h3 style={{marginTop: 15 + 'px', marginBottom: 10 + 'px'}}>Upload Files</h3>
                <input ref={fileInput} type="file" multiple style={{display: 'none'}} value={''} onChange={addProvisionalFile}/>

                <div className="page-list" style={{marginTop: 5 + 'px', marginBottom: 0 + 'px', height: 200 + 'px',
                    border: uploadDragging ? '2px dashed #22cc22' : '1px solid #4c4f54', transition: 'border-color 0.15s'}}
                     onDragOver={uploadFilesDragOver} onDragLeave={uploadFilesDragLeave} onDrop={uploadFilesDrop}>

                    { provisionalFiles.map((file, index) => (
                        <ProvisionalFile file={file} key={index} remove={removeProvisionalFile} />
                    )) }
                    <div className="page-list-item" style={{alignItems: 'center', justifyContent: 'center', flexGrow: 1, backgroundColor: '#2d2e34'}}>
                        <p style={{marginTop: 10 + 'px', marginBottom: 10 + 'px'}}>Drag Files Here</p>
                    </div>
                </div>

                <button className="image-button text-button" onClick={promptAddFile} style={{marginBottom: 10 + 'px'}}>
                    <img src="/console/images/delete.png" alt="/>console/images/delete.png"
                         style={{width: 15 + 'px', height: 15 + 'px', transform: 'rotate(45deg)', marginRight: 10 + 'px'}} />
                    <p style={{margin: 0}}>Add File</p>
                </button>

                <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 + 'px'}}>
                    <div style={{marginRight: 5 + 'px', minWidth: 20 + '%'}}>
                        <LabelChooser labels={dataset.labels} value={defaultLabel} callback={updateDefaultLabel} />
                    </div>
                    <button className="button red" disabled={!provisionalFiles.length} onClick={removeProvisionalFiles}>Remove</button>
                    <button className="button green" disabled={!provisionalFiles.length} onClick={uploadFiles}>Upload</button>
                </div>
            </div>

            <h3 className="outer-element">Data Labels</h3>
            <div className="outer-element data-label-container">
                { dataset.labels.map((label, index) => (
                    <DataLabel label={label} key={index} callbackEdit={updateDataLabel} callbackRemove={removeDataLabel} />
                )) }
                <button className="image-button" style={{width: 25 + 'px', height: 25 + 'px', margin: '10px 0 10px 7px'}} onClick={addDataLabel}>
                    <img src="/console/images/delete.png" alt="/console/images/delete.png"
                         style={{width: 70 + '%', height: 70 + '%', transform: 'rotate(45deg)'}} />
                </button>
            </div>

            <h3 className="outer-element">Your Files</h3>
            <div className="row">
                <input className="text-field" type="text" placeholder="Search"
                       style={{margin: 0, marginRight: 10 + 'px', flexGrow: 1}} value={searchFiles} onChange={updateSearchFiles} />
                <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={() => setFilePage(filePage => filePage <= 1 ? 1 : filePage - 1)}>
                    <img src="/console/images/arrow.png" alt="-1" style={{width: 70 + '%', height: 70 + '%', transform: 'rotate(90deg)'}} />
                </button>
                <p style={{margin: '0 5px 0 5px'}}>Page {filePage}</p>
                <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={() => setFilePage(filePage => filePage + 1)}>
                    <img src="/console/images/arrow.png" alt="-1" style={{width: 70 + '%', height: 70 + '%', transform: 'rotate(-90deg)'}} />
                </button>
            </div>
            { loadingFiles ? (
                <div className="centered-container" style={{marginTop: 15 + 'px', marginBottom: 25 + 'px'}}>
                    <p>Loading datafiles...</p>
                </div>
            ) : fileError ? (
                <div className="centered-container" style={{marginTop: 15 + 'px', marginBottom: 25 + 'px'}}>
                    <p>Something went wrong, please try again later.</p>
                    <button className="button blue" onClick={reloadFiles}>Reload</button>
                </div>
            ) : (
                <div className="outer-container" style={{display: 'flex', flexDirection: 'column', width: 100 + '%', marginBottom: 20 + 'px'}}>
                    { files.length > 0 ? files.map((file, index) =>
                        <DataFile file={file} dataLabels={dataset.labels} callbackSet={updateFile} callbackRemove={removeFile} key={index} />
                    ) : <p style={{textAlign: 'center'}}>No files to show.</p> }
                </div>
            ) }
        </div>
    );
};

export default DatasetBody;
