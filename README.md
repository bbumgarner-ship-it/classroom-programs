# classroom-programs
Approved browser programs. Public release files only.

## Publish games and updates

The Cloudflare site is https://classroom-programs.pages.dev/.
Push to `main` to publish the complete collection through GitHub Actions. One repository
secret named `CLOUDFLARE_API_TOKEN` is required, with Cloudflare Pages Edit permission
for the hosting account. The account ID is public configuration in the workflow.

- **Update an existing game:** keep its `id`, replace its file or update its `path`, and
  increase its integer `version` when releasing a new version. Keep its assigned `week`.
- **Add a game:** add its files and one entry in `catalog.json` with a new stable `id`,
  `title`, `description`, `tags`, `path`, positive integer `version`, and integer `week`.
  For example, `"week": 2` places it under Week 2. Assign the week explicitly; it is
  not inferred from the title or upload date.
- Tabs become available automatically when they contain games. Week 0 is reserved for
  older projects that are not part of the weekly collection.
- If multiple entries share an ID, the highest version is shown once; the last entry
  wins a tie. Different IDs are different games, even if their titles match.
- Accepted game paths follow the existing release formats: `game-example.html`,
  `games/example/v2/index.html`, or `p/example/v2/`.

The publish step validates metadata and referenced game files before deployment,
recalculates game hashes to prevent an old cached version opening, and publishes a
complete snapshot. Invalid metadata stops publication and preserves the last live site.
Files absent from the repository are absent from the next deployment.

To prepare a local preview, run `node scripts/prepare-site.mjs` and serve `dist/` with
any static web server. Do not upload the source checkout's `.git` or automation files.
