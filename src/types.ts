export interface ChangelogSection {
    version: string;
    content: string;
}

export interface ActionInputs {
    version: string;
    changelogFile: string;
    assets?: string;
}