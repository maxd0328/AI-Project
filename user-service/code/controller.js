const db = require('database');

export async function addUser(email, firstName, lastName, phoneNumber, password) {
    const query = `INSERT INTO users (email, firstName, lastName, phoneNumber, password) VALUES (?, ?, ?, ?, ?)`;
    const values = [email, firstName, lastName, phoneNumber, password];

    return new Promise((resolve, reject) => {
        db.query(query, values, (err, result) => {
            if(err)
                reject(err);
            else resolve(result);
        });
    });
}

export async function authenticateUser(email, password) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const values = [email];

    return new Promise((resolve, reject) => {
        db.query(query, values, (err, rows) => {
            if(err)
                reject(err);
            else if(rows.length != 1)
                reject({ message: 'Email and password do not match' });
            else {
                if(rows[0].email === email && rows[0].password === password)
                    resolve(rows[0]);
                else reject({ message: 'Email and password do not match' });
            }
        });
    });
}
