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

CREATE TABLE presets (
     presetID INT PRIMARY KEY AUTO_INCREMENT,
     name VARCHAR(50) NOT NULL,
     description VARCHAR(250)
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

CREATE TABLE scripts (
     scriptID INT PRIMARY KEY AUTO_INCREMENT,
     userID INT NOT NULL,
     name VARCHAR(50) NOT NULL,
     lastModified BIGINT,
     FOREIGN KEY(userID) REFERENCES users(userID)
         ON UPDATE CASCADE
         ON DELETE CASCADE
);

CREATE TABLE datasets (
    datasetID INT PRIMARY KEY AUTO_INCREMENT,
    userID INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    nextLabel INT NOT NULL,
    nextFile INT NOT NULL,
    lastModified BIGINT,
    FOREIGN KEY(userID) REFERENCES users(userID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE dataLabels (
    datasetID INT NOT NULL,
    labelID INT NOT NULL,
    string VARCHAR(25) NOT NULL,
    PRIMARY KEY(datasetID, labelID),
    FOREIGN KEY(datasetID) REFERENCES datasets(datasetID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE datafiles (
    datasetID INT NOT NULL,
    datafileID INT NOT NULL,
    filename VARCHAR(50) NOT NULL,
    labelID INT NULL,
    customLabel VARCHAR(25) NULL,
    dateAdded BIGINT NOT NULL,
    PRIMARY KEY(datasetID, datafileID),
    FOREIGN KEY(datasetID) REFERENCES datasets(datasetID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY(datasetID, labelID) REFERENCES dataLabels(datasetID, labelID)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT CHK_Label CHECK (labelID IS NOT NULL OR customLabel IS NOT NULL)
);

CREATE TABLE configs (
    projectID INT NOT NULL,
    location INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    type ENUM('int', 'ext', 'gen') NOT NULL,
    scriptID INT NULL,
    PRIMARY KEY(projectID, location),
    FOREIGN KEY(projectID) REFERENCES projects(projectID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY(scriptID) REFERENCES scripts(scriptID)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE projectDatasets (
    projectID INT NOT NULL,
    datasetID INT NOT NULL,
    PRIMARY KEY(projectID, datasetID),
    FOREIGN KEY(projectID) REFERENCES projects(projectID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY(datasetID) REFERENCES datasets(datasetID)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
