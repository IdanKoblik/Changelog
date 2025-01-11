import * as core from '@actions/core';
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import {ChangelogParser} from './changelog';
import {ActionInputs} from './types';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

async function run(): Promise<void> {
    try {
        const inputs: ActionInputs = {
            version: core.getInput('version', { required: true }),
            changelogFile: core.getInput('changelog-file') || 'CHANGELOG.md',
            assets: core.getInput('assets'),
        };

        await createTag(inputs.version);

        const parser = new ChangelogParser(inputs.changelogFile);
        const changelog = await parser.extractVersion(inputs.version);

        if (!changelog)
            throw new Error(`Version ${inputs.version} not found in changelog`);

        const tempFile = 'CHANGELOG_temp.md';
        await fs.promises.writeFile(tempFile, changelog.content);

        await createRelease(inputs, tempFile);
        await fs.promises.unlink(tempFile);
    } catch (error) {
        if (error instanceof Error)
            core.setFailed(error.message);
        else
            core.setFailed('An unexpected error occurred');
    }
}

async function createTag(version: string): Promise<void> {
    await exec.exec('git', ['tag', version]);
    await exec.exec('git', ['push', 'origin', version]);
}

async function createRelease(inputs: ActionInputs, changelogPath: string): Promise<void> {
    const token = core.getInput('github-token', { required: true });
    const octokit = github.getOctokit(token);

    const release = await octokit.rest.repos.createRelease({
        ...github.context.repo,
        tag_name: inputs.version,
        name: inputs.version,
        body: await fs.promises.readFile(changelogPath, 'utf8'),
    });

    if (inputs.assets) {
        const assetPaths = inputs.assets.split(',').map(p => p.trim());

        for (const assetPattern of assetPaths) {
            const files = glob.sync(assetPattern);

            for (const file of files) {
                const fileName = path.basename(file);
                const contentLength = (await fs.promises.stat(file)).size;
                const contentType = getContentType(fileName);

                const uploadResponse = await octokit.rest.repos.uploadReleaseAsset({
                    ...github.context.repo,
                    release_id: release.data.id,
                    name: fileName,
                    data: await fs.promises.readFile(file) as any,
                    headers: {
                        'content-type': contentType,
                        'content-length': contentLength,
                    },
                });

                core.info(`Uploaded ${fileName} to release ${inputs.version}`);
            }
        }
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