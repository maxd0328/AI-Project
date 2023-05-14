import React from 'react';
import './MenuBar.css';

const MenuBar = () => {
    return (
        <div className="menu-bar">
            <h2 style={{flexGrow: 1}}>GrAI Matter</h2>
            <button style={{marginRight: 15 + 'px'}}>
                <img src="/console/images/menu.png" alt="/console/images/menu.png"/>
            </button>
            <button style={{marginRight: 30 + 'px'}}>
                <img src="/console/images/user.png" alt="/console/images/user.png"/>
            </button>
        </div>
    );
}

export default MenuBar;
