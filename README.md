*Are you ready for the show?* RoxStar is a `/client/` and `/server/` implementation of an abandonware API, written in NodeJS. The client is a minimal Electron application that has Flash support enabled, and the server runs through Express, Mustache, and Sqlite3. **By using, copying, or modifying this software you are agreeing to the terms laid out below.** This is a love letter to the game that shaped many childhoods across the world.

## Notice, License and Terms ‼️
- May not be used on public-facing networks or redistributed in any form
- Not secure in current stage and may have vulnerabilities
- Created for local testing, fan archival, and server research
- Fan project and not affiliated with any other project
- Only original code for this project is contained in this repository
- This project will never assist in finding files that aren't part of its original code
- Schemas are likely to change as developed, so old databases will break
- Developed with clean room philosophy— contributions are generally not accepted to maintain this approach
- You may not use this project for any monetary gain or profit
- You may not use this project for anything that violates your local laws or regulations
- You may not use this project for anything that could invoke harm to others (ex. spreading malware or hate)
- You must make it known that this is a fan project, and you may not impersonate the original game or its developers
- This project may only be used so long as the original game is not available to play, and you must cease using it if the original game is made available again
- I will not provide any support, help, or liability for any code here
- I do not/will not deploy this code to a live or public environment
- I never owned an account on the original game
- I can take down this project at any time, for any reason, and you must cease using it if I do so
- I can change these terms at any time, and you must cease using this project if I do so (unless you agree to the new terms)

This code is provided under the terms listed above, otherwise, all rights reserved. **Please reach out to me if you have any questions or concerns, or if you want the repository to be modified or taken down.**

## Code Structure 💎
- `/features/` hosts reusable helper functions for various tasks (ex. getting a user's level)
- `/middleware/` hosts the stack that processes requests to the server (ex. routing requests or parsing data)
- `/requests/` hosts all the endpoints that the game calls (ex. when a user buys an item)
- `/server/` hosts internal server-related functions (ex. database, cache, or session management)
- `/utils/` contains random helper functions unrelated to anything in specific (ex. logging)
- `/web/` hosts templates that are dynamically served and injected (ex. login page)

## Acknowledgements 🥰
- `FFDec` for reverse-engineering AS3 code
- `Wayback Machine / Archive` for hosting old web files and network requests
- `My spouse` whom I build this for, a momento of how we met