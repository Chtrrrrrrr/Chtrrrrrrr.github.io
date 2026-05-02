# Chtrrrrrrr.github.io

> My personal website

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Active-brightgreen?logo=github)](https://Chtrrrrrrr.github.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Last Commit](https://img.shields.io/github/last-commit/Chtrrrrrrr/Chtrrrrrrr.github.io?logo=github)
![Repo Size](https://img.shields.io/github/repo-size/Chtrrrrrrr/Chtrrrrrrr.github.io)
![Stars](https://img.shields.io/github/stars/Chtrrrrrrr/Chtrrrrrrr.github.io?style=social)
## Functions
The website is divided into these sections:
- **Main Page**: modified from [Dmego's homepage](https://github.com/dmego/home.github.io).
- **Understanding Prescript**: translated from [NYOS](https://github.com/NYOS-cat/NYOS) put in `./Prescript`.
- **File Browser**: modified from my repo [File Browser](https://github.com/Chtrrrrrrr/File-Browser).
## Directory Structure
```
.
├── .github/workflows/          # GitHub Actions deployment config
├── assets/                     # Main Page assets
├── file-browser/               # File Browser
│   ├── build.js
│   ├── package.json
│   └── src/
├── Prescript/                  # Understanding Prescript
├── MuffinServerWeb/            # Private
├── NeoChtrrrrrrrWriting/       # Private
├── index.html                  # Main Page
├── 404.html
├── favicon.ico
└── LICENSE
```
## Github Page Deployment
GitHub Actions will deploys the site to `gh-pages` branch automatically while create an index of whole directory for File Browser. Then GitHub Pages will use `gp-pages` rather than `main`.
## Local Deployment
You can run this static site locally with Node.js or python:
```bash
# Clone the repo
git clone https://github.com/Chtrrrrrrr/Chtrrrrrrr.github.io.git

# Preview it on http://localhost:8080
npx serve .
# or
python3 -m http.server 8080
```
File Browser relies on pre-built directory index. If you changed files and want it refresh immediately, please use:
```bash
node build.js
```
## License
MIT