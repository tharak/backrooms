# Backrooms

A first-person browser maze where people leave public notes for the next person.

## Run locally

Serve this directory with any static web server, for example `python3 -m http.server`.

## GitHub message wall setup

Messages are stored as JSON comments in the separate public [`tharak/backrooms-messages`](https://github.com/tharak/backrooms-messages) repository. Before deploying:

1. Create an open Issue called **Player Messages** in the message repository and copy its number.
2. Each player who wants to write creates a classic GitHub personal access token with only the `public_repo` scope.
3. The player pastes that token into the marker panel. It is kept only in their current browser session and is never committed or sent anywhere except GitHub's API.
4. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source.

Players can read without signing in. To write, they choose a name/color and paste their own classic `public_repo` token; the game appends the name to every note and stores it as a public Issue comment. The token stays only in the current browser session. Repository owners can moderate or close the issue in GitHub.
