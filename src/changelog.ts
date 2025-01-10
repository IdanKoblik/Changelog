import * as fs from 'fs';
import { ChangelogSection } from './types';

export class ChangelogParser {
    constructor(private filePath: string) {
        if (!fs.existsSync(filePath))
            throw new Error(`Changelog file not found: ${filePath}`);
    }

    public async extractVersion(targetVersion: string): Promise<ChangelogSection | null> {
        const content = await fs.promises.readFile(this.filePath, 'utf8');
        const lines = content.split('\n');

        let capturing = false;
        let versionContent: string[] = [];

        for (const line of lines) {
            if (line.startsWith('## ')) {
                const version = line.replace('## ', '').trim();

                if (version === targetVersion) {
                    capturing = true;
                    versionContent.push(line);
                } else if (capturing)
                    break;

            } else if (capturing)
                versionContent.push(line);
        }

        if (versionContent.length === 0) {
            return null;
        }

        return {
            version: targetVersion,
            content: versionContent.join('\n')
        };
    }
}