<h1 align="left">
 RoxStar 💎
</h1>

> <i>Can you keep a secret?</i><br><i>I'm a Moshi on a mission...</i><br><i>I'M MISSY KIX!</i><br><i>The sassy secret agent slash musician!</i>

RoxStar is a **fan-made** server (and client) implementation of the Moshi Monsters flash game API in NodeJS. 
- **By using, copying, or modifying this software you are agreeing to the terms laid out in the [License (Version 2)](https://github.com/kleineluka/roxstar/blob/main/LICENSE).**
- While the server is mostly complete, this project is still in early development and not ready for general use.
- The **current version** of Roxstar is `0.0.1` - you can also see a [Changelog.md](https://github.com/kleineluka/roxstar/blob/main/CHANGELOG.md) of notable updates and changes.

## Highlights 🌈
- Client
    - Flash support on Chromium
    - Server browser and management
    - Settings, QoL, themes, and developer tools
- Server
    - Parity with original API (WIP)
    - Fast, lightweight, secure, and configurable
    - Staff panel and moderation tools
    - Resource manifest offloading (WIP)
- Open source with RoxStar License
- Clean-room implementation with readable code

## Parity Progress ☁️
- [x] Account creation and authentication
- [x] User profiles and monster management
- [x] Friends, bestfriends, and pinboards
- [x] Moshling zoo and bios
- [x] Minigames and highscores
- [x] Clothing and furniture
- [x] Garden planting and Moshling catching
- [x] Mystery gift sending and opening
- [x] Chat and messaging
- [x] World and location visiting
- [ ] Puzzle palace
- [ ] Secret codes and rewards
- [ ] Room system
- [ ] Missions
- [ ] Ratings

When development is near completion, more in-depth documentation will be provided.

## Architecture 🦋️
You can find all of the server code inside of `server/components/` and all of the server configuration in `server/configs/`. The client code is inside `client/`. In components, different files are broken down as follows:
- `features/` - Code for specific features such as minigame highscores.
- `middleware/` - Express middleware for handling requests.
- `requests/` - Code for handling specific API endpoints broken down by category.
- `server/` - Code for server setup and configuration.
- `staff/` - Code for staff panel and moderation tools.
- `utils/` - Utility functions and helpers used across the codebase.
- `web/` - Dynamic web pages served by the server.
- `server.js` - Main server entry point and setup.

## Acknowledgements 🫶
- Mind Candy for creating the original game!
- The teams behind the [Wayback Machine](https://archive.org/) and [Flashpoint](https://bluemaxima.org/flashpoint/) for their incredible archival work.
- Other libraries and tools can be found in [Attributions.md](https://github.com/kleineluka/roxstar/blob/main/ATTRIBUTIONS.md).