# Backrooms

A first-person browser maze where people leave public notes for the next person.

## Run locally

Serve this directory with any static web server, for example `python3 -m http.server`.

## GitHub message wall setup

Messages are stored as JSON comments on one Issue in this same repository. Before deploying:

1. Create an open Issue called **Player Messages** and copy its number.
2. Register a GitHub OAuth App with this game’s GitHub Pages URL as its homepage, enable **Device Flow**, and copy its client ID. No client secret belongs in this repository.
3. Put the issue number and client ID in `js/config.js`.
4. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source.

Players can read the public Issue without signing in. To write, they complete GitHub’s device-login screen and grant `public_repo`; their access token is retained only for that browser session. Repository owners can moderate or close the issue in GitHub.
