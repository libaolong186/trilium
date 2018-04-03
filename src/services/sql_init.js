const log = require('./log');
const dataDir = require('./data_dir');
const fs = require('fs');
const sqlite = require('sqlite');
const resourceDir = require('./resource_dir');
const appInfo = require('./app_info');
const sql = require('./sql');

async function createConnection() {
    return await sqlite.open(dataDir.DOCUMENT_PATH, {Promise});
}

let dbReadyResolve = null;
const dbReady = new Promise((resolve, reject) => {
    createConnection().then(async db => {
        sql.setDbConnection(db);

        await sql.execute("PRAGMA foreign_keys = ON");

        dbReadyResolve = () => {
            log.info("DB ready.");

            resolve(db);
        };

        const tableResults = await sql.getRows("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'");
        if (tableResults.length !== 1) {
            log.info("Connected to db, but schema doesn't exist. Initializing schema ...");

            const schema = fs.readFileSync(resourceDir.DB_INIT_DIR + '/schema.sql', 'UTF-8');
            const notesSql = fs.readFileSync(resourceDir.DB_INIT_DIR + '/main_notes.sql', 'UTF-8');
            const notesTreeSql = fs.readFileSync(resourceDir.DB_INIT_DIR + '/main_branches.sql', 'UTF-8');
            const imagesSql = fs.readFileSync(resourceDir.DB_INIT_DIR + '/main_images.sql', 'UTF-8');
            const notesImageSql = fs.readFileSync(resourceDir.DB_INIT_DIR + '/main_note_images.sql', 'UTF-8');

            await sql.doInTransaction(async () => {
                await sql.executeScript(schema);
                await sql.executeScript(notesSql);
                await sql.executeScript(notesTreeSql);
                await sql.executeScript(imagesSql);
                await sql.executeScript(notesImageSql);

                const startNoteId = await sql.getValue("SELECT noteId FROM branches WHERE parentNoteId = 'root' AND isDeleted = 0 ORDER BY notePosition");

                await require('./options').initOptions(startNoteId);
                await require('./sync_table').fillAllSyncRows();
            });

            log.info("Schema and initial content generated. Waiting for user to enter username/password to finish setup.");

            // we don't resolve dbReady promise because user needs to setup the username and password to initialize
            // the database
        }
        else {
            if (!await isUserInitialized()) {
                log.info("Login/password not initialized. DB not ready.");

                return;
            }

            if (!await isDbUpToDate()) {
                return;
            }

            resolve(db);
        }
    })
    .catch(e => {
        console.log("Error connecting to DB.", e);
        process.exit(1);
    });
});

function setDbReadyAsResolved() {
    dbReadyResolve();
}

async function isDbUpToDate() {
    const dbVersion = parseInt(await sql.getValue("SELECT value FROM options WHERE name = 'db_version'"));

    const upToDate = dbVersion >= appInfo.db_version;

    if (!upToDate) {
        log.info("App db version is " + appInfo.db_version + ", while db version is " + dbVersion + ". Migration needed.");
    }

    return upToDate;
}

async function isUserInitialized() {
    const username = await sql.getValue("SELECT value FROM options WHERE name = 'username'");

    return !!username;
}

module.exports = {
    dbReady,
    isUserInitialized,
    setDbReadyAsResolved,
    isDbUpToDate
};