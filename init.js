// Use database "inz"
db = db.getSiblingDB('inz');

// Create user for this database
db.createUser({
    user: 'inz_user',
    pwd: 'devpass',
    roles: [{ role: 'readWrite', db: 'inz' }]
});

// Create collection for graphs (if not exists)
db.createCollection('graphs');

// Add unique index on "hash" field
db.graphs.createIndex({ hash: 1 }, { unique: true });

print('✅ MongoDB initialized: database "inz", user "inz_user", collection "graphs"');
