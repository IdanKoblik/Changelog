import * as core from '@actions/core';
import * as fs from 'fs';
import {ChangelogParser} from './changelog';
import {ActionInputs, GitHubReleaseResponse} from './types';
import * as path from 'path';
import fetch from 'node-fetch';

async function run(): Promise<void> {
    try {
        const inputs: ActionInputs = {
            version: core.getInput('version', { required: true }),
            changelogFile: core.getInput('changelog-file') || 'CHANGELOG.md',
            assets: core.getInput('assets'),
        };

        const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/');
        const token = process.env.GITHUB_TOKEN!;

        const tagResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ref: `refs/tags/${inputs.version}`,
                sha: process.env.GITHUB_SHA,
            }),
        });

        if (!tagResponse.ok)
            throw new Error(`Failed to create tag: ${await tagResponse.text()}`);

        const parser = new ChangelogParser(inputs.changelogFile);
        const changelog = await parser.extractVersion(inputs.version);

        if (!changelog)
            throw new Error(`Version ${inputs.version} not found in changelog`);

        const tempFile = 'CHANGELOG_temp.md';
        await fs.promises.writeFile(tempFile, changelog.content);

        const releaseResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tag_name: inputs.version,
                name: inputs.version,
                body: await fs.promises.readFile(tempFile, 'utf8'),
                draft: false,
                prerelease: false,
            }),
        });

        await fs.promises.unlink(tempFile);

        if (!releaseResponse.ok)
            throw new Error(`Failed to create release: ${await releaseResponse.text()}`);

        const releaseData = await releaseResponse.json() as GitHubReleaseResponse;
        if (inputs.assets) {
            const assetPaths = inputs.assets.split(',').map(a => a.trim());

            for (const assetPath of assetPaths) {
                const fileName = path.basename(assetPath);
                const contentType = getContentType(fileName);
                const assetContent = await fs.promises.readFile(assetPath);

                const uploadResponse = await fetch(
                    `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseData.id}/assets?name=${encodeURIComponent(fileName)}`,
                    {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'Authorization': `token ${token}`,
                            'Content-Type': contentType,
                            'Content-Length': assetContent.length.toString(),
                        },
                        body: assetContent,
                    }
                );

                if (!uploadResponse.ok)
                    throw new Error(`Failed to upload asset ${fileName}: ${await uploadResponse.text()}`);
            }
        }

    } catch (error) {
        if (error instanceof Error)
            core.setFailed(error.message);
        else
            core.setFailed('An unexpected error occurred');
    }
}

function getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: {[key: string]: string} = {
        '.zip': 'application/zip',
        '.tar': 'application/x-tar',
        '.gz': 'application/gzip',
        '.exe': 'application/x-msdownload',
        '.jar': 'application/java-archive',
    };

    return contentTypes[ext] || 'application/octet-stream';
}

run();