import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import ScriptPage from './components/ScriptPage';
import ProjectPage from './components/ProjectPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/console/home" element={<HomePage/>}/>
                <Route path="/console/scripts" element={<ScriptPage/>}/>
                <Route path="/console/project" element={<ProjectPage/>}/>
            </Routes>
        </Router>
    );
}

export default App;
