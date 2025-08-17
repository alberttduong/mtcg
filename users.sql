DROP TABLE IF EXISTS users;

CREATE TABLE users (
	id INTEGER NOT NULL PRIMARY KEY,
	name TEXT,
	deck TEXT
);

INSERT INTO users(id, name, deck) VALUES (1, 'Bill', 'bills deck');
