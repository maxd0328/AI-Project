import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Controller from 'controllers/ProjectController';
import ScriptStageBody from './configurationTab/ScriptStageBody';
import InlineStageBody from './configurationTab/InlineStageBody';
import EasyStageBody from './configurationTab/EasyStageBody';
import compile from 'compiler/Compiler';
import decompile from 'compiler/Decompiler';
import './Tabs.css';
import './ConfigurationTab.css';

const nothingFound = () => (<p style={{width: 100 + '%', height: 100 + '%', textAlign: 'center'}}>No results found.</p>);

/* Represents a list item in the list of presets */
const ConfigurationPreset = ({ preset, apply }) => {
    const openPresetPage = useCallback(() => {
        const url = preset ? `/console/presets?id=${preset.presetID}` : '/console/presets';
        window.open(new URL(url, window.location.origin).href, '_blank');
    }, [preset]);

    return (
        <div className="page-list-item">
            <div style={{flexGrow: 1}}>
                <p style={{marginBottom: 5 + 'px', color: '#eee'}}><b>{preset.name}</b></p>
                <p style={{fontSize: 12 + 'px'}}>{preset.description}</p>
            </div>
            <button className="image-button text-button" onClick={apply.bind(null, preset)}>Use</button>
            <button className="image-button text-button" onClick={openPresetPage}>View</button>
        </div>
    );
};

/* Represents a single pipeline stage, including the header */
const PipelineStage = ({ stage, set, remove, swap }) => {
    const [expanded, setExpanded] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [provisionalName, setProvisionalName] = useState('');
    const editNameField = useRef(null);

    // When clicking edit name, focus the text field and set the initial text equal to the current name
    useEffect(() => {
        if(editingName && editNameField.current)
            editNameField.current.select();
    }, [editingName]);

    // Handler functions
    const toggleExpanded = () => setExpanded(expanded => !expanded);

    const editName = () => {
        setEditingName(true);
        setProvisionalName(stage.name);
    }

    const editNameKeyDown = event => {
        if(event.key === 'Enter')
            saveName();
    };

    const saveName = () => {
        setEditingName(false);
        set({ // Apply changes to parent (this component holds no permanent state)
            ...stage,
            name: provisionalName
        });
    }

    const cancelName = () => setEditingName(false);

    const updateProvisionalName = (event) => setProvisionalName(event.target.value);

    // Render the pipeline stage, including the line underneath it if 'bar' is set to true (which is the case when it's not the last element)
    return [
        <div className="pipeline-stage" key={1}>
            { !editingName ? ( // When not editing the name
                <div className="pipeline-header">
                    <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px', marginRight: 5 + 'px',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'}} onClick={toggleExpanded}>
                        <img src="/console/images/arrow.png" alt="/console/images/arrow.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                    </button>
                    <p style={{margin: 0, fontSize: 16 + 'px'}}><b>{stage.name}</b></p>
                    <button className="image-button" style={{width: 25 + 'px', height: 25 + 'px', marginLeft: 5 + 'px'}} onClick={editName}>
                        <img src="/console/images/edit.png" alt="/console/images/edit.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                    </button>
                    <div style={{flexGrow: 1}} />

                    <button className="image-button" style={{width: 25 + 'px', height: 25 + 'px', transform: 'rotate(180deg)'}} onClick={swap.bind(null, -1)}>
                        <img src="/console/images/arrow.png" alt="/console/images/arrow.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                    </button>
                    <button className="image-button" style={{width: 25 + 'px', height: 25 + 'px', marginLeft: 5 + 'px'}} onClick={swap.bind(null, 1)}>
                        <img src="/console/images/arrow.png" alt="/console/images/arrow.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                    </button>
                    <button className="image-button" style={{width: 25 + 'px', height: 25 + 'px', marginLeft: 15 + 'px'}} onClick={remove}>
                        <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                    </button>
                </div>
            ) : ( // When editing the name
                <div className="pipeline-header">
                    <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px', marginRight: 10 + 'px',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'}} onClick={toggleExpanded}>
                        <img src="/console/images/arrow.png" alt="/console/images/arrow.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                    </button>
                    <input type="text" placeholder="Stage Name" className="text-field" style={{flexGrow: 1, marginRight: 10 + 'px'}}
                           ref={editNameField} onChange={updateProvisionalName} value={provisionalName} onKeyDown={editNameKeyDown}/>
                    <button className="button red" onClick={cancelName}>Cancel</button>
                    <button className="button green" onClick={saveName}>Save</button>
                </div>
            ) }

            { expanded ? ( // If it's expanded, render the body based on the type of stage
                <div className="pipeline-container">
                    { stage.type === 'ext' ? (
                        <ScriptStageBody stage={stage} set={set} />
                    ) : stage.type === 'int' ? (
                        <InlineStageBody stage={stage} set={set} />
                    ) : stage.type === 'gen' ? (
                        <EasyStageBody stage={stage} set={set} />
                    ) : null }
                </div>
            ) : null }
        </div>,
        <div className="vertical-line-container" key={2}>
            <div className="vertical-line"/>
        </div>
    ];
};

