// Deploy the included Cloudflare Worker and put its public URL here. The worker
// performs the GitHub Device Flow exchange because GitHub's login endpoints do
// not permit direct browser CORS requests.
window.BACKROOMS_CONFIG = {
  owner: "tharak",
  repo: "backrooms",
  messageIssueNumber: 1,
  oauthBrokerUrl: "",
  githubApiVersion: "2026-03-10"
};
