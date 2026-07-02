# Publishing and Releasing Updates
When the user asks to publish or release an update for this CLI package:
1. Ensure all local changes are committed (e.g., `git add . && git commit -m "..."`).
2. Bump the version using npm, which automatically updates `package.json` and creates a version tag (e.g., `v1.0.1`): `npm version patch` (or minor/major).
3. Push the commits and the new tag to GitHub: `git push origin main --follow-tags`.
4. **DO NOT** manually run `npm publish` or build standalone executables locally. The GitHub Actions workflow (`.github/workflows/release.yml`) will automatically handle NPM publishing and uploading binaries to GitHub Releases when the tag is pushed.
