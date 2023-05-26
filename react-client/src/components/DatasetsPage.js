import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import MenuBar from './MenuBar';
import './DatasetsPage.css';
import './projectPage/Tabs.css';
import * as GenController from 'controllers/GeneralController';
import * as Controller from 'controllers/DatasetController';

const ProvisionalFile = ({ file, remove }) => {
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

const DataLabel = ({ label, callbackEdit, callbackRemove }) => {
    const [editing, setEditing] = useState(false);
    const [provisionalLabel, setProvisionalLabel] = useState('');
    const editField = useRef(null);

    useEffect(() => {
        if(editing && editField.current)
            editField.current.select();
    }, [editing, label]);

    const updateProvisionalValue = event => setProvisionalLabel(event.target.value);

    const editFieldKeyDown = event => {
        if(event.key === 'Enter')
            saveLabel();
    };

    const editLabel = () => {
        setEditing(true);
        setProvisionalLabel(label);
    }

    const saveLabel = () => {
        setEditing(false);
        callbackEdit(label, provisionalLabel.trim());
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
            <p>{label}</p>
            <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={editLabel}>
                <img src="/console/images/edit.png" alt="/console/images/edit.png" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
            <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px'}} onClick={callbackRemove.bind(null, label)}>
                <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
        </div>
    );
};

const DataFile = ({ file, dataLabels, callbackRemove }) => {
    return (
        <div className="datasets-file">
            <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px', marginRight: 10 + 'px'}} onClick={callbackRemove.bind(null, file)}>
                <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
            <p style={{width: 45 + '%'}}>{file.name}</p>
            <p style={{width: 15 + '%'}}>{GenController.getFileSizeString(file.size)}</p>
            <p style={{width: 15 + '%'}}>{file.type}</p>
            <select className="text-field" style={{margin: 0, width: 25 + '%'}}>
                { dataLabels.map((label, index) => <option value={label} key={index}>{label}</option>) }
                <option value={'custom'}>Custom Value</option>
            </select>
        </div>
    );
};

const DatasetsBody = ({ dataset }) => {
    const [dataLabels, setDataLabels] = useState(['Bee', 'Human']);
    const [files, setFiles] = useState([]);
    const [searchFiles, setSearchFiles] = useState('');
    const [edited, setEdited] = useState(false);

    const [provisionalFiles, setProvisionalFiles] = useState([]);
    const [uploadDragging, setUploadDragging] = useState(false);
    const fileInput = useRef(null);

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

    const updateSearchFiles = event => setSearchFiles(event.target.value);

    const uploadFiles = () => {
        setFiles(files => [...files, ...provisionalFiles]);
        setProvisionalFiles([]);
        setEdited(true);
    };

    const removeFile = file => {
        setFiles(files => {
            const newFiles = [...files];
            const indexToRemove = newFiles.indexOf(file);
            if(indexToRemove >= 0)
                newFiles.splice(indexToRemove, 1);
            return newFiles;
        });
        setEdited(true);
    }

    const addDataLabel = () => setDataLabels(dataLabels => {
        const newDataLabels = [...dataLabels];
        let label = 'New Label', iteration = '';
        if(newDataLabels.indexOf(label) >= 0) {
            iteration = 0;
            while(newDataLabels.indexOf(label + iteration) >= 0)
                iteration++;
        }
        newDataLabels.push(label + iteration);
        return newDataLabels;
    });

    const updateDataLabel = (oldLabel, newLabel) => setDataLabels(dataLabels => {
        const newDataLabels = [...dataLabels];
        if(newDataLabels.indexOf(newLabel) >= 0)
            return newDataLabels;
        const indexToUpdate = newDataLabels.indexOf(oldLabel);
        if(indexToUpdate >= 0)
            newDataLabels[indexToUpdate] = newLabel;
        return newDataLabels;
    });

    const removeDataLabel = label => setDataLabels(dataLabels => {
        const newDataLabels = [...dataLabels];
        const indexToRemove = newDataLabels.indexOf(label);
        if(indexToRemove >= 0)
            newDataLabels.splice(indexToRemove, 1);
        return newDataLabels;
    });

    const save = () => {
        // TODO everything else here obviously
        setEdited(false);
    };

    const noFilesFound = files.length > 0 && files.filter(file => file.name.toLowerCase().includes(searchFiles.trim().toLowerCase())).length === 0;
    return (
        <div style={{display: 'flex', flexDirection: 'column', height: 100 + '%', overflow: 'hidden'}}>
            <div className="page" style={{flexGrow: 1}}>
                <h2 className="outer-element" style={{marginBottom: 10 + 'px'}}>{dataset.name}</h2>

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
                        <button className="button red" disabled={!provisionalFiles.length} onClick={removeProvisionalFiles}>Remove</button>
                        <button className="button green" disabled={!provisionalFiles.length} onClick={uploadFiles}>Upload</button>
                    </div>
                </div>

                <h3 className="outer-element">Data Labels</h3>
                <div className="outer-element data-label-container">
                    { dataLabels.map((label, index) => (
                        <DataLabel label={label} callbackEdit={updateDataLabel} callbackRemove={removeDataLabel} />
                    )) }
                    <button className="image-button" style={{width: 25 + 'px', height: 25 + 'px', margin: '10px 0 10px 7px'}} onClick={addDataLabel}>
                        <img src="/console/images/delete.png" alt="/console/images/delete.png"
                             style={{width: 70 + '%', height: 70 + '%', transform: 'rotate(45deg)'}} />
                    </button>
                </div>

                <h3 className="outer-element">Your Files</h3>
                <div className="row">
                    <input className="text-field" type="text" placeholder="Search"
                           style={{margin: 0, width: 100 + '%'}} value={searchFiles} onChange={updateSearchFiles} />
                </div>
                <div className="outer-container" style={{display: 'flex', flexDirection: 'column', width: 100 + '%', marginBottom: 20 + 'px'}}>
                    { files.length > 0 ? files.map((file, index) => {
                        if(file.name.toLowerCase().includes(searchFiles.trim().toLowerCase()))
                            return (<DataFile file={file} dataLabels={dataLabels} callbackRemove={removeFile} key={index} />);
                        else return null;
                    }) : <p style={{textAlign: 'center'}}>You haven't added any files yet.</p> }
                    { noFilesFound ? <p style={{textAlign: 'center'}}>No results found.</p> : null }
                </div>
            </div>
            <div className="datasets-save-block">
                <button className="button red">Cancel</button>
                <button className="button green" disabled={!edited} onClick={save}>Save</button>
            </div>
        </div>
    );
};

const DatasetItem = ({ dataset, selID, callback }) => {
    return (
        <button className="selectable-text-button" disabled={dataset.datasetID === selID} onClick={callback.bind(null, dataset)}>
            <p style={{margin: '10px 0 10px 0'}}>{dataset.name}</p>
        </button>
    );
};

const DatasetsPage = () => {
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [searchDatasets, setSearchDatasets] = useState('');

    const [searchParams, setSearchParams] = useSearchParams();

    const currentDatasetID = useCallback(() => {
        let id = searchParams.get('id');
        return id === null ? null : parseInt(id);
    }, [searchParams]);

    const currentDataset = useCallback(() => {
        let datasetID = currentDatasetID();
        if(datasetID === null)
            return null;
        let dataset = datasets.find(e => e.datasetID === datasetID);
        return !dataset ? { noSuchDataset: true } : dataset;
    }, [currentDatasetID, datasets]);

    const reload = useCallback(() => {
        setLoading(true);
        Controller.fetchDatasets().then(result => {
            setDatasets(result);
            setError(false);
            setLoading(false);
        }).catch(err => {
            setError(true);
            setLoading(false);
        });
    }, []);

    useEffect(() => reload(), [reload]);

    const updateSearch = event => setSearchDatasets(event.target.value);

    const selectDataset = dataset => setSearchParams({ id: dataset.datasetID });

    const dataset = currentDataset();
    return (
        <div className="datasets-page">
            <MenuBar />
            <div className="datasets-container">
                <div className="datasets-sidebar">
                    <h2>Your Datasets</h2>
                    <input type="text" className="text-field" placeholder="Search" value={searchDatasets} onChange={updateSearch} />
                    <div className="datasets-sidebar-scroll">
                        { datasets.map((dataset, index) => {
                            if(!dataset.name.toLowerCase().includes(searchDatasets.trim().toLowerCase()))
                                return null;
                            return <DatasetItem dataset={dataset} key={index} selID={currentDatasetID()} callback={selectDataset} />;
                        }) }
                    </div>
                </div>
                <div className="datasets-primary">
                    { loading ? (
                        <div className="centered-container">
                            <p>Loading datasets...</p>
                        </div>
                    ) : error ? (
                        <div className="centered-container">
                            <p>Something went wrong, please try again later.</p>
                            <button className="button blue" onClick={reload}>Reload</button>
                        </div>
                    ) : !dataset ? null : dataset.noSuchDataset ? (
                        <div className="centered-container">
                            <p>No such dataset exists.</p>
                        </div>
                    ) : <DatasetsBody dataset={dataset} /> }
                </div>
            </div>
        </div>
    );
};

export default DatasetsPage;
