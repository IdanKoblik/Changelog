import * as core from '@actions/core';
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import {ChangelogParser} from './changelog';
import {ActionInputs} from './types';
import * as fs from 'fs';

async function run(): Promise<void> {
    try {
        const inputs: ActionInputs = {
            version: core.getInput('version', { required: true }),
            changelogFile: core.getInput('changelog-file') || 'CHANGELOG.md',
            files: core.getInput('files')
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
    await octokit.rest.repos.createRelease({
        ...github.context.repo,
        tag_name: inputs.version,
        name: inputs.version,
        body: await fs.promises.readFile(changelogPath, 'utf8'),
        assets: inputs.files ? inputs.files.split('\n').map(f => f.trim()) : undefined
    });
}

run();