# Backrooms

A first-person browser maze where people leave public notes for the next person. Level 0 ends at a normal-looking wall with no collision; passing through it opens the playable concrete maze of Level 1.

## Run locally

Serve this directory with any static web server, for example `python3 -m http.server`.

## Player tutorial: create a token and leave a message

Players do not need to sign in with GitHub to explore or read messages. A token is only needed when the marker writes a public wall message.

1. Open the [Backrooms game](https://tharak.github.io/backrooms/).
2. On the welcome screen, click **CREATE TOKEN ↗**. This opens GitHub's classic personal-access-token page.
3. Sign in to GitHub if asked. Give the token a short name such as `Backrooms marker`, choose an expiration, select only the `public_repo` scope, and generate it. GitHub shows the token only once, so copy it immediately.
4. Paste the token into **GITHUB TOKEN** in the game. Choose a marker name and color, then click **ENTER LEVEL 0**.
5. Explore with **WASD** and look with the mouse. Press **F** or click **FLASHLIGHT: OFF** to toggle your handheld beam. Press **E** or click the marker to write. Face a wall, type up to 280 characters, and click **WRITE ON THE WALL**. Your chosen name is appended automatically.
6. In Level 0, find the ordinary-looking wall that does not stop you. Walk through it to enter Level 1 without a popup. To return, walk back through the entrance wall behind your Level 1 starting position.

Keep the token private. The game stores it only in this browser tab's session storage and sends it only to GitHub's API when posting. Use a dedicated token with the smallest scope, never paste it into a message, and revoke it from GitHub after testing if you no longer need it.

## Maintainer setup: GitHub message walls

Messages are stored as JSON comments in the separate public [`tharak/backrooms-messages`](https://github.com/tharak/backrooms-messages) repository. Before deploying:

1. Create one open issue per level. The repository is prepared with ten Level 0–9 issues. The issue title is that level's deterministic seed, and its JSON comments are that level's messages. Keep the issue numbers in `js/config.js` in level order.
2. Each player who wants to write creates a classic GitHub personal access token with only the `public_repo` scope.
3. The player pastes that token into the welcome screen. It is kept only in their current browser session and is never committed or sent anywhere except GitHub's API.
4. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source.

Players can read without signing in. To write, they choose a name/color and paste their own classic `public_repo` token; the game appends the name to every note and stores it as a public comment on the current level's issue. The token stays only in the current browser session. Repository owners can moderate or close either issue in GitHub.

Changing an issue title creates a different deterministic level variant. New messages include that exact seed title, so they only render for the matching variant; legacy Level 0 comments without seed metadata remain supported.

For the issue-by-issue layout and moderation notes, see the [message repository tutorial](https://github.com/tharak/backrooms-messages#backrooms-message-repository).
