import React, { useState, useCallback, useEffect } from 'react';
import * as ScriptController from '../../../controllers/ScriptController';
import '../Tabs.css';
import '../ConfigurationTab.css';

const nothingFound = () => (<p style={{width: 100 + '%', height: 100 + '%', textAlign: 'center'}}>No results found.</p>);

/* Represents a list item in the list of available scripts to choose from */
const ScriptOption = ({ script, apply, open }) => {
    return (
        <div className="page-list-item" style={{alignItems: 'center'}}>
            <p style={{flexGrow: 1, marginBottom: 5 + 'px', color: '#eee'}}><b>{script.name}</b></p>
            <button className="image-button text-button" onClick={apply.bind(null, script)}>Use</button>
            <button className="image-button text-button" onClick={open.bind(null, script)}>Open</button>
        </div>
    );
};

/* Represents the body of the stage element for external script stages */
const ScriptStageBody = ({ stage, set }) => {
    // Set up states
    const [showSearchScripts, setShowSearchScripts] = useState(false);
    const [searchScripts, setSearchScripts] = useState('');
    const [scripts, setScripts] = useState([]);
    const [scriptError, setScriptError] = useState(false);

    // Reload list of user's scripts
    const reload = useCallback(() => {
        ScriptController.fetchScripts().then(result => {
            setScripts(result);
            setScriptError(false);
        }).catch(err => setScriptError(true));
    }, []);

    // Load scripts upon component mount
    useEffect(() => reload(), [reload]);

    // Returns a script from the list given a scriptID, returning an empty one if no such script exists
    const getScript = (scriptID) => {
        const script = scripts.find(e => e.scriptID === scriptID);
        return script ? script : { scriptID, name: '' };
    };

    // Handler functions
    const toggleShowSearchScripts = () => setShowSearchScripts(showSearchScripts => !showSearchScripts);

    const updateSearchScripts = (event) => setSearchScripts(event.target.value);

    const openScriptEditor = (script) => {
        const url = script ? `/console/scripts?id=${script.scriptID}` : '/console/scripts';
        window.open(new URL(url, window.location.origin).href, '_blank');
    }

    const updateSelectedScript = (script) => set({
        ...stage,
        scriptID: script.scriptID
    });

    const filteredScripts = scripts.filter(script => script.name.toLowerCase().includes(searchScripts.trim().toLowerCase()));
    return (
        <div>
            <div style={{display: 'flex', flexDirection: 'row', marginBottom: 10 + 'px', alignItems: 'center'}}>
                <p style={{margin: '0 5px 0 0'}}>{stage.scriptID === null ? 'No script selected' : getScript(stage.scriptID).name}</p>
                <button className="image-button" style={{width: 20 + 'px', height: 20 + 'px',
                    transform: showSearchScripts ? 'rotate(180deg)' : 'rotate(0deg)'}} onClick={toggleShowSearchScripts}>
                    <img src="/console/images/arrow.png" alt="/console/images/arrow.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                </button>
            </div>

            { showSearchScripts ? !scriptError ? (
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                        <p style={{marginTop: 5 + 'px', marginBottom: 5 + 'px', color: '#eee'}}><b>Search Scripts</b></p>
                        <button className="image-button" style={{width: 25 + 'px', height: 25 + 'px', marginLeft: 7 + 'px'}} onClick={reload}>
                            <img src="/console/images/reload.png" alt="/console/images/reload.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                        </button>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                        <input style={{flexGrow: 1}} type="text" placeholder="Search" className="text-field" value={searchScripts} onChange={updateSearchScripts}/>
                        <button className="button green" style={{marginLeft: 10 + 'px'}} onClick={openScriptEditor}>Open Script Editor</button>
                    </div>
                    <div className="page-list" style={{marginTop: 5 + 'px', marginBottom: 10 + 'px', maxHeight: 200 + 'px'}}>
                        { filteredScripts.length === 0 ? nothingFound()
                            : filteredScripts.map((script, index) =>
                                <ScriptOption key={index} script={script} apply={updateSelectedScript} open={openScriptEditor} />) }
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

export default ScriptStageBody;
