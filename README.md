# Backrooms

A first-person browser maze where people leave public notes for the next person.

## Run locally

Serve this directory with any static web server, for example `python3 -m http.server`.

## GitHub message wall setup

Messages are stored as JSON comments on one Issue in this same repository. Before deploying:

1. Create an open Issue called **Player Messages** and copy its number.
2. Register a GitHub OAuth App with this game’s GitHub Pages URL as its homepage and enable **Device Flow**. No client secret belongs in this repository.
3. Deploy the small CORS broker in `worker/`: install Wrangler, run `npx wrangler secret put GITHUB_CLIENT_ID`, then `npx wrangler deploy` from `worker/`.
4. Put the deployed Worker URL in `oauthBrokerUrl` in `js/config.js`.
5. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source.

Players can read the public Issue without signing in. To write, they complete GitHub’s device-login screen and grant `public_repo`; their access token is retained only for that browser session. GitHub's login endpoints do not allow a browser hosted on Pages to use Device Flow directly, so the Worker only brokers that exchange; it does not store messages or tokens. Repository owners can moderate or close the issue in GitHub.
