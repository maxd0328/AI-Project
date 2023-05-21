import React from 'react';
import './MenuBar.css';
import {useNavigate} from 'react-router-dom';

const MenuBar = () => {
    const navigate = useNavigate();

    const goHome = () => navigate('/console/home');

    return (
        <div className="menu-bar">
            <button className="menu-bar-invisible" onClick={goHome}>
                <h2>GrAI Matter</h2>
            </button>
            <div style={{flexGrow: 1}}/>
            <button className="menu-bar-image-button" style={{marginRight: 15 + 'px'}}>
                <img src="/console/images/menu.png" alt="/console/images/menu.png"/>
            </button>
            <button className="menu-bar-image-button" style={{marginRight: 30 + 'px'}}>
                <img src="/console/images/user.png" alt="/console/images/user.png"/>
            </button>
        </div>
    );
}

export default MenuBar;
