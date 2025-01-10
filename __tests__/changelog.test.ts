import { ChangelogParser } from '../src/changelog';
import * as path from 'path';

describe('ChangelogParser', () => {
    const fixturesPath = path.join(__dirname, 'fixtures');

    beforeAll(() => {
        // Create test CHANGELOG.md in fixtures
        const fs = require('fs');
        if (!fs.existsSync(fixturesPath)) {
            fs.mkdirSync(fixturesPath);
        }

        const changelog = `
## v1.0.0

### Features
- Feature 1
- Feature 2

### Bug Fixes
- Fix 1
- Fix 2

## v0.9.0

### Features
- Old feature
`;

        fs.writeFileSync(path.join(fixturesPath, 'CHANGELOG.md'), changelog.trim());
    });

    it('should extract version content correctly', async () => {
        const parser = new ChangelogParser(path.join(fixturesPath, 'CHANGELOG.md'));
        const result = await parser.extractVersion('v1.0.0');

        expect(result).toBeTruthy();
        expect(result?.version).toBe('v1.0.0');
        expect(result?.content).toContain('## v1.0.0');
        expect(result?.content).toContain('### Features');
        expect(result?.content).toContain('Feature 1');
        expect(result?.content).not.toContain('## v0.9.0');
    });

    it('should return null for non-existing version', async () => {
        const parser = new ChangelogParser(path.join(fixturesPath, 'CHANGELOG.md'));
        const result = await parser.extractVersion('v2.0.0');

        expect(result).toBeNull();
    });

    it('should throw error for non-existing file', () => {
        expect(() => {
            new ChangelogParser('non-existing.md');
        }).toThrow('Changelog file not found');
    });
});