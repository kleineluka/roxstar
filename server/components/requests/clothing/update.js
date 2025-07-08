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
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Costume update request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    // get the costume data
    const costumeData = req.body?.costume;
    if (!costumeData) {
        pretty.warn(`Costume update for user ${userId} received invalid/empty XML. Body: ${JSON.stringify(req.body)}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_XML">Invalid request format</error>');
    }
    // extract everything that we need
    const animationPrefix = costumeData.attribute?.$?.value || '';
    const itemsToWear = costumeData.item ? (Array.isArray(costumeData.item) ? costumeData.item : [costumeData.item]) : [];
    const newDressupItems = [];
    const itemInstanceIds = [];
    for (const item of itemsToWear) {
        const itemAttrs = item.$;
        // this *should* correctly access the nested properties
        const transformAttrs = item.localTransform?.[0]?.$;
        if (!itemAttrs?.id || !transformAttrs) {
            pretty.warn(`Skipping invalid item in costume update for user ${userId}: Missing attributes or transform. Item: ${JSON.stringify(item)}`);
            continue;
        }
        const itemInstanceId = parseInt(itemAttrs.id, 10);
        if (isNaN(itemInstanceId)) {
            pretty.warn(`Skipping item with invalid instance ID: ${itemAttrs.id}`);
            continue;
        }
        itemInstanceIds.push(itemInstanceId);
        newDressupItems.push({
            user_id: userId,
            item_id: itemInstanceId, // instance id from the clothes table
            x: parseFloat(transformAttrs.x || 0),
            y: parseFloat(transformAttrs.y || 0),
            z: parseFloat(transformAttrs.z || 0),
            xscale: parseFloat(transformAttrs.xscale || 1),
            yscale: parseFloat(transformAttrs.yscale || 1),
            rotation: parseFloat(transformAttrs.rotation || 0),
            layer: parseInt(itemAttrs.layer || 0, 10),
            boneName: itemAttrs.boneName || '',
            direction: itemAttrs.direction || 'right', // default to right
            date: clock.getTimestamp()
        });
    }
    pretty.debug(`Dressup items (for update) prepared for insertion: ${JSON.stringify(newDressupItems)}`);
    try {
        // ensure the user actually has those items
        if (itemInstanceIds.length > 0) {
            // get unique ids - client likes to send multiple instances of the same thing (for some reason)
            const uniqueItemIdsToWear = new Set(itemInstanceIds);
            const ownedItems = await database.getAllQuery(
                `SELECT id FROM clothes WHERE user_id = ? AND id IN (${Array.from(uniqueItemIdsToWear).map(() => '?').join(',')})`,
                [userId, ...uniqueItemIdsToWear]
            );
            const ownedItemIdsSet = new Set(ownedItems.map(item => item.id));
            pretty.debug(`Attempting to wear unique item instance IDs: [${Array.from(uniqueItemIdsToWear).join(', ')}]`);
            pretty.debug(`Actually owned item instance IDs: [${Array.from(ownedItemIdsSet).join(', ')}]`);
            if (ownedItemIdsSet.size !== uniqueItemIdsToWear.size) {
                const unownedItems = Array.from(uniqueItemIdsToWear).filter(id => !ownedItemIdsSet.has(id));
                pretty.warn(`User ${userId} tried to wear unowned clothing items (unique IDs): [${unownedItems.join(', ')}]. Aborting update.`);
                return res.status(403).type('text/xml').send('<error code="OWNERSHIP_ERROR">Attempted to wear unowned item(s)</error>');
            }
        }
        // do it all in a transaction to make sure it's all good
        await database.runQuery('BEGIN TRANSACTION');
        await database.runQuery("UPDATE users SET dressup_prefix = ? WHERE id = ?", [animationPrefix, userId]);
        await database.runQuery("DELETE FROM dressup WHERE user_id = ?", [userId]);
        if (newDressupItems.length > 0) {
            const placeholders = newDressupItems.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
            const values = newDressupItems.flatMap(item => Object.values(item));
            const columns = Object.keys(newDressupItems[0]).join(',');
            const sql = `INSERT INTO dressup (${columns}) VALUES ${placeholders}`;
            await database.runQuery(sql, values);
        }
        await database.runQuery('COMMIT');
        // log it and send success
        await socialUtils.logBffNews(userId, 'UpdatedMonsterDress', "null");
        pretty.print(`Updated costume for user ${userId}.`, 'ACTION');
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