# Backrooms

A first-person browser maze where people leave public notes for the next person. Level 0 ends at a normal-looking wall with no collision; passing through it opens the playable concrete maze of Level 1.

## Run locally

Serve this directory with any static web server, for example `python3 -m http.server`.

## GitHub message wall setup

Messages are stored as JSON comments in the separate public [`tharak/backrooms-messages`](https://github.com/tharak/backrooms-messages) repository. Before deploying:

1. Create one open issue per level. The issue title is that level's deterministic seed, and its JSON comments are that level's messages. Put the issue numbers in `js/config.js` in level order.
2. Each player who wants to write creates a classic GitHub personal access token with only the `public_repo` scope.
3. The player pastes that token into the welcome screen. It is kept only in their current browser session and is never committed or sent anywhere except GitHub's API.
4. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source.

Players can read without signing in. To write, they choose a name/color and paste their own classic `public_repo` token; the game appends the name to every note and stores it as a public comment on the current level's issue. The token stays only in the current browser session. Repository owners can moderate or close either issue in GitHub.

Changing an issue title creates a different deterministic level variant. New messages include that exact seed title, so they only render for the matching variant; legacy Level 0 comments without seed metadata remain supported.
