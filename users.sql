DROP TABLE IF EXISTS users;

CREATE TABLE users (
	id INTEGER NOT NULL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL,
	deck JSON
);

INSERT 
	INTO users(id, name, password, deck) 
	VALUES (1, 'Bill', '1234', json('{"Gunner": 3}'));

INSERT 
	INTO users(id, name, password, deck) 
	VALUES (2, 'Sam', '1234', json('{"Gunner": 4}'));
