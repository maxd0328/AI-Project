import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import './ProjectPage.css';
import MenuBar from './MenuBar';
import * as Controller from 'controllers/ProjectController';
import * as GenController from 'controllers/GeneralController';
import DetailsTab from './projectPage/DetailsTab';
import ConfigurationTab from './projectPage/ConfigurationTab';
import DatasetsTab from './projectPage/DatasetsTab';
import TrainingTab from './projectPage/TrainingTab';
import ResultsTab from './projectPage/ResultsTab';

const ProjectTab = (props) => {
    const location = useLocation();

    return (
        <button className="project-tab" disabled={location.hash === '#' + props.hash} onClick={() => window.location.hash = props.hash}>
            {props.hash[0].toUpperCase() + props.hash.substring(1)}
        </button>
    );
}

const ProjectPage = () => {
    const [project, setProject] = useState({ name: 'Loading...', type: '', presetID: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    const pages = useMemo(() => [
        { hash: 'details', gen: () => <DetailsTab project={project} setProject={setProject} raiseError={setError.bind(null, true)}/> },
        { hash: 'configuration', gen: () => <ConfigurationTab project={project} setProject={setProject}/> },
        { hash: 'datasets', gen: () => <DatasetsTab project={project} setProject={setProject} /> },
        { hash: 'training', gen: () => <TrainingTab/> },
        { hash: 'results', gen: () => <ResultsTab/> }
    ], [project]);

    const reload = useCallback(() => {
        const projectID = searchParams.get('id');
        if(projectID === null)
            navigate('/console/home');
        else {
            setLoading(true);
            Controller.fetchProject(projectID).then((project) => {
                project.projectID = projectID;
                setProject(project);
                setError(false);
                setLoading(false);
            }).catch((err) => {
                setError(true);
                setLoading(false);
            });
        }
    }, [searchParams, navigate]);

    useEffect(() => reload(), [reload]);

    useEffect(() => {
        if(!pages.find(e => location.hash === '#' + e.hash))
            window.location.hash = pages[0].hash;
    }, [location, pages]);

    return (
        <div className="project-page">
            <MenuBar/>
            <div className="project-container">
                <div className="project-sidebar">
                    <h2>{ error ? 'Error' : project.name }</h2>
                    <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 35 + 'px'}}>
                        <img src={GenController.getProjectType(project.type).image} alt="type"/>
                        <p className="small-header" style={{marginLeft: 9 + 'px', fontSize: 13 + 'px'}}>
                            { error ? 'Error' : GenController.getProjectType(project.type).name }
                        </p>
                    </div>
                    { pages.map((page, index) => <ProjectTab key={index} hash={page.hash}/>) }
                </div>
                <div className="project-primary">
                    { (() => {
                        if(loading)
                            return (
                                <div className="centered-container">
                                    <p className="small-header">Loading...</p>
                                </div>
                            );

                        if(error)
                            return (
                                <div className="centered-container">
                                    <p className="small-header" style={{marginBottom: 10 + 'px'}}>Something went wrong, please try again.</p>
                                    <button className="button blue" onClick={reload}>Reload</button>
                                </div>
                            );

                        let page = pages.find(e => location.hash === '#' + e.hash);
                        return page ? page.gen() : null;
                    })() }
                </div>
            </div>
        </div>
    );
};

export default ProjectPage;
