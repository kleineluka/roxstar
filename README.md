<h1 align="center">
 💎 RoxStar 🎤
</h1>

<p align="center">
  Every Moshi's talking about the latest thing~ The fact that Moshi Monsters has been re-implemented in NodeJS! 
</p>

RoxStar is a **fan-made** client and server re-implementation of the Moshi Monsters flash game API! This is a love letter to the game that shaped many childhoods across the world. **By using, copying, or modifying this software you are agreeing to the terms laid out in the [license](https://github.com/kleineluka/roxstar/blob/main/LICENSE) (you may also read it [below](#notice--usage-terms-)).**

## What is this, and why? 🎵
Every online game relies on a central server. This stores data such as player's Moshlings, Rox balance, and high scores. When the official servers were shut down, the game became unplayable. While a few closed-source revival projects exist, RoxStar was created to be the first fully open-source, secure, and transparent implementation for everyone.

The second challenge is Flash, the technology the game was built on, which modern browsers no longer support. The RoxStar client solves this. It's a lightweight, custom browser that enables Flash - allowing the game to run just as it used to. While I hope for a future where drop-in replacements like Ruffle make this unnecessary, for now, the client is a handy lil thing that brings the game back to life.

**TL;DR** - a **fan-made** project to make Moshi Monsters playable on your PC. RoxStar is not hosted anywhere online and is made strictly for offline use. It is not permitted to host public instances of this software, as this project's goal is purely one of preservation, driven by love and respect for the original creators. Please only use instances of RoxStar you host yourself for your own safety as well.

## Features 💎
- Fully open source, forever transparent and free.
- Extremely lightweight and crazy stupidly fast.
- Cross-platform, run on Windows, Mac, Linux, toaster, or anything else (that runs Node).
- Run locally on your PC and be your own admin - no reliance on third-party servers.
- Written in modern, secure languages, with extensive documentation.
- A lot of progress complete! Around 80% of the core game is done.
- A lot of tools for custom content! More on this soon!
- A lot of custom features! Also.. more on this soon!

## Progress and Roadmap 🌈
- [x] Moshling Zoo and Garden
- [x] User Accounts and Login
- [x] Minigames and Highscores
- [x] Medals and Profiles
- [x] Room Decor and House Customisation
- [x] Streets and Shops
- [ ] Gifts
- [ ] Colourama
- [ ] Extra Pages (ex. FAQ) 
- [ ] Super Moshi Missions

There is **a lot of stuff** covered that isn't listed here, this is just a general overview of some of the main things. I'll expand on this in the future! (for now.. focused on the actual code..)

## Code Structure 🛠️
The client is a minimal Electron application that has Flash support enabled and the server runs through Express, Mustache, and Sqlite3.

- `/features/` hosts reusable helper functions for various tasks (ex. getting a user's level)
- `/middleware/` hosts the stack that processes requests to the server (ex. routing requests or parsing data)
- `/requests/` hosts all the endpoints that the game calls (ex. when a user buys an item)
- `/server/` hosts internal server-related functions (ex. database, cache, or session management)
- `/utils/` contains random helper functions unrelated to anything in specific (ex. logging)
- `/web/` hosts templates that are dynamically served and injected (ex. login page)

After installing the dependencies in both `/client/` and `/server/`, simply run `npm start` in each directive to start the client and server. **Please note that no game files or assets are supplied here, only original code for the server emulator and client.**

## Acknowledgements 🥰
- The original creators of Moshi Monsters (Mind Candy) for building a world worth preserving. Mind Candy has previously stated that implementations of the archived game are allowed for use that doesn't infringe on their rights, doesn't profit, and doesn't impersonate the original game.
- The teams behind the [Wayback Machine](https://archive.org/) and [Flashpoint](https://bluemaxima.org/flashpoint/) for their incredible archival work.
- [FFDec](https://github.com/jindrapetrik/jpexs-decompiler) for making Flash reverse-engineering accessible.

## Notice & Usage Terms 😇
<details>
<summary>This project is a fan-made, local-use-only tool created for archival, testing, and server research purposes. It is not affiliated with or endorsed by the original game's developers in any way. Please expand this and read the terms carefully or refer to the license file.</summary>

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
- Outside of any other specified terms, the code is licensed under the **RoxStar License**.

This code is provided under the terms listed above, otherwise, all rights reserved. **Please reach out to me if you have any questions or concerns, or if you want the repository to be modified or taken down.**

Here is a copy of the **RoxStar License**:

This license governs the use of the RoxStar software and its associated source code ("the Software"). By using, copying, modifying, or distributing the Software, you agree to the terms of this license.

### 1. Definitions
- "The Software" refers to all original code, files, and documentation contained in this repository.
- "Personal Use" refers to running the Software on a machine under your direct, personal control for private, non-commercial purposes.
- "Public Hosting" refers to making the Software accessible to others over a local network or the internet.

### 2. Permissions Granted
You are hereby granted a non-exclusive, worldwide, royalty-free license to:
- **View and Fork:** View the Software's source code and create a personal fork for backup or private modification.
- **Personal Use:** Run the Software on a local machine for your own Personal Use.
- **Private Modification:** Modify the Software for your own Personal Use.

### 3. Restrictions and Limitations
The permissions granted above are subject to the following restrictions. You may NOT:
- **Redistribute:** Redistribute the Software, or any modified versions of it, in any form.
- **Publicly Host:** Use the Software on public-facing networks or engage in any form of Public Hosting.
- **Use Commercially:** Use the Software for any commercial purpose or monetary gain.
- **Remove Notices:** Remove or alter this license or any copyright notices within the Software.
- **Impersonate:** Use the Software to impersonate the original game, its creators, or its affiliates. This Software must always be identified as a fan project.

### 4. Special Conditions
- You must immediately cease all use of the Software if the original game, Moshi Monsters, becomes officially available to play again.
- You must immediately cease all use of the Software if the copyright holder of this project requests it, or if the terms of this license change and you do not agree with the new terms.

### 5. No Affiliation
This project is a fan-made tool created for archival and educational purposes. It is not affiliated with, authorized, or endorsed by Mind Candy or the original creators of Moshi Monsters in any way.

### 6. Disclaimer of Warranty & Limitation of Liability
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
</details>