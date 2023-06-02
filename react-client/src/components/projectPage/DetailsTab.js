import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as GenController from 'controllers/GeneralController';
import * as Controller from 'controllers/ProjectController';
import './Tabs.css';

const DetailsTab = (props) => {
    const [editName, setEditName] = useState(false);
    const [provisionalName, setProvisionalName] = useState('');

    const editNameField = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if(editName && editNameField.current)
            editNameField.current.select();
    }, [editName]);

    const updateProvisionalName = (event) => setProvisionalName(event.target.value);

    const startEditName = () => {
        setEditName(true);
        setProvisionalName(props.project.name);
    };

    const editNameKeyDown = event => {
        if(event.key === 'Enter')
            saveName();
    };

    const saveName = () => {
        setEditName(false);
        Controller.sendProjectName(props.project.projectID, provisionalName).then(() => {
            setEditName(false);
            props.setProject({ ...props.project, name: provisionalName });
        }).catch((err) => props.raiseError());
    };

    const cancelName = () => setEditName(false);

    const deleteProject = () => {
        Controller.sendDeleteProject(props.project.projectID).then(() => {
            navigate('/console/home');
        }).catch((err) => props.raiseError());
    };

    return (
        <div className="page">
            <h1 className="outer-element">Details</h1>

            <h3 className="outer-element">Project Name</h3>
            { (() => {
                if(editName) return (
                    <div className="row">
                        <input type="text" placeholder="Project Name" className="text-field" style={{flexGrow: 1, marginRight: 10 + 'px'}}
                               ref={editNameField} value={provisionalName} onChange={updateProvisionalName} onKeyDown={editNameKeyDown}/>
                        <button className="button red" onClick={cancelName}>Cancel</button>
                        <button className="button green" onClick={saveName}>Save</button>
                    </div>
                );
                else return (
                    <div className="row">
                        <p style={{marginTop: 0, marginBottom: 0}}>{props.project.name}</p>
                        <button className="image-button" style={{marginLeft: 10 + 'px', width: 25 + 'px', height: 25 + 'px'}}
                                onClick={startEditName}>
                            <img src="/console/images/edit.png" alt="/console/images/edit.png" style={{width: 70 + '%', height: 70 + '%'}}/>
                        </button>
                    </div>
                );
            })() }

            <h3 className="outer-element">Project Type</h3>
            <p className="outer-element">{GenController.getProjectType(props.project.type).name}</p>

            <h3 className="outer-element">Training Status</h3>
            <p className="outer-element">Ready</p>

            <div style={{flexGrow: 1}}/>
            <h3 className="outer-element">Actions</h3>
            <button className="outer-element button red" style={{marginTop: 5 + 'px', marginBottom: 20 + 'px'}} onClick={deleteProject}>Delete Project</button>
        </div>
    );
};

export default DetailsTab;
