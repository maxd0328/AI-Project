import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Controller from '../../controllers/ProjectController';
import * as ScriptController from '../../controllers/ScriptController';
import './Pages.css';
import '../../Styles.css';
import './ConfigurationPage.css';

const nothingFound = () => <p style={{width: 100 + '%', height: 100 + '%', textAlign: 'center'}}>No results found.</p>;

const ConfigurationPreset = ({ preset, apply }) => {
    return (
        <div className="page-list-item">
            <div style={{flexGrow: 1}}>
                <p style={{marginBottom: 5 + 'px', color: '#eee'}}><b>{preset.name}</b></p>
                <p style={{fontSize: 12 + 'px'}}>{preset.description}</p>
            </div>
            <button className="image-button text-button" onClick={apply.bind(null, preset)}>Use</button>
            <button className="image-button text-button">View</button>
        </div>
    )
};

const ScriptOption = ({ script, apply }) => {
    return (
        <div className="page-list-item" style={{alignItems: 'center'}}>
            <p style={{flexGrow: 1, marginBottom: 5 + 'px', color: '#eee'}}><b>{script.name}</b></p>
            <button className="image-button text-button" onClick={apply.bind(null, script)}>Use</button>
            <button className="image-button text-button">Open</button>
        </div>
    );
};

const PipelineStage = ({ stage, set, remove, swap, bar }) => {
    const [expanded, setExpanded] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [provisionalName, setProvisionalName] = useState('');
    const editNameField = useRef(null);

    useEffect(() => {
        if(editingName) {
            editNameField.current.focus();
            setProvisionalName(stage.name);
        }
    }, [editingName, stage]);

    const toggleExpanded = () => setExpanded(expanded => !expanded);

    const editName = () => setEditingName(true);

    const saveName = () => {
        setEditingName(false);
        stage.name = provisionalName;
        set(stage);
    }

    const cancelName = () => setEditingName(false);

    const updateProvisionalName = (event) => setProvisionalName(event.target.value);

    return [
        <div className="pipeline-stage" key={1}>
            { !editingName ? (
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
            ) : (
                <div className="pipeline-header">
                    <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px', marginRight: 10 + 'px',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'}} onClick={toggleExpanded}>
                        <img src="/console/images/arrow.png" alt="/console/images/arrow.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                    </button>
                    <input type="text" placeholder="Stage Name" className="text-field" style={{flexGrow: 1, marginRight: 10 + 'px'}}
                           ref={editNameField} onChange={updateProvisionalName} value={provisionalName}/>
                    <button className="button red" onClick={cancelName}>Cancel</button>
                    <button className="button green" onClick={saveName}>Save</button>
                </div>
            ) }

            { expanded ? (
                <div className="pipeline-container">
                    { stage.type === 'ext' ? (
                        <ScriptStageBody stage={stage} set={set} />
                    ) : stage.type === 'int' ? (
                        null
                    ) : stage.type === 'gen' ? (
                        null
                    ) : null }
                </div>
            ) : null }
        </div>,
        bar ? (
            <div className="vertical-line-container" key={2}>
                <div className="vertical-line"/>
            </div>
        ) : null
    ];
}

const ScriptStageBody = ({ stage, set }) => {
    const [showSearchScripts, setShowSearchScripts] = useState(false);
    const [searchScripts, setSearchScripts] = useState('');
    const [scripts, setScripts] = useState([]);
    const [scriptError, setScriptError] = useState(false);

    const reload = useCallback(() => {
        ScriptController.fetchScripts().then(result => {
            setScripts(result);
            setScriptError(false);
        }).catch(err => setScriptError(true));
    }, []);

    useEffect(() => reload(), [reload]);

    const getScript = (scriptID) => {
        const script = scripts.find(e => e.scriptID === scriptID);
        return script ? script : { scriptID, name: '' };
    };

    const toggleShowSearchScripts = () => setShowSearchScripts(showSearchScripts => !showSearchScripts);

    const updateSearchScripts = (event) => setSearchScripts(event.target.value);

    const updateSelectedScript = (script) => {
        stage.scriptID = script.scriptID;
        set(stage);
    }

    const filteredScripts = scripts.filter(script => script.name.toLowerCase().includes(searchScripts.trim().toLowerCase()));
    return (
        <div>
            <div style={{display: 'flex', flexDirection: 'row', marginBottom: 10 + 'px'}}>
                <p style={{margin: '0 5px 0 0'}}>{stage.scriptID === null ? 'No script selected' : getScript(stage.scriptID).name}</p>
                <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px',
                        transform: showSearchScripts ? 'rotate(180deg)' : 'rotate(0deg)'}} onClick={toggleShowSearchScripts}>
                    <img src="/console/images/arrow.png" alt="/console/images/arrow.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                </button>
            </div>

            { showSearchScripts ? !scriptError ? (
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <p style={{marginTop: 10 + 'px', marginBottom: 5 + 'px', color: '#eee'}}><b>Search Scripts</b></p>
                    <input type="text" placeholder="Search" className="text-field" value={searchScripts} onChange={updateSearchScripts}/>
                    <div className="page-list" style={{marginTop: 5 + 'px', marginBottom: 10 + 'px', maxHeight: 200 + 'px'}}>
                        { filteredScripts.length === 0 ? nothingFound()
                            : filteredScripts.map((script, index) =>
                                <ScriptOption key={index} script={script} apply={updateSelectedScript} />) }
                    </div>
                </div>
            ) : (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <p style={{marginTop: 5 + 'px', marginBottom: 10 + 'px'}}>Something went wrong. Please try again later.</p>
                    <button className="button blue" onClick={reload} style={{marginBottom: 5 + 'px'}}>Reload</button>
                </div>
            ) : null }
        </div>
    );
};

