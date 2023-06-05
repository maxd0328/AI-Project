const { Entity } = require('./entity');
const Project = require('./project');
const Script = require('./script');
const Dataset = require('./dataset');

class User extends Entity {

    constructor({ userID, email, firstName, lastName, phoneNumber, password }) {
        super(User, 'users', ['userID'], ['email', 'firstName', 'lastName', 'phoneNumber', 'password'], true);
        this.userID = userID;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phoneNumber = phoneNumber;
        this.password = password;
    }

    makeCurrent(session) {
        session.loggedIn = true;
        session.userID = this.userID;
        session.firstName = this.firstName;
    }

    async cascade(action, connection) {
        await super.forward(Project, action, connection);
        await super.forward(Script, action, connection);
        await super.forward(Dataset, action, connection);
    }

}

module.exports = User;
