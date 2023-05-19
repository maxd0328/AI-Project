import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import ScriptPage from './components/ScriptPage';
import ProjectPage from './components/ProjectPage';
import PresetPage from './components/PresetPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/console/home" element={<HomePage/>}/>
                <Route path="/console/scripts" element={<ScriptPage/>}/>
                <Route path="/console/project" element={<ProjectPage/>}/>
                <Route path="/console/presets" element={<PresetPage/>}/>
            </Routes>
        </Router>
    );
}

export default App;
