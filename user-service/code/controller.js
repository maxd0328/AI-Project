const db = require('./database');

async function addUser(email, firstName, lastName, phoneNumber, password) {
    const query = `INSERT INTO users (email, firstName, lastName, phoneNumber, password) VALUES (?, ?, ?, ?, ?)`;
    const values = [email, firstName, lastName, phoneNumber, password];

    await db.query(query, values);
}

async function authenticateUser(email, password) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const values = [email];

    const [rows] = await db.query(query, values);
    if(rows.length !== 1 || rows[0].email !== email || rows[0].password !== password)
        throw { code: 'AUTH_FAIL', message: 'Email and password do not match' };
    else return rows[0];
}

module.exports = {
    addUser,
    authenticateUser
};
