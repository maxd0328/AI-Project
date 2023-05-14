import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import './ProjectPage.css';
import '../Styles.css';
import MenuBar from './MenuBar';
import * as Controller from '../controllers/ProjectController';
import * as GenController from '../controllers/GeneralController';
import DetailsPage from './projectPages/DetailsPage';
import ConfigurationPage from './projectPages/ConfigurationPage';
import DatasetsPage from './projectPages/DatasetsPage';
import TrainingPage from './projectPages/TrainingPage';
import ResultsPage from './projectPages/ResultsPage';

const ProjectTab = (props) => {
    const location = useLocation();

    return (
        <button className="project-tab" disabled={location.hash === '#' + props.hash} onClick={() => window.location.hash = props.hash}>
            {props.hash[0].toUpperCase() + props.hash.substring(1)}
        </button>
    );
}

const ProjectPage = () => {
    const [project, setProject] = useState({ name: 'Loading...', type: '' });
    const [error, setError] = useState(false);

    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    const pages = useMemo(() => [
        { hash: 'details', gen: () => <DetailsPage project={project} setProject={setProject} raiseError={setError.bind(null, true)}/> },
        { hash: 'configuration', gen: () => <ConfigurationPage/> },
        { hash: 'datasets', gen: () => <DatasetsPage/> },
        { hash: 'training', gen: () => <TrainingPage/> },
        { hash: 'results', gen: () => <ResultsPage/> }
    ], [project]);

    const reload = useCallback(() => {
        console.log('reload');
        const projectID = searchParams.get('id');
        if(projectID === null)
            navigate('/console/home');
        else Controller.fetchProject(projectID).then((project) => {
            project.projectID = projectID;
            setProject(project);
            setError(false);
        }).catch((err) => setError(true));
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
                        if(error)
                            return (
                                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 100 + '%'}}>
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
