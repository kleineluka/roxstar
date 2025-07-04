*Are you ready for the show?* RoxStar is a `/client/` and `/server/` implementation of the Moshi Monsters flash game api written in NodeJS. The client is a minimal Electron application that has Flash support enabled and the server runs through Express, Mustache, and Sqlite3. This is a love letter to the game that shaped many childhoods across the world.

**By using, copying, or modifying this software you are agreeing to the terms laid out below.**
 
## Notice & Usage Terms 😇
This project is a fan-made, local-use-only tool created for archival, testing, and server research purposes. It is not affiliated with or endorsed by the original game's developers in any way. Please read the terms below carefully:

### Restrictions and Limitations
- This project must not be used on public-facing networks, hosted servers, or redistributed in any form.
- It is not secure in its current state and may contain vulnerabilities.
- No assistance or support is offered for setup or usage.
- Monetary gain or commercial use is strictly prohibited.
- The schemas and structure may change frequently — old databases will likely break.
- Do not use this project to violate local laws, spread malware, or cause harm to others in any way.
- You must clearly identify this as a fan project and must not impersonate the original developers or game.
- You must immediately cease use of this project if:
    - The original game becomes available to play again
    - The project is taken down or the terms are changed and you disagree with them
 
### Development and License
- The project follows a clean-room philosophy: contributions are not accepted to maintain this approach.
- Only original code written specifically for this project is included in this repository.
- This project does not assist in finding or using any files beyond the code provided.
- You must stop using this project if the license terms change and you do not agree to the new ones.
- Outside of any other specified terms, the code is licensed under **GNU General Public License v3.0**

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
- The original `game creators` for making something worth keeping alive
