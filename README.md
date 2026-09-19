# Backrooms

A first-person browser maze where people leave public notes for the next person.

## Run locally

Serve this directory with any static web server, for example `python3 -m http.server`.

## GitHub message wall setup

Messages are stored as JSON comments in the separate public [`tharak/backrooms-messages`](https://github.com/tharak/backrooms-messages) repository. Before deploying:

1. Create an open Issue called **Player Messages** in the message repository and copy its number.
2. Create a fine-grained GitHub token limited exclusively to `tharak/backrooms-messages`, with **Issues: Read and write** permission.
3. Put the token in `messageToken` in `js/config.js`, then deploy to Pages.
4. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source.

Players can read and write without signing in. They choose a name and marker color, which are remembered only in their browser; the game appends the name to every note and stores it as a public Issue comment. The token is visible to site visitors, so it must be limited solely to the message repository: a leak can affect its messages but not the game repository. Repository owners can moderate or close the issue in GitHub.
