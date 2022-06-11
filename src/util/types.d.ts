export interface MCVersion {
	enabled: boolean;
	name: string;
	gitName: string;
	releaseType: string;
	dependencies:  {
		curseforge: Array<CFDependency>;
		modrinth: Array<MRDependency>;
	};
	mcVersions: {
		curseforge: Array<number>;
		modrinth: Array<string>;
	};
	modrinthLoaders: Array<string>;
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
	gitRepo: string;
	changeLogType: "markdown" | "html";
	curseforgeID: number;
	modrinthID: string;
}
