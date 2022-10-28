import { Octokit } from "@octokit/rest";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
export default async function github(githubRepo: string, auth: string, tag: string, branch: string, version: string, gitlog: string, curseforgeID: number, filePath: string, fileName: string) {
    const octo = new Octokit({ auth });
    const [, owner, repo] = /^https?:\/\/github\.com\/(.*)\/(.*)(?:\.git)?$/.exec(githubRepo)!;

    const req = await octo.repos.createRelease({
        owner,
        repo,
        tag_name: tag,
        name:     `[${branch}] ${version}`,
        body:     [

            "**What's Changed**",
            gitlog,
            "",
            "**Other Platforms**",
            `* [CurseForge](https://www.curseforge.com/minecraft/mc-mods/project-expansion/files/${curseforgeID})`,
            `* [Modrinth](https://modrinth.com/mod/project-expansion/version/${tag})`
        ].join("\n"),
        draft:            false,
        target_commitish: branch
    });
    if (req.status !== 201) {
        throw new Error(`Unexpected ${req.status as number} (github): ${JSON.stringify(req.data)}`);
    }
    await writeFile(`${tmpdir()}/${fileName}`, await readFile(filePath));
    await octo.repos.uploadReleaseAsset({
        owner,
        repo,
        release_id: req.data.id,
        name:       fileName,
        data:       await readFile(filePath) as unknown as string // Buffer not being in the types is a known issue
    });
    await unlink(`${tmpdir()}/${fileName}`);
    return req.data.html_url;
}
