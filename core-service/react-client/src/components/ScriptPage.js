import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ScriptEditor from './ScriptEditor';
import './ScriptPage.css';
import '../Styles.css';
import '../controllers/ScriptController';
import * as Controller from '../controllers/ScriptController';
import MenuBar from "./MenuBar";

const ScriptElement = (props) => {
    return (
        <div
            className={props.selected ? 'script-element-selected' : 'script-element-unselected'}
            onClick={props.select.bind(null, props.id)}
        >
            <p className="small-header script-element-inset">{props.name}</p>
        </div>
    );
}

const ScriptPage = () => {
    const [scripts, setScripts] = useState([]);
    const [provisionalName, setProvisionalName] = useState('');
    const [content, setContent] = useState('');
    const [search, setSearch] = useState('');
    const [error, setError] = useState(false);
    const [edited, setEdited] = useState(false);

    const didMount = useRef(false);
    const [searchParams, setSearchParams] = useSearchParams();

    /* Function to fetch ID from search params, if null then null is returned, otherwise it's parsed to an int */
    const currentScriptID = useCallback(() => {
        let id = searchParams.get('id');
        return id === null ? null : parseInt(id);
    }, [searchParams]);

    /* Function to search for script from script list (can be overridden) from current script ID */
    const currentScript = useCallback((scriptList = scripts) => {
        const scriptID = currentScriptID();
        return scriptID === null ? null : scriptList.find(e => e.scriptID === scriptID);
    }, [currentScriptID, scripts]);

    /* Reload page, fetches all scripts and loads content of one specified by newID (left the same by default */
    const reload = useCallback((newID = undefined) => {
        Controller.fetchScripts().then((newScripts) => {
            setScripts(newScripts);
            setError(false);
            if(newID !== undefined) setSearchParams({ id: newID });
        }, (err) => {
            setScripts([]);
            setError(true);
        });
    }, [setSearchParams]);

    /* Select script by setting value of search param 'id' */
    const selectScript = useCallback((id) => {
        if(error)
            reload(id);
        else setSearchParams(id === undefined ? {} : { id });
    }, [setSearchParams, reload, error]);

    /* Effect handler for updating DOM whenever script list or search param changes */
    useEffect(() => {
        if(!didMount.current) {
            reload();
            didMount.current = true;
            return;
        }
        else if(error)
            return;

        const script = currentScript();
        if(!script && currentScriptID() !== null) {
            selectScript(undefined);
            return;
        }

        if(script) {
            Controller.fetchScriptContent(script.scriptID).then((newContent) => {
                setProvisionalName(script.name);
                setEdited(false);
                setContent(newContent);
            }, (err) => setError(true));
        }
        else {
            setProvisionalName('');
            setContent('');
        }
    }, [error, currentScript, currentScriptID, reload, selectScript, scripts]);

    /* Handler functions */
    const updateSearch = (event) => {
        setSearch(event.target.value);
    }

    const updateScript = (newContent) => {
        setContent(newContent);
        setEdited(true);
    }

    const updateProvisionalName = (event) => {
        setProvisionalName(event.target.value);
    }

    const submitName = (event) => {
        if(error) return;
        if(!event.key || event.key === 'Enter') {
            Controller.sendScriptName(currentScriptID(), provisionalName).then(() => setScripts(scripts => {
                    let newScripts = [...scripts];
                    let script = currentScript(newScripts);
                    script.name = provisionalName;
                    return newScripts;
                }),
                (err) => setError(true));
        }
    }

    const createScript = () => {
        if(error) return;
        const name = 'New script', content = '\n# Write your script here\n';
        Controller.sendNewScript(name, content).then((scriptID) => {
            setScripts(scripts => {
                let newScripts = [...scripts];
                newScripts.push({ scriptID, name });
                return newScripts;
            });
            selectScript(scriptID);
        }, (err) => setError(true));
    }

    const saveScript = () => {
        if(error) return;

        Controller.sendScriptContent(currentScriptID(), content).then((result) => setEdited(false),
            (err) => setError(true));
    }

    const deleteScript = () => {
        if(error) return;
        Controller.sendDeleteScript(currentScriptID()).then(() => {
            setScripts(scripts => scripts.filter(e => e.scriptID !== currentScriptID()));
            selectScript(undefined);
        }, (err) => setError(true));
    }

    /* Render functions */
    const renderEditor = () => {
        return (
            <div className="script-container">
                <input type="text" placeholder="Script name" className="text-field"
                       value={provisionalName}
                       onChange={updateProvisionalName}
                       onKeyDown={submitName}
                       onBlur={submitName}
                />
                <div className="script-editor">
                    <ScriptEditor callback={updateScript}>
                        {content}
                    </ScriptEditor>
                </div>
                <div className="script-button-container">
                    <button className="button green" onClick={saveScript} disabled={!edited}>Save</button>
                    <button className="button red" onClick={deleteScript}>Delete</button>
                </div>
            </div>
        );
    }

    const renderEmpty = () => {
        return (
            <div className="empty-script-container">
                <p className="small-header" style={{marginBottom: 10 + 'px'}}>Open or create a script to get started!</p>
                <button className="button green" onClick={createScript}>Create</button>
            </div>
        );
    }

    const renderError = () => {
        return (
            <div className="empty-script-container">
                <p className="small-header" style={{marginBottom: 10 + 'px'}}>Something went wrong, please try again.</p>
                <button className="button blue" onClick={reload}>Reload</button>
            </div>
        );
    }

    /* Primary render */
    return (
        <div className="script-page">
            <MenuBar/>
            <div className="script-sidebar">
                <p className="small-header">Browse Scripts</p>
                <input type="text" placeholder="Search" className="text-field" style={{fontSize: 12 + 'px'}}
                       onChange={updateSearch} value={search}/>
                <div className="sidebar-container">{
                    scripts.map((script, i) => {
                        if(script.name.toLowerCase().includes(search.trim().toLowerCase()))
                            return (<ScriptElement name={script.name} key={i} id={script.scriptID} select={selectScript}
                                                   selected={script.scriptID === currentScriptID()}/>);
                        else return null;
                    })
                }</div>
                <button className="button green" onClick={createScript}>Create New</button>
            </div>
            {!error ? currentScriptID() !== null ? renderEditor() : renderEmpty() : renderError()}
        </div>
    );
};

export default ScriptPage;
