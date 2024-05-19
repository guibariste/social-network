CREATE TABLE IF NOT EXISTS private_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    senderID TEXT NOT NULL,
    receiver TEXT NOT NULL,
    receiverID TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL
);
