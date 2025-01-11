export interface ChangelogSection {
    version: string;
    content: string;
}

export interface ActionInputs {
    version: string;
    changelogFile: string;
    assets?: string[];
}

export interface GitHubReleaseResponse {
    id: number;
    upload_url: string;
    tag_name: string;
    name: string;
}