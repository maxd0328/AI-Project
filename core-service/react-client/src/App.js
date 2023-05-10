import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScriptPage from './components/ScriptPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<ScriptPage/>}/>
            </Routes>
        </Router>
    );
}

export default App;
