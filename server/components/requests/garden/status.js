const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const gardenUtils = require('../../features/world/garden.js');

/**
 * Handles GET requests for the garden status summary.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Garden status request without userId in session.');
        return res.json({
            gardenprogress: 0,
            nextFlowerCompletionDate: 0, // might be good to do current time + 1 hour or something
            hasNewlyGrownFlowers: false
        });
    }
    try {
        const user = await database.getQuery('SELECT garden FROM users WHERE id = ?', [userId]);
        if (!user) {
            pretty.warn(`User ${userId} not found for garden status request.`);
            return res.json({ gardenprogress: 0, nextFlowerCompletionDate: 0, hasNewlyGrownFlowers: false });
        }
        const parsedGarden = gardenUtils.parseGardenString(user.garden);
        const plantedPlots = parsedGarden.filter(plot => plot.seedId !== -1);
        if (plantedPlots.length === 0) {
            // no seeds planted
            pretty.debug(`User ${userId} has no seeds planted.`);
            return res.json({ gardenprogress: 0, nextFlowerCompletionDate: 0, hasNewlyGrownFlowers: false });
        }
        // find the plot that will finish *last* (highest plantTime if progress < 100)
        // or if all are done, find the one that finished most recently (highest plantTime)
        let overallProgress = 0;
        let nextCompletionTimestamp = 0;
        let hasNewlyGrown = false;
        let latestPlantTime = 0;
        for (const plot of plantedPlots) {
            const progress = gardenUtils.calculateFlowerProgress(plot.plantTime);
            if (progress === 100) {
                hasNewlyGrown = true; // at least one flower is ready
                // keep track of the latest plant time among completed flowers
                if (plot.plantTime > latestPlantTime) {
                    latestPlantTime = plot.plantTime;
                }
            }
            // track the highest progress percentage among *all* planted seeds
            if (progress > overallProgress) {
                overallProgress = progress;
            }
            // track the latest planting time to determine the 'next' completion date
            if (plot.plantTime > nextCompletionTimestamp) { 
                nextCompletionTimestamp = plot.plantTime;
            }
        }
        // if all flowers are grown, progress should be 100
        if (plantedPlots.every(p => gardenUtils.calculateFlowerProgress(p.plantTime) === 100)) {
            overallProgress = 100;
        }
        // calculate the completion date based on the flower that was planted last
        // or if all done, use the most recently planted one's completion time
        const growthTime = gardenUtils.getGardenGrowthTime();
        const finalCompletionTimestamp = (overallProgress === 100 ? latestPlantTime : nextCompletionTimestamp) + growthTime;
        const response = {
            gardenprogress: overallProgress, // return the highest progress found
            nextFlowerCompletionDate: finalCompletionTimestamp * 1000, // to milliseconds
            hasNewlyGrownFlowers: hasNewlyGrown
        };
        res.json(response);
        pretty.debug(`Sent garden status for user ${userId}: Progress ${response.gardenprogress}%, NewlyGrown: ${response.hasNewlyGrownFlowers}`);
    } catch (error) {
        pretty.error(`Error fetching garden status for user ID ${userId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;