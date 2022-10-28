import type { MRDependency } from "./types";
import { fetch, FormData, File  } from "undici";
import { readFile } from "node:fs/promises";

export default async function modrinth(project_id: string, gitAuth: string, version_title: string, version_number: string, changelog: string, game_versions: Array<string>, release_channel: string, loaders: Array<string>, dependencies: Array<MRDependency>, filePath: string, fileName: string) {
    const data = new FormData();
    data.append("data", JSON.stringify({
        project_id,
        version_title,
        version_number,
        changelog,
        game_versions,
        release_channel,
        loaders,
        featured:   true,
        file_parts: [fileName],
        dependencies
    }));
    data.append(fileName, new File([await readFile(filePath)], fileName));
    const req = await fetch("https://api.modrinth.com/v2/version", {
        method:  "POST",
        headers: {
            Authorization: gitAuth
        },
        body: data
    });
    if (req.status !== 200) {
        throw new Error(`Unexpected ${req.status} ${req.statusText}: "${await req.text()}" (modrinth)`);
    } else {
        return (await req.json() as { id: string; }).id;
    }
}
