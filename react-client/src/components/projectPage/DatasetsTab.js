import React, { useState, useEffect, useCallback } from 'react';
import * as DatasetController from 'controllers/DatasetController';
import * as ProjectController from 'controllers/ProjectController';
import './Tabs.css';

const AvailableDataset = ({ dataset, add, open }) => {
    return (
        <div className="page-list-item">
            <div style={{flexGrow: 1, display: 'flex', alignItems: 'center'}}>
                <p style={{marginBottom: 5 + 'px', color: '#eee'}}><b>{dataset.name}</b></p>
            </div>
            { !add ? null : <button className="image-button text-button" onClick={add.bind(null, dataset)}>Add</button> }
            <button className="image-button text-button" onClick={open.bind(null, dataset)}>Open</button>
        </div>
    );
};

const SelectedDataset = ({ dataset, remove, open }) => {
    return (
        <div className="row selected-dataset" style={{margin: 0}}>
            <button className="image-button" style={{width: 25 + 'px', height: 25 + 'px', marginRight: 10 + 'px'}} onClick={remove.bind(null, dataset)}>
                <img src="/console/images/delete.png" alt="Delete" style={{width: 70 + '%', height: 70 + '%'}} />
            </button>
            <div style={{flexGrow: 1, display: 'flex', alignItems: 'center', marginTop: 15 + 'px', marginBottom: 15 + 'px'}}>
                <p style={{margin: 0, color: '#eee'}}><b>{dataset.name}</b></p>
            </div>
            <button className="image-button text-button" onClick={open.bind(null, dataset)}>Open</button>
        </div>
    );
};

const DatasetsTab = ({ project, setProject }) => {
    const [availableDatasets, setAvailableDatasets] = useState([]);
    const [loadingAvailableDatasets, setLoadingAvailableDatasets] = useState(false);
    const [errorAvailableDatasets, setErrorAvailableDatasets] = useState(false);
    const [searchAvailableDatasets, setSearchAvailableDatasets] = useState('');

    const [errorSelectedDatasets, setErrorSelectedDatasets] = useState(false);

    const reloadAvailableDatasets = useCallback(() => {
        setLoadingAvailableDatasets(true);
        DatasetController.fetchDatasets().then(datasets => {
            setAvailableDatasets(datasets);
            setLoadingAvailableDatasets(false);
            setErrorAvailableDatasets(false);
        }).catch(err => {
            setLoadingAvailableDatasets(false);
            setErrorAvailableDatasets(true);
        });
    }, []);

    useEffect(reloadAvailableDatasets, [reloadAvailableDatasets]);

    const updateSearchAvailableDatasets = event => setSearchAvailableDatasets(event.target.value);

    const isSelected = dataset => project.datasetIDs.indexOf(dataset.datasetID) >= 0;

    const openDataset = dataset => {
        const url = dataset ? `/console/datasets?id=${dataset.datasetID}` : '/console/datasets';
        window.open(new URL(url, window.location.origin).href, '_blank');
    };

    const addDataset = dataset => ProjectController.sendDatasetLink(project.projectID, dataset.datasetID).then(() => {
        setProject(project => {
            const newDatasets = [...project.datasetIDs];
            newDatasets.push(dataset.datasetID);
            return { ...project, datasetIDs: newDatasets };
        });
        setErrorSelectedDatasets(false);
    }).catch(err => setErrorSelectedDatasets(true));

    const removeDataset = dataset => ProjectController.sendDatasetUnlink(project.projectID, dataset.datasetID).then(() => {
        setProject(project => {
            return { ...project, datasetIDs: project.datasetIDs.filter(e => e !== dataset.datasetID) };
        });
        setErrorSelectedDatasets(false);
    }).catch(err => setErrorSelectedDatasets(true));

    const filteredAvailableDatasets = availableDatasets.filter(e => e.name.toLowerCase().includes(searchAvailableDatasets.toLowerCase().trim()));
    return (
        <div className="page">
            <h1 className="outer-element">Datasets</h1>
            <p className="outer-element">Select the datasets that you would like your model to train on.</p>
            <div className="row" style={{marginTop: 15 + 'px'}}>
                <h3 style={{margin: 0}}>Search Datasets</h3>
                <button className="image-button" style={{width: 22 + 'px', height: 22 + 'px', marginLeft: 10 + 'px'}} onClick={reloadAvailableDatasets}>
                    <img src="/console/images/reload.png" alt="Reload" style={{width: 70 + '%', height: 70 + '%'}} />
                </button>
            </div>
            <div className="row" style={{marginTop: 0}}>
                <input className="text-field" type="text" placeholder="Search" style={{flexGrow: 1}} value={searchAvailableDatasets} onChange={updateSearchAvailableDatasets} />
            </div>
            <div className="row">
                <div className="page-list" style={{marginTop: 0 + 'px', marginBottom: 10 + 'px', maxHeight: 200 + 'px', flexGrow: 1}}>
                    { loadingAvailableDatasets ? (
                        <div className="centered-container">
                            <p>Loading datasets...</p>
                        </div>
                    ) : errorAvailableDatasets ? (
                        <div className="centered-container">
                            <p>Something went wrong, please try again later.</p>
                            <button className="button blue" onClick={reloadAvailableDatasets} style={{marginBottom: 10 + 'px'}}>Reload</button>
                        </div>
                    ) : !availableDatasets.length || !filteredAvailableDatasets.length ? (
                        <div className="centered-container">
                            <p>{!availableDatasets.length ? 'You don\'t have any datasets yet.' : 'No results found.'}</p>
                        </div>
                    ) : availableDatasets.map((dataset, index) => (
                        <AvailableDataset dataset={dataset} add={isSelected(dataset) ? null : addDataset} open={openDataset} key={index} />
                    )) }
                </div>
            </div>
            <div className="row" style={{justifyContent: 'center', marginTop: 0}}>
                <button className="button green" onClick={openDataset.bind(null, null)}>Open Dataset Editor</button>
            </div>
            <h3 className="outer-element" style={{marginBottom: 15 + 'px'}}>Selected Datasets</h3>
            { errorSelectedDatasets ? <p className="outer-element" style={{color: '#ff3333'}}>Error while updating selecting datasets</p> : null }
            { !project.datasetIDs.length ? (
                <div className="centered-container" style={{height: 'auto'}}>
                    <p style={{marginBottom: 20 + 'px'}}>No datasets have been added to this project.</p>
                </div>
            ) : project.datasetIDs.map(datasetID => {
                const dataset = availableDatasets.find(e => e.datasetID === datasetID);
                if(!dataset)
                    return null;
                return <SelectedDataset dataset={dataset} remove={removeDataset} open={openDataset} key={datasetID}/>;
            }) }
        </div>
    );
};

export default DatasetsTab;
