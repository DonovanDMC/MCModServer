export interface MCVersion {
    dependencies:  {
        curseforge: Array<CFDependency>;
        modrinth: Array<MRDependency>;
    };
    enabled: boolean;
    gitName: string;
    mcVersions: {
        curseforge: Array<number>;
        modrinth: Array<string>;
    };
    modrinthLoaders: Array<string>;
    name: string;
    releaseType: string;
}

export interface CFDependency {
    slug: string;
    type: "embeddedLibrary" | "incompatible" | "optionalDependency" | "requiredDependency" | "tool";
}
type MRDependency = never;

export interface BaseSecrets {
    cfAuth: string;
    gitAuth: string;
    gitRepo: string;
}

export interface GlobalSecrets {
    auth: string;
}

export interface BaseInfo {
    changeLogType: "markdown" | "html";
    curseforgeID: number;
    gitRepo: string;
    modrinthID: string;
}