const ConfigurationPage = ({project}) => {
    const [showSearchPresets, setShowSearchPresets] = useState(false);
    const [searchPresets, setSearchPresets] = useState('');
    const [presets, setPresets] = useState([]);
    const [currentPresetID, setCurrentPresetID] = useState(null);
    const [presetError, setPresetError] = useState(false);

    const [stages, setStages] = useState([]);
    const [stageError, setStageError] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const stageKey = useRef(0);

    const reloadPresets = useCallback(() => {
        Controller.fetchPresets().then(result => {
            setPresets(result);
            setPresetError(false);
        }).catch(err => setPresetError(true));
    }, []);

    const reloadStages = useCallback(() => {
        Controller.fetchStages(project.projectID).then(result => {
            for(let i = 0 ; i < result.length ; ++i)
                result[i].key = stageKey.current += 2;

            setStages(result);
            setStageError(false);
        }).catch(err => setStageError(true));
    }, [project]);

    useEffect(() => {
        reloadPresets();
        reloadStages();
        setCurrentPresetID(project.presetID);
    }, [reloadPresets, reloadStages, project]);

    const getPreset = (presetID) => {
        const preset = presets.find(e => e.presetID === presetID);
        return preset ? preset : { presetID, name: '', description: '' };
    };

    const toggleShowSearchPresets = () => setShowSearchPresets(showSearchPresets => !showSearchPresets);

    const updateSearchPresets = (event) => setSearchPresets(event.target.value);

    const updateCurrentPreset = (preset) => setCurrentPresetID(preset.presetID);

    const deleteCurrentPreset = () => setCurrentPresetID(null);

    const addScriptStage = (stage) => setStages(stages => {
        const newStages = [...stages];
        newStages.push({ name: 'New Stage', type: 'ext', scriptID: null, key: stageKey.current += 2 });
        return newStages;
    });

    const updateStage = (index, stage) => setStages(stages => {
        const newStages = [...stages];
        newStages[index] = stage;
        return newStages;
    });

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
    };

    const deleteStage = (index) => setStages(stages => {
        const newStages = [...stages];
        newStages.splice(index, 1);
        return newStages;
    });

    const cancelConfig = () => window.location.hash = 'details';

    const saveConfig = () => {
        Controller.saveStages(project.projectID, stages)
            .catch(err => setSaveError(true));
    };

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
            { !stageError ? [
                <div className="outer-container" style={{width: 100 + '%', marginBottom: 10 + 'px'}} key={1}>
                    { stages.map((stage, index) => (
                        <PipelineStage stage={stage} set={updateStage.bind(null, index)} key={stage.key}
                                       remove={deleteStage.bind(null, index)} swap={swapStage.bind(null, index)}
                                       bar={index < stages.length - 1} />
                    )) }
                </div>,

                <div className="row" style={{justifyContent: 'center', marginBottom: 20 + 'px'}} key={2}>
                    <button className="button blue" onClick={addScriptStage}>Add Script Stage</button>
                </div>,

                <div style={{flexGrow: 1}} key={3}/>,
                <div className="row" style={{justifyContent: 'right', marginBottom: 20 + 'px'}} key={4}>
                    { saveError ? (
                        <p style={{color: '#f44', margin: 0, marginRight: 10 + 'px'}}>Save failed. Please try again later.</p>
                    ) : null }
                    <button className="button red" onClick={cancelConfig}>Cancel</button>
                    <button className="button green" onClick={saveConfig}>Save</button>
                </div>
            ] : (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 100 + '%'}}>
                    <p style={{marginBottom: 10 + 'px'}}>Something went wrong, please try again later.</p>
                    <button className="button blue" style={{marginBottom: 10 + 'px'}} onClick={reloadStages}>Reload</button>
                </div>
            ) }
        </div>
    );
};

export default ConfigurationPage;