/* Represents the entire configuration tab */
const ConfigurationTab = ({ project, setProject }) => {
    // State to store whether an edit has been made (enable the save button)
    const [edited, setEdited] = useState(false);

    // Preset related states
    const [showSearchPresets, setShowSearchPresets] = useState(false);
    const [searchPresets, setSearchPresets] = useState('');
    const [presets, setPresets] = useState([]);
    const [currentPresetID, setCurrentPresetID] = useState(null); // Provisional, not final
    const [presetError, setPresetError] = useState(false);

    // Stage related states
    const [stages, setStages] = useState([]);
    const [stageError, setStageError] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [loadingStages, setLoadingStages] = useState(true);
    const stageKey = useRef(0); // Used simply for unique keys for each stage, allows it to persist its state after being moved

    // Reloads the preset list from the server
    const reloadPresets = useCallback(() => {
        Controller.fetchPresets().then(result => {
            setPresets(result);
            setPresetError(false);
        }).catch(err => setPresetError(true));
    }, []);

    // Reloads the saved config pipeline and preset choice from the server
    const reloadConfig = useCallback(() => {
        if(project.projectID === null || project.projectID === undefined)
            return;
        setLoadingStages(true);
        Controller.fetchStages(project.projectID).then(result => {
            for(let i = 0 ; i < result.length ; ++i)
                result[i].key = stageKey.current++;

            setStages(result);
            setStageError(false);
            setCurrentPresetID(project.presetID);
            setEdited(false);
            setLoadingStages(false);
        }).catch(err => {
            setStageError(true);
            setLoadingStages(false);
        });
    }, [project]);

    // When the component is first mounted, load the preset list
    useEffect(() => reloadPresets(), [reloadPresets]);

    // Whenever a change is made to the project (including init), reload the configuration
    useEffect(() => reloadConfig(), [reloadConfig]);

    // Fetch preset from preset list given the presetID
    const getPreset = (presetID) => {
        const preset = presets.find(e => e.presetID === presetID);
        return preset ? preset : { presetID, name: '', description: '' };
    };

    // Handler functions
    const toggleShowSearchPresets = () => setShowSearchPresets(showSearchPresets => !showSearchPresets);

    const updateSearchPresets = (event) => setSearchPresets(event.target.value);

    const updateCurrentPreset = (preset) => {
        setCurrentPresetID(preset.presetID);
        setEdited(true);
    };

    const deleteCurrentPreset = () => {
        setCurrentPresetID(null);
        setEdited(true);
    };

    const addStage = (stage) => {
        setStages(stages => {
            const newStages = [...stages];
            newStages.push(stage);
            return newStages;
        });
        setEdited(true);
    };

    const addEasyStage = addStage.bind(null, { name: 'New Stage', type: 'gen', content: '', key: stageKey.current++ });
    const addInlineStage = addStage.bind(null, { name: 'New Stage', type: 'int', content: '\n# Write your script here\n', key: stageKey.current++ });
    const addScriptStage = addStage.bind(null, { name: 'New Stage', type: 'ext', scriptID: null, key: stageKey.current++ });

    const addStarterStage = () => {
        if(currentPresetID !== null) {
            Controller.fetchPresetContent(currentPresetID).then(content => {
                const { output } = compile(content);
                const showContentOnly = decompile(output, false, true);
                addStage({ name: 'Starter Configuration', type: 'gen', content: showContentOnly, key: stageKey.current++ });
            }).catch(err => setPresetError(true));
        }
    };

    const updateStage = (index, stage) => {
        setStages(stages => {
            const newStages = [...stages];
            newStages[index] = stage;
            return newStages;
        });
        setEdited(true);
    };

    const swapStage = (index, offset) => {
        if(index + offset < 0 || index + offset >= stages.length)
            return;
        setStages(stages => {
            const newStages = [...stages];
            const current = newStages[index];
            newStages[index] = newStages[index + offset];
            newStages[index + offset] = current;
            return newStages;
        });
        setEdited(true);
    };

    const deleteStage = (index) => {
        setStages(stages => {
            const newStages = [...stages];
            newStages.splice(index, 1);
            return newStages;
        });
        setEdited(true);
    };

    const cancelConfig = () => reloadConfig();

    const saveConfig = () => {
        // Create a copy of the stages without the key property (because it's only used in the React app)
        const outStages = stages.map(e => {
            const { key, ...rest } = e;
            return rest;
        });
        Controller.saveStages(project.projectID, currentPresetID, outStages).then(() => {
            setProject({ ...project, presetID: currentPresetID });
            setEdited(false);
        }).catch(err => setSaveError(true));
    };

    // Render the configuration tab
    const filteredPresets = presets.filter(preset => preset.name.toLowerCase().includes(searchPresets.trim().toLowerCase()));
    return (
        <div className="page">
            <h1 className="outer-element">Configuration</h1>

            <h3 className="outer-element">Preset</h3>
            <div className="row">
                <p style={{margin: 0}}>{currentPresetID === null ? 'None' : getPreset(currentPresetID).name}</p>
                { currentPresetID === null ? null : (
                    <button className="image-button" style={{marginLeft: 5 + 'px', width: 20 + 'px', height: 20 + 'px'}} onClick={deleteCurrentPreset}>
                        <img src="/console/images/delete.png" alt="/console/images/delete.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                    </button>
                ) }
                <button className="image-button"
                        style={{marginLeft: 5 + 'px', width: 20 + 'px', height: 20 + 'px', transform: showSearchPresets ? 'rotate(180deg)' : 'rotate(0deg)'}}
                        onClick={toggleShowSearchPresets}>
                    <img src="/console/images/arrow.png" alt="/console/images/arrow.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                </button>
            </div>
            { showSearchPresets ? !presetError ? (
                <div className="page-block">
                    <h3 style={{marginTop: 10 + 'px', marginBottom: 5 + 'px'}}>Search Presets</h3>
                    <input type="text" placeholder="Search" className="text-field" value={searchPresets} onChange={updateSearchPresets}/>
                    <div className="page-list" style={{marginTop: 5 + 'px', marginBottom: 10 + 'px', maxHeight: 200 + 'px'}}>
                        { filteredPresets.length === 0 ? nothingFound()
                            : filteredPresets.map((preset, index) =>
                                <ConfigurationPreset key={index} preset={preset} apply={updateCurrentPreset} />) }
                    </div>
                </div>
            ) : (
                <div className="page-block" style={{alignItems: 'center'}}>
                    <p style={{marginBottom: 10 + 'px'}}>Something went wrong, please try again later.</p>
                    <button className="button blue" style={{marginBottom: 10 + 'px'}} onClick={reloadPresets}>Reload</button>
                </div>
            ) : null }

            <h3 className="outer-element" style={{marginTop: 20 + 'px'}}>Pipeline</h3>
            { loadingStages ? (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 100 + '%'}}>
                    <p>Loading pipeline...</p>
                </div>
            ) : !stageError ? [
                stages.length === 0 ? (
                    <div style={{width: 100 + '%', textAlign: 'center'}}>
                        <div className="row" style={{justifyContent: 'center', marginTop: 30 + 'px'}}>
                            <button className="button green outer-element" style={{margin: 0}} disabled={currentPresetID === null} onClick={addStarterStage}>
                                { currentPresetID === null ? 'Choose a preset first' : 'Create Starter Configuration' }
                            </button>
                        </div>
                        <p>Or, if you've done this kind of thing before:</p>
                    </div>
                ) : null,

                <div className="outer-container" style={{width: 100 + '%', marginBottom: 0, paddingBottom: 0}} key={1}>
                    { stages.map((stage, index) => (
                        <PipelineStage stage={stage} set={updateStage.bind(null, index)} key={stage.key}
                                       remove={deleteStage.bind(null, index)} swap={swapStage.bind(null, index)} />
                    )) }
                </div>,

                <div className="row" style={{justifyContent: 'center', marginTop: 0}} key={2}>
                    <div className="add-stage-container">
                        <button className="button blue" onClick={addEasyStage}>Add Easy Stage</button>
                        <button className="button blue" onClick={addInlineStage}>Add Inline Stage</button>
                        <button className="button blue" onClick={addScriptStage}>Add Script Stage</button>
                    </div>
                </div>,

                <div style={{flexGrow: 1}} key={3}/>,
                <div className="row" style={{justifyContent: 'right', marginBottom: 20 + 'px'}} key={4}>
                    { saveError ? (
                        <p style={{color: '#f44', margin: 0, marginRight: 10 + 'px'}}>Save failed. Please try again later.</p>
                    ) : null }
                    <button className="button red" onClick={cancelConfig}>Cancel</button>
                    <button className="button green" onClick={saveConfig} disabled={!edited}>Save</button>
                </div>
            ] : (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 100 + '%'}}>
                    <p style={{marginBottom: 10 + 'px'}}>Something went wrong, please try again later.</p>
                    <button className="button blue" style={{marginBottom: 10 + 'px'}} onClick={reloadConfig}>Reload</button>
                </div>
            ) }
        </div>
    );
};

export default ConfigurationTab;
