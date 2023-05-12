import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import ScriptPage from './components/ScriptPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/console/home" element={<HomePage/>}/>
                <Route path="/console/scripts" element={<ScriptPage/>}/>
            </Routes>
        </Router>
    );
}

export default App;
