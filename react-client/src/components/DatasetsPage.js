import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import MenuBar from './MenuBar';
import DatasetBody from './datasetsPage/DatasetBody';
import './DatasetsPage.css';
import './projectPage/Tabs.css';
import * as Controller from 'controllers/DatasetController';

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

    const updateDatasetName = (datasetID, name) => setDatasets(datasets => {
        const newDatasets = [...datasets];
        newDatasets.filter(e => e.datasetID === datasetID).forEach(e => e.name = name);
        return newDatasets;
    });

    const createDataset = () => Controller.sendNewDataset('New Dataset').then(datasetID => setDatasets(datasets => {
        const newDatasets = [...datasets];
        newDatasets.push({ datasetID, name: 'New Dataset', lastModified: Date.now() });
    })).catch(err => setError(true));

    const leaveDataset = () => setSearchParams({});

    const dataset = currentDataset();
    return (
        <div className="datasets-page">
            <MenuBar />
            <div className="datasets-container">
                <div className="datasets-sidebar">
                    <h2>Your Datasets</h2>
                    <input type="text" className="text-field" placeholder="Search" value={searchDatasets} onChange={updateSearch} style={{marginBottom: 10 + 'px'}} />
                    <div className="datasets-sidebar-scroll">
                        { datasets.map((dataset, index) => {
                            if(!dataset.name.toLowerCase().includes(searchDatasets.trim().toLowerCase()))
                                return null;
                            return <DatasetItem dataset={dataset} key={index} selID={currentDatasetID()} callback={selectDataset} />;
                        }) }
                    </div>
                    <div style={{flexGrow: 1}} />
                    <button className="button green" onClick={createDataset} style={{marginTop: 10 + 'px'}}>Create New Dataset</button>
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
                    ) : <DatasetBody datasetID={dataset.datasetID} updateName={updateDatasetName.bind(null, dataset.datasetID)} leave={leaveDataset} /> }
                </div>
            </div>
        </div>
    );
};

export default DatasetsPage;
