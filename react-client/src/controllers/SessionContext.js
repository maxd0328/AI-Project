import React, { createContext, useState, useEffect } from 'react';

export const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        /*
        fetch('/user')
            .then(response => response.json())
            .then(data => setSession(data))
            .catch(error => setError(error.toString()));
        */
        setSession({ firstName: 'Max' });
    }, []);

    if(error) {
        return (
            <div>
                <h2 style={{textAlign: 'center'}}>GrAI Matter</h2>
                <p style={{textAlign: 'center'}}>An unexpected error has occurred, please try again later.</p>
            </div>
        );
    }

    return (
        <SessionContext.Provider value={session}>
            {children}
        </SessionContext.Provider>
    );
};
