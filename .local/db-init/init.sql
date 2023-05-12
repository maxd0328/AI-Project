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

CREATE TABLE scripts (
    userID INT NOT NULL,
    scriptID BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY(userID, scriptID)
);
