# Changelog Release Action

Automatically create GitHub releases with changelog content extracted from your CHANGELOG.md file. This action helps maintain consistent releases by automating the process of creating tags, extracting relevant changelog sections, and publishing releases.

## Features

- 📝 Extracts version-specific content from your changelog
- 🏷️ Creates and pushes Git tags automatically
- 🚀 Creates GitHub releases with changelog content
- 📦 Optionally attaches files to the release
- ✨ TypeScript-based with full test coverage

## Usage

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release'
        required: true
        type: string

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: IdanKoblik/Changelog@production
        with:
          version: ${{ github.event.inputs.version }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs
| INPUT          | DESCRIPTION                                 | REQUIRED | DEFAULT      |
|----------------|---------------------------------------------|----------|--------------|
| version        | Version/tag to release (e.g., v1.0.0)       | Yes      | N/A          |
| changelog-file | Path to changelog file                      | No       | CHANGELOG.md | 
| assets         | Assets to include in release (glob pattern) | No       | ''           |

## Changelog Format
This action expects your changelog to follow the format below:

```markdown
## v1.0.0

### Features
- New feature 1
- New feature 2

### Bug Fixes
- Fixed issue 1
- Fixed issue 2

## v0.9.0
...
```

