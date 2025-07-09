<h1 align="center">
 💎 RoxStar 🎤
</h1>

<p align="center">
  <i>Are you ready for the show?</i>
</p>

RoxStar is a **fan-made** server (and client) re-implementation of the Moshi Monsters flash game API in NodeJS! This is a love letter to the game that shaped many childhoods across the world. **By using, copying, or modifying this software you are agreeing to the terms laid out in the [license](https://github.com/kleineluka/roxstar/blob/main/LICENSE).**

## What is this, and why? 🎵
RoxStar is a modern **fan-made** recreation of the Moshi Monsters server - the "engine" that ran the game. The game itself remains (mostly) the same, but those files need something to talk to, which is where RoxStar comes in. It allows you to experience Moshi Monsters all on your own computer! Think of RoxStar as a replacement for the missing puzzle piece that was taken away when the original game was shut down.

Similarly, because Flash died quite a while ago, RoxStar also includes a small client that runs the game in a contained browser with Flash support enabled. On top of both of these, RoxStar offers a lot of tools and additional features to make your nostalgic experience even better~

RoxStar **is not** a live implementation of the original game (ex. RoxStar does not have a website or run the server emulator anywhere online), and it is not meant/allowed to be used as a public server. This is meant for you to enjoy offline on your own device. RoxStar is a tool, not a game or service.

## Features 💎
- Fully open source~ forever transparent and free.
- Extremely lightweight and can run on low-end devices.
- Both the server and client run on any operating system
- No reliance on third-party servers, only your own computer.
- Written in a modern language with secure libraries.
- Extensive documentation throughout the codebase.
- Full feature parity with the original game - **almost done!**
- Admin tools to manage your own server and users - **coming soon!**
- Quality of life and customisation features - **coming soon!**
- Extra tools to help you create your own content - **coming soon!**
- A license that respects the original game and prevents abuse.

## Progress and Roadmap 🌈
I'll update this section when the server emulator is more mature. While I estimate that around 80% of the core game is done, there are still many features and improvements to be made. Perhaps I'll make a Trello board to track progress, but as a **quick list of some things** that are completely done: accounts, room decoration, shopping, dressup, garden and zoo, minigames and scores, world locations, and social features.

## Code Structure 🛠️
The `/client/` is a minimal Electron application that has Flash support enabled and the `/server/` on Express, Mustache, and Sqlite3. Due to the simple nature of the client, I'll only do an overview of the server structure here. 

**Note that** this section is irrelevant if you are not interested in learning about how the game worked, and is not required reading to run the game. **That being said -** I do suggest looking through the code regardless simply to promote safety, so that you know what is running on your computer.

- `/features/` hosts reusable helper functions for various tasks (ex. getting a user's level)
- `/middleware/` hosts the stack that processes requests to the server (ex. routing requests or parsing data)
- `/requests/` hosts all the endpoints that the game calls (ex. when a user buys an item)
- `/server/` hosts internal server-related functions (ex. database, cache, or session management)
- `/utils/` contains random helper functions unrelated to anything in specific (ex. logging)
- `/web/` hosts templates that are dynamically served and injected (ex. login page)

After installing the dependencies in both `/client/` and `/server/`, simply run `npm start` in each directive to start the client and server. **Please note that no game files or assets are supplied here, only original code for the server emulator and client.**

## Acknowledgements 🥰
- Mind Candy for creating the original game!
- The teams behind the [Wayback Machine](https://archive.org/) and [Flashpoint](https://bluemaxima.org/flashpoint/) for their incredible archival work.
- [FFDec](https://github.com/jindrapetrik/jpexs-decompiler) for making Flash reverse-engineering accessible.
- And you, for taking an interest in my little hobby project~

## Terms and License 😇
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
- Outside of any other specified terms, the code is licensed under the **RoxStar License v2**.

**Please reach out to me if you have any questions or concerns, or if you want the repository to be modified or taken down.** Mind Candy has previously stated that implementations of the archived game are allowed for use that doesn't infringe on their rights, doesn't profit, and doesn't impersonate the original game - RoxStar's license is meant to reflect that. A copy of the **RoxStar License v2** is provided below.

# RoxStar License v2

This license governs the use of the RoxStar software and its associated source code ("the Software"). By using, copying, modifying, or distributing the Software, you unconditionally agree to all terms of this license.

## 1. Definitions
- "The Software" refers to all original code, files, and documentation contained in this repository.
- "Personal Use" refers to running the Software on a machine under your direct, personal control for private, non-commercial, non-public purposes.
- "Public Hosting" refers to making the Software accessible to anyone other than yourself over a local network or the internet.

## 2. Permissions Granted
You are hereby granted a non-exclusive, revocable, worldwide, royalty-free license to:
- View and Fork: View the Software's source code and create a personal fork for backup or private modification, subject to the terms herein.
- Personal Use: Run the Software on a local machine for your own Personal Use only.
- Private Modification: Modify the Software for your own Personal Use only.

## 3. Restrictions and Limitations
The permissions granted above are subject to the following strict restrictions. You may NOT:
- Redistribute: Redistribute, share, or make available the Software, or any modified versions of it, in any form, publicly or privately.
- Publicly Host: Use the Software on public-facing networks or engage in any form of Public Hosting.
- Use Commercially: Use the Software for any commercial purpose or monetary gain, including but not limited to accepting donations related to the use or access of this Software.
- Remove Notices: Remove or alter this license or any copyright, attribution, or disclaimer notices within the Software.
- Impersonate: Use the Software to impersonate the original game, its creators, or its affiliates. This Software must always be clearly and conspicuously identified as a fan project.

## 4. Special Conditions
- You must immediately cease all use of the Software if the original game, Moshi Monsters, becomes officially available to play again through authorized channels.
- You must immediately cease all use of the Software if the copyright holder of this project requests it, or if the terms of this license change and you do not agree with the new terms. Your continued use of the Software after any changes to the license constitutes your acceptance of the new terms.

## 5. No Affiliation
This project is a fan-made tool created for archival and educational purposes. It is not affiliated with, authorized, or endorsed by Mind Candy or the original creators of Moshi Monsters in any way. All original Moshi Monsters assets, names, and trademarks are the property of their respective owners.

## 6. Disclaimer of Warranty & Limitation of Liability
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. USE OF THE SOFTWARE IS ENTIRELY AT YOUR OWN RISK.
</details>