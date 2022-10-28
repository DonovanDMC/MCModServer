import type { CFDependency } from "./types";
import { fetch, FormData, File  } from "undici";
import { readFile } from "node:fs/promises";

export default async function curseforge(projectID: number, auth: string, displayName: string, releaseType: string, changelog: string, changeLogType: "markdown" | "html", gameVersions: Array<number>, dependencies: Array<CFDependency>, filePath: string, fileName: string) {
    const data = new FormData();
    data.append("metadata", JSON.stringify({
        changelog,
        changeLogType,
        displayName,
        gameVersions,
        releaseType,
        relations: {
            projects: dependencies
        }
    }));
    data.append("file", new File([await readFile(filePath)], fileName));
    const req = await fetch(`https://minecraft.curseforge.com/api/projects/${projectID}/upload-file`, {
        method:  "POST",
        headers: {
            "X-Api-Token": auth
        },
        body: data
    });
    if (req.status !== 200) {
        throw new Error(`Unexpected ${req.status} ${req.statusText}: "${await req.text()}" (curseforge)`);
    } else {
        return (await req.json() as { id: number; }).id;
    }
}
