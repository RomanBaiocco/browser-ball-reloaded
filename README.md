# [browser-ball-reloaded](https://romanbaiocco.github.io/browser-ball-reloaded/)

A rewrite of [Browser Ball by Mark Mahoney](https://experiments.withgoogle.com/browser-ball) (that is currently a work in progress)

## Setup

Run `bun install` inside the root directory, and then run `bun dev` to launch the stie.

## Building

Run `bun run build` to build the static site. Run `bun preview` to test it out.

## GitHub Pages

This repo is configured to automatically [build and deploy](https://vitejs.dev/guide/static-deploy#github-pages) the site to github pages upon a push to `main`. To and preview the version for github pages, make sure to run `bun run build` and `bun preview` with the environment variable `GITHUB_PAGES=true`.
