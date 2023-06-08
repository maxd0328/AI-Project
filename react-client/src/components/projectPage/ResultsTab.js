import React from 'react';
import './Tabs.css';

const ResultsTab = () => {
    return (
        <div className="page">
            <h1 className="outer-element">Results</h1>
            <div className="row" style={{justifyContent: 'center', marginTop: 50 + 'px'}}>
                <img src="/console/images/coming-soon.png" alt="coming-soon.png" style={{width: 100 + 'px', height: 100 + 'px'}} />
                <h1 style={{marginLeft: 30 + 'px'}}>Coming soon!</h1>
            </div>
            <div className="row" style={{justifyContent: 'center'}}>
                <p>This product is early access, hang tight and we'll have this feature implemented in no time.</p>
            </div>
        </div>
    );
};

export default ResultsTab;
