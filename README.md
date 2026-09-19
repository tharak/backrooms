# Backrooms

A first-person browser maze where people leave public notes for the next person.

## Run locally

Serve this directory with any static web server, for example `python3 -m http.server`.

## GitHub message wall setup

Messages are stored as JSON comments on one Issue in this same repository. Before deploying:

1. Create an open Issue called **Player Messages** and copy its number.
2. Create a fine-grained GitHub token with **Issues: Read and write** access limited to this repository.
3. Deploy the small message relay in `worker/`: set `GITHUB_TOKEN`, `GITHUB_OWNER` (`tharak`), `GITHUB_REPO` (`backrooms`), and `GITHUB_ISSUE_NUMBER` (`1`) with `npx wrangler secret put …`, then run `npx wrangler deploy` from `worker/`.
4. Put the deployed Worker URL in `messageBrokerUrl` in `js/config.js`.
5. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source.

Players can read and write without signing in. They choose a name and marker color, which are remembered only in their browser; the relay appends the name to every note and stores it as a public Issue comment. The relay holds the repository token as a Cloudflare secret, and does not store player data or sessions. Repository owners can moderate or close the issue in GitHub.
