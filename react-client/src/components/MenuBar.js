import React from 'react';
import './MenuBar.css';
import {useNavigate} from 'react-router-dom';

const MenuBar = () => {
    const navigate = useNavigate();

    const goHome = () => navigate('/console/home');

    return (
        <div className="menu-bar">
            <h2>AxoModel</h2>
            <button className="menu-bar-image-button" style={{marginLeft: 15 + 'px', width: 35 + 'px', height: 35 + 'px'}} onClick={goHome}>
                <img src="/console/images/home.png" alt="Home" style={{width: 70 + '%', height: 70 + '%'}}/>
            </button>
            <div style={{flexGrow: 1}}/>
            <button className="menu-bar-image-button" style={{marginRight: 15 + 'px'}}>
                <img src="/console/images/menu.png" alt="Menu"/>
            </button>
            <button className="menu-bar-image-button" style={{marginRight: 30 + 'px'}}>
                <img src="/console/images/user.png" alt="Account"/>
            </button>
        </div>
    );
}

export default MenuBar;
