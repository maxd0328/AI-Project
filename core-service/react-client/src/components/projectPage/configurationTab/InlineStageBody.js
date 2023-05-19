import React, {} from 'react';
import '../Tabs.css';
import '../ConfigurationTab.css';
import ScriptEditor from '../../script/ScriptEditor';

const InlineStageBody = ({ stage, set }) => {

    const updateScript = (content) => set({
        ...stage,
        content
    });

    return (
        <div style={{height: 250 + 'px'}}>
            <ScriptEditor callback={updateScript}>
                {stage.content}
            </ScriptEditor>
        </div>
    );
};

export default InlineStageBody;
