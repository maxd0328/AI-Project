import React from 'react';
import './HomePage.css'
import '../Styles.css';
import { SessionContext } from '../controllers/SessionContext';

class HomePage extends React.Component {

    render() {
        return (
            <div className="home-page">
                <div className="home-container">
                    <h1>Welcome, <SessionContext.Consumer>{session => session ? session.firstName : 'Loading...'}</SessionContext.Consumer></h1>
                    <a href="/user/logout"><button className="button red">Log Out</button></a>
                </div>
            </div>
        );
    }

}

export default HomePage;
