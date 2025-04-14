const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests to fetch a simplified list of all available Moshlings.
 */
router.get('/', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Moshling all request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!global.storage_moshlings) {
        pretty.error("Moshling storage (global.storage_moshlings) not loaded.");
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server configuration error</error>');
    }
    try {
        const formattedMoshlings = [];
        // get the moshi keys and sort them by ID
        const sortedKeys = Object.keys(global.storage_moshlings).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        for (const moshlingId of sortedKeys) {
            const moshling = global.storage_moshlings[moshlingId];
            if (moshling) { 
                formattedMoshlings.push({
                    moshling: { 
                        '@path': moshling.asset || '',
                        '@available': 'true',
                        '@id': moshlingId,
                        '@name': moshling.name || 'Unknown Moshling'
                    }
                });
            }
        }
        const responseData = {
            moshlings: {
                status: {
                    '@code': 0,
                    '@text': 'success' 
                },
                 moshling: formattedMoshlings.map(m => m.moshling) // extract inner object
            }
        };
        // handle case where storage is empty
        if(formattedMoshlings.length === 0) {
            delete responseData.moshlings.moshling;
        }
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.debug(`Sent list of all Moshlings.`);
    } catch (error) {
        pretty.error('Error processing Moshling all request:', error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;