const utils = require('./utils');
const dateUtils = require('./date_utils');
const log = require('./log');
const sql = require('./sql');
const sqlInit = require('./sql_init');
const cls = require('./cls');

async function saveSourceId(sourceId) {
    await sql.insert("source_ids", {
        sourceId: sourceId,
        dateCreated: dateUtils.nowDate()
    });

    await refreshSourceIds();
}

function createSourceId() {
    const sourceId = utils.randomString(12);

    log.info("Generated sourceId=" + sourceId);
    return sourceId;
}

async function generateSourceId() {
    const sourceId = createSourceId();

    await saveSourceId(sourceId);

    return sourceId;
}

async function refreshSourceIds() {
    allSourceIds = await sql.getColumn("SELECT sourceId FROM source_ids ORDER BY dateCreated DESC");
}

let allSourceIds = [];

function isLocalSourceId(srcId) {
    return allSourceIds.includes(srcId);
}

const currentSourceId = createSourceId();

// this will also refresh source IDs
sqlInit.dbReady.then(cls.wrap(() => saveSourceId(currentSourceId)));

function getCurrentSourceId() {
    return currentSourceId;
}

module.exports = {
    generateSourceId,
    getCurrentSourceId,
    isLocalSourceId
};