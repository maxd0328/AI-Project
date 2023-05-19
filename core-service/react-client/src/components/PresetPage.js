import React, { useState, useCallback, useEffect } from 'react';
import {useSearchParams} from 'react-router-dom';
import ScriptEditor from './script/ScriptEditor';
import './PresetPage.css';
import MenuBar from './MenuBar';
import * as ProjectController from '../controllers/ProjectController';

const PresetPage = () => {
    // Set up states
    const [presets, setPresets] = useState([]);
    const [error, setError] = useState(false);
    const [searchPresets, setSearchPresets] = useState('');
    const [preset, setPreset] = useState(null);

    // We use the search query to decide which preset to show
    const [searchParams, setSearchParams] = useSearchParams();

    // Function to get the current preset ID from the search query, null if there is none
    const currentPresetID = useCallback(() => {
        let id = searchParams.get('id');
        return id === null ? null : parseInt(id);
    }, [searchParams]);

    // Function to get the preset object associated with the current preset ID
    // If there is no search query it returns null
    // If there is no preset object corresponding to the ID, an object containing a truthy value for the field 'noSuchPreset' is returned
    const currentPreset = useCallback(() => {
        let presetID = currentPresetID();
        if(presetID == null)
            return null;
        let preset = presets.find(e => e.presetID === presetID);
        return !preset ? { noSuchPreset: true } : preset;
    }, [currentPresetID, presets]);

    // Function to reload the list of presets from the server
    const reload = useCallback(() => {
        ProjectController.fetchPresets().then(result => {
            setPresets(result);
            setError(false);
        }).catch(err => setError(true));
    }, []);

    // Reload all presets on mount
    useEffect(() => reload(), [reload]);

    // When the current preset changes, we fetch the content from the server (and pass name/description etc. to the same state object)
    useEffect(() => {
        const newPreset = currentPreset();
        if(!newPreset || newPreset.noSuchPreset)
            setPreset(newPreset);
        else ProjectController.fetchPresetContent(newPreset.presetID).then(content => setPreset({ ...newPreset, content }))
            .catch(err => setError(true));
    }, [currentPreset]);

    // Handler functions
    const updateSearchPresets = (event) => setSearchPresets(event.target.value);

    const select = (preset) => setSearchParams({ id: preset.presetID });

    // Render the page
    return (
        <div className="preset-page">
            <MenuBar />
            <div className="preset-page-container">
                <div className="preset-page-sidebar">
                    <p className="small-header" style={{fontSize: 20 + 'px'}}><b>Search Presets</b></p>
                    <input type="text" placeholder="Search" className="text-field"
                           onChange={updateSearchPresets} value={searchPresets} style={{marginBottom: 10 + 'px'}}/>
                    <div className="preset-page-sidebar-scroll">
                        { presets.filter(e => e.name.toLowerCase().includes(searchPresets.trim().toLowerCase())).map((preset, index) => (
                            <button key={index} className="preset-button" disabled={currentPresetID() === preset.presetID} onClick={select.bind(null, preset)}>
                                <p>{preset.name}</p>
                            </button>
                        )) }
                    </div>
                </div>
                { error ? (
                    <div className="preset-primary preset-error">
                        <p style={{marginBottom: 10 + 'px'}}>Something went wrong. Please try again later.</p>
                        <button className="button blue" onClick={reload}>Reload</button>
                    </div>
                ) : preset === null ? null
                  : preset.noSuchPreset ? (
                    <div className="preset-primary preset-error">
                        <p>Preset does not exist.</p>
                    </div>
                ) : [
                    <div className="preset-primary preset-overview" key={1}>
                        <h3>Name</h3>
                        <p>{preset.name}</p>
                        <h3>Description</h3>
                        <p>{preset.description}</p>
                    </div>,
                    <div className="preset-primary preset-content" key={2}>
                        <ScriptEditor callback={null}>
                            {preset.content}
                        </ScriptEditor>
                    </div>
                ] }
            </div>
        </div>
    );
};

export default PresetPage;
