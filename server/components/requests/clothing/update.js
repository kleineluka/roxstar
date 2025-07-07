const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');
const socialUtils = require('../../features/account/socials.js');

/**
 * Handles POST requests to update the user's worn costume.
 * Expects XML body like: <costume><attribute .../><item .../></costume>
 */
router.post('/', async (req, res) => {
    // sanity checks
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Costume update request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    const costumeData = req.body?.costume;
    if (!costumeData) {
        pretty.warn(`Costume update for user ${userId} received invalid/empty XML. Body: ${JSON.stringify(req.body)}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_XML">Invalid request format</error>');
    }
    // get everything we need
    const animationPrefix = costumeData.attribute?.$?.value || '';
    const itemsToWear = costumeData.item ? (Array.isArray(costumeData.item) ? costumeData.item : [costumeData.item]) : [];
    // prepare data
    const newDressupItems = [];
    const itemInstanceIds = []; // to validate ownership
    for (const item of itemsToWear) {
        const itemAttrs = item.$;
        const transformAttrs = item.localTransform?.$;
        if (!itemAttrs?.id || !transformAttrs) {
            pretty.warn(`Skipping invalid item in costume update for user ${userId}: ${JSON.stringify(item)}`);
            continue;
        }
        const itemInstanceId = parseInt(itemAttrs.id, 10);
        if (isNaN(itemInstanceId)) {
            pretty.warn(`Skipping item with invalid instance ID: ${itemAttrs.id}`);
            continue;
        }
        itemInstanceIds.push(itemInstanceId);
        // add the new item to the list
        newDressupItems.push({
            user_id: userId,
            item_id: itemInstanceId, // instance id from the clothes table
            x: parseFloat(transformAttrs.x || 0),
            y: parseFloat(transformAttrs.y || 0),
            z: parseFloat(transformAttrs.z || 0), // unsure about this one
            xscale: parseFloat(transformAttrs.xscale || 1),
            yscale: parseFloat(transformAttrs.yscale || 1),
            rotation: parseFloat(transformAttrs.rotation || 0),
            layer: parseInt(itemAttrs.layer || 0, 10),
            boneName: itemAttrs.boneName || '',
            direction: itemAttrs.direction || 'right', // default to right for direction
            date: clock.getTimestamp()
        });
    }
    // now validate and save it
    try {
        // make sure the items are good and the user has them before saving
        if (itemInstanceIds.length > 0) {
            const ownedItems = await database.getAllQuery(
                `SELECT id FROM clothes WHERE user_id = ? AND id IN (${itemInstanceIds.map(() => '?').join(',')})`,
                [userId, ...itemInstanceIds]
            );
            const ownedItemIdsSet = new Set(ownedItems.map(item => item.id));
            if (ownedItemIdsSet.size !== itemInstanceIds.length) {
                const unownedItems = itemInstanceIds.filter(id => !ownedItemIdsSet.has(id));
                pretty.warn(`User ${userId} tried to wear unowned clothing items: [${unownedItems.join(', ')}]. Aborting update.`);
                return res.status(403).type('text/xml').send('<error code="OWNERSHIP_ERROR">Attempted to wear unowned item(s)</error>');
            }
        }
        // perform database operations in a transaction for no half-finished update
        await database.runQuery('BEGIN TRANSACTION');
        // first: update the dressup_prefix for the user
        await database.runQuery("UPDATE users SET dressup_prefix = ? WHERE id = ?", [animationPrefix, userId]);
        // second: Delete all existing worn items for the user
        await database.runQuery("DELETE FROM dressup WHERE user_id = ?", [userId]);
        // third: insert new dressup items user is wearing
        if (newDressupItems.length > 0) {
            const placeholders = newDressupItems.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
            const values = newDressupItems.flatMap(item => Object.values(item)); // flatten objects into single array of values
            const columns = Object.keys(newDressupItems[0]).join(','); // get column names from first item
            const sql = `INSERT INTO dressup (${columns}) VALUES ${placeholders}`;
            await database.runQuery(sql, values);
        }
        // finally: commit the transaction
        await database.runQuery('COMMIT');
        // additionally, send bff news log
        await socialUtils.logBffNews(userId, 'UpdatedMonsterDress', "null");
        // and now.. the long awaited.. we did it!
        pretty.debug(`Updated costume for user ${userId}.`, 'ACTION');
        const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
        res.type('text/xml').send(successXml);
    } catch (error) {
        // rollback transaction on any error
        await database.runQuery('ROLLBACK');
        pretty.error(`Error processing costume update for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } }).end();
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;