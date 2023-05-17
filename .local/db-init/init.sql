-- init.sql
CREATE DATABASE IF NOT EXISTS ebdb;
USE ebdb;

-- Schema definitions
CREATE TABLE users (
    userID INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(50) UNIQUE NOT NULL,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    phoneNumber VARCHAR(15),
    password VARCHAR(50) NOT NULL
);

CREATE TABLE projects (
    projectID INT PRIMARY KEY AUTO_INCREMENT,
    userID INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    type ENUM('cnn') NOT NULL,
    presetID INT,
    lastModified BIGINT,
    FOREIGN KEY(userID) REFERENCES users(userID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY(presetID) REFERENCES presets(presetID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE presets (
    presetID INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(250)
);

CREATE TABLE configs (
    projectID INT NOT NULL,
    index INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    type ENUM('int', 'ext', 'gen') NOT NULL,
    scriptID INT NULL,
    PRIMARY KEY(projectID, index),
    FOREIGN KEY(projectID) REFERENCES projects(projectID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY(scriptID) REFERENCES scripts(scriptID)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE scripts (
    scriptID INT PRIMARY KEY AUTO_INCREMENT,
    userID INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    FOREIGN KEY(userID) REFERENCES users(userID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
