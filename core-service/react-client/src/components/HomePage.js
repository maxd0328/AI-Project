import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../Styles.css';
import './HomePage.css';
import { SessionContext } from '../controllers/SessionContext';
import * as GenController from '../controllers/GeneralController';
import * as Controller from '../controllers/HomeController';
import * as ScriptController from '../controllers/ScriptController';
import MenuBar from './MenuBar';

const ProjectType = (props) => {
    const navigate = useNavigate();

    const createProject = (name, type) => {
        Controller.sendNewProject(name, type).then((projectID) => {
            navigate(`/console/project?id=${projectID}`);
        }).catch((err) => { /* TODO */ });
    }

    const type = GenController.getProjectType(props.code);
    return (
        <button className="project-type" disabled={!props.active} onClick={createProject.bind(null, 'New Project', props.code)}>
            <img src={type.image} alt={type.image}/>
            <p>{type.name}</p>
        </button>
    );
};

const Project = (props) => {
    const type = GenController.getProjectType(props.type);
    return (
        <button className="home-list-item" onClick={props.open}>
            <img src={type.image} alt={type.image}/>
            <p style={{marginLeft: 10, width: 30 + '%', textAlign: 'left'}}>{props.name}</p>
            <div className="project-details">
                <p>Status: Ready</p>
                <p>Last modified: {GenController.getRelativeTimeString(props.lastModified)}</p>
            </div>
        </button>
    );
};

const ScriptLink = (props) => {

    if(props.seeAll) {
        return (
            <button className="home-list-item" style={{height: 50 + 'px'}} onClick={props.open}>
                <p style={{flexGrow: 1, textAlign: 'right'}}>&bull; &bull; &bull;</p>
                <p style={{marginLeft: 10 + 'px', marginRight: 10 + 'px'}}>See all</p>
                <p style={{flexGrow: 1, textAlign: 'left'}}>&bull; &bull; &bull;</p>
            </button>
        );
    }
    return (
        <button className="home-list-item" style={{height: 50 + 'px'}} onClick={props.open}>
            <img src="/console/images/MS.png" alt="/console/images/MS.png"/>
            <p style={{marginLeft: 10, flexGrow: 1, textAlign: 'left'}}>{props.name}</p>
            <p style={{color: '#aaa'}}>Last modified: {GenController.getRelativeTimeString(props.lastModified)}</p>
        </button>
    );
}

const HomePage = () => {
    const [projects, setProjects] = useState([]);
    const [scripts, setScripts] = useState([]);
    const [searchProjects, setSearchProjects] = useState('');
    const [errorProjects, setErrorProjects] = useState(false);
    const [errorScripts, setErrorScripts] = useState(false);
    const [logoutError, setLogoutError] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const session = useContext(SessionContext);
    const scriptMax = 5;

    useEffect(() => {
        reloadProjects();
        reloadScripts();
    }, []);

    useEffect(() => { window.location.hash = ''; }, [location]);

    const reloadProjects = () => {
        Controller.fetchProjects().then(projects => {
            setProjects(projects);
            setErrorProjects(false);
        }).catch(err => setErrorProjects(true));
    };

    const reloadScripts = () => {
        ScriptController.fetchScripts().then(scripts => {
            if(scripts.length > scriptMax)
                setScripts(scripts.slice(0, scriptMax));
            else setScripts(scripts);
            setErrorScripts(false);
        }).catch(err => setErrorScripts(true));
    };

    const updateSearchProjects = (event) => {
        setSearchProjects(event.target.value);
    };

    const openProject = (projectID) => {
        navigate(`/console/project?id=${projectID}`);
    };

    const openScriptEditor = () => {
        navigate('/console/scripts');
    };

    const openScript = (scriptID) => {
        navigate(`/console/scripts?id=${scriptID}`);
    };

    const logout = () => {
        Controller.logout().catch(err => setLogoutError(true));
    };

    const renderProjects = () => {
        if(errorProjects) return (
            <div style={{textAlign: 'center'}}>
                <p>Something went wrong, please try again later.</p>
                <button className="button blue" onClick={reloadProjects}>Reload</button>
            </div>
        );

        if(projects.length === 0) return (
            <div style={{textAlign: 'center'}}>
                <p>You don't have any projects yet. Get started by creating one!</p>
            </div>
        );

        return (
            <div className="home-vertical-container">
                { projects.map(project => {
                    if(project.name.toLowerCase().includes(searchProjects.trim().toLowerCase()))
                        return <Project type={project.type} name={project.name} lastModified={project.lastModified}
                                        open={openProject.bind(null, project.projectID)} />;
                    else return null;
                }) }
            </div>
        );
    };

    const renderScripts = () => {
        if(errorScripts) return (
            <div style={{textAlign: 'center'}}>
                <p>Something went wrong, please try again later.</p>
                <button className="button blue" onClick={reloadScripts}>Reload</button>
            </div>
        );

        if(scripts.length === 0) return (
            <div style={{textAlign: 'center'}}>
                <p>You don't have any scripts yet. Open the script editor to get started!</p>
            </div>
        );

        return (
            <div className="home-vertical-container" style={{marginRight: 15 + 'vw'}}>
                { scripts.map(script => (
                    <ScriptLink name={script.name} lastModified={script.lastModified} open={openScript.bind(null, script.scriptID)} />
                )) }
                { scripts.length > scriptMax ? <ScriptLink seeAll open={openScriptEditor}/> : null }
            </div>
        );
    };

    return (
        <div className="home-page">
            <MenuBar/>
            <h1 style={{marginLeft: 15 + 'vw', paddingTop: 50 + 'px'}}>
                Welcome, {session ? session.firstName : 'Loading...'}!
            </h1>
            <div className="create-project-container">
                <h3 style={{marginTop: 0}}>Create a Project</h3>
                <div className="project-type-container">
                    <ProjectType code="cnn" active={true}/>
                    <ProjectType code="coming-soon" active={false}/>
                </div>
            </div>
            <div className="project-header-container">
                <h2 style={{marginRight: 20 + 'px'}}>Your Projects</h2>
                <input type="text" placeholder="Search" className="text-field" style={{flexGrow: 1, height: 30 + '%'}}
                       value={searchProjects} onChange={updateSearchProjects} />
            </div>
            { renderProjects() }
            <div className="script-header-container">
                <h2 style={{flexGrow: 1}}>Recent Scripts</h2>
                <button className="button green" onClick={openScriptEditor}>Open Script Editor</button>
            </div>
            { renderScripts() }
            <h2 style={{marginLeft: 15 + 'vw', marginTop: 60 + 'px', marginBottom: 5 + 'px'}}>Account Actions</h2>
            <div style={{marginLeft: 15 + 'vw', display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                <button className="button red" style={{marginTop: 15, marginBottom: 15}} onClick={logout}>Log Out</button>
                { logoutError ? <p style={{marginLeft: 20 + 'px', color: '#ff4444'}}>Logout failed</p> : null }
            </div>
            <div style={{flexGrow: 1}}/>
            <p style={{textAlign: 'center'}}>&copy; GrAI Matter 2023</p>
        </div>
    );
};

export default HomePage;
