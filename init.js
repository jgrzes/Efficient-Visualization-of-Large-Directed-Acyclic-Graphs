// init.js
db = db.getSiblingDB("inz");

db.createUser({
    user: "inz_user",
    pwd: "devpass",
    roles: [
        { role: "readWrite", db: "inz" },
        { role: "dbAdmin", db: "inz" }
    ]
});