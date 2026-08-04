# @mindfiredigital/monodog

## 1.11.1

### Patch Changes

- Merge pull request #147 from mindfiredigital/development

## 1.11.0

### Minor Changes

- Merge pull request #139 from mindfiredigital/development

## 1.10.0

### Minor Changes

- Merge pull request #136 from mindfiredigital/development

## 1.9.0

### Minor Changes

- Merge pull request #133 from mindfiredigital/development

## 1.8.0

### Minor Changes

- Merge pull request #129 from mindfiredigital/development

## 1.7.0

### Minor Changes

- Merge pull request #125 from mindfiredigital/development

### Patch Changes

- [#66](https://github.com/mindfiredigital/MonoDog/pull/66) [`9e66dbd`](https://github.com/mindfiredigital/MonoDog/commit/9e66dbdd575f56c2bb98711087cb468b43a40a2c) Thanks [@ansumanmindfire](https://github.com/ansumanmindfire)! - ### Features
  - **Dashboard Package Publish:** Renamed package to `@mindfiredigital/monodog-dashboard` and removed `private` flag to enable npm registry publishing for CLI initialization support.
  - **Documentation:** Added detailed `README.md` files for `@mindfiredigital/monorepo-scanner`, `@mindfiredigital/utils`, `@mindfiredigital/monodog-dashboard`, and `@mindfiredigital/monodog`.
  - **NPM Keywords Integration:** Added domain-specific keywords (`monodog`, `monorepo`, `ci-cd`, `mindfiredigital`, `pnpm`, `turborepo`, etc.) to all workspace packages to improve npm discoverability.

- Updated dependencies [[`9e66dbd`](https://github.com/mindfiredigital/MonoDog/commit/9e66dbdd575f56c2bb98711087cb468b43a40a2c)]:
  - @mindfiredigital/monorepo-scanner@1.0.11
  - @mindfiredigital/utils@1.0.3

## 1.6.0

### Minor Changes

- Merge pull request #122 from mindfiredigital/development

- [#66](https://github.com/mindfiredigital/MonoDog/pull/66) [`9e66dbd`](https://github.com/mindfiredigital/MonoDog/commit/9e66dbdd575f56c2bb98711087cb468b43a40a2c) Thanks [@ansumanmindfire](https://github.com/ansumanmindfire)! - ### New Features
  - `Branch Selection:` Added remote branch selection dropdown via GitHub REST API for manual pipeline dispatches.
  - `RBAC & Viewer Role:` Implemented `Viewer` read-only role, public repository permission fallback, and `RoleGuard` UI wrapper.
  - `Release Pipeline Enhancements:` Filtered pipeline history by repository owner/repo, automated changeset git commits, and enabled `rootPath` configuration.
  - `Changelog Viewer:` Added local and GitHub Releases changelog parser with Markdown rendering and version filtering.

### Patch Changes

- Updated dependencies [[`9e66dbd`](https://github.com/mindfiredigital/MonoDog/commit/9e66dbdd575f56c2bb98711087cb468b43a40a2c)]:
  - @mindfiredigital/monorepo-scanner@1.0.10
