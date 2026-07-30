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
