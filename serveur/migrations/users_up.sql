CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prenom TEXT NOT NULL,
    nom TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    anniv TEXT NOT NULL,
    avatar TEXT NOT NULL,
    surnom TEXT NOT NULL,
    propos TEXT NOT NULL,
    ispublic TEXT NOT NULL,
    followers TEXT NOT NULL,
    followed TEXT NOT NULL,
    pending TEXT NOT NULL
);
