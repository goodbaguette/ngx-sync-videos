# Synchronized Video Player

Angular library for synchronizing multiple video elements with frame-accurate control, readiness barriers, and custom UI controls.

## Library Documentation

See the [ngx-sync-videos documentation](projects/ngx-sync-videos/README.md) for installation, usage, the directive API, and custom controls.

## Maintainer Development

Install dependencies and run the library checks from the repository root:

```bash
npm install
npm run build:lib
npm run test
```

The demo application can be started locally with:

```bash
npm start
```

## Release

The library is published as [`ngx-sync-videos`](https://www.npmjs.com/package/ngx-sync-videos) using `release-it`.

Log in to the public npm registry:

```bash
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
```

Preview a release without changing Git history or publishing. Build the package first because `release-it` does not run its hooks during a dry run:

```bash
npm run build:lib
npm run release -- patch --dry-run
```

Run the release interactively, choosing `patch`, `minor`, or `major` as appropriate:

```bash
npm run release -- patch
```

The release process runs the tests, updates the library version, builds the Angular library, creates a Git tag, and publishes `dist/ngx-sync-videos` to npm. A clean Git working tree is required.


### Roadmap & Todos

July, 2026
- [ ] Improve documentation, especially regarding the video facade service
- [ ] Improve provided controls component to really be used in production application (maybe also provide several theming e.g native, youtube, simple, etc...)
- [ ] Bug: when the sync directive receive an invalid video, it'll stay in "loading forever". Not sure how to react in that way, I can think of unregistering this player as the video is KO, or maybe simply updating the readiness check to ignore 404 videos.
- [ ] Weird behaviour: on short video, when video reach the ends the ready$ is behaving weirdly, not sure how to handle that (e.g a video can't be played because of the offset we reached the end, or in the contrary we're at the beginning and there's nothinh to be play during the negative offset)