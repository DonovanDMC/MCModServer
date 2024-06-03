import { fetch } from "undici";

export default async function discord(webhookURL: string, botToken: string, mcVersion: string, version: string, changelog: string, curseforgeID: number, text?: string) {
    let followup: string | undefined;
    let content = text ?? `New Release For ${mcVersion} (**${version}**)!\n\nChangelog:\n${changelog}\n\nLinks:\n[Github](https://github.com/DonovanDMC/ProjectExpansion/releases/tag/${mcVersion}-${version})\n[CurseForge](https://www.curseforge.com/minecraft/mc-mods/project-expansion/files/${curseforgeID})\n[Modrinth](https://modrinth.com/mod/project-expansion/version/${mcVersion}-${version})`;
    if(content.length > 2000) {
        const parts = content.split("\n");
        content = "";
        for(let i = 0, part = parts[i]; i < parts.length; i++, part = parts[i]) {
            if(content.length + part.length > 2000) {
                followup = parts.slice(i).join("\n");
                break;
            }
            content += part + "\n";
        }
    }
    const req = await fetch(`${webhookURL}?wait=true`, {
        method:  "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            content,
            allowed_mentions: { parse: [] },
            flags:            1 << 2
        })
    });
    if (req.status !== 200) {
        throw new Error(`Unexpected ${req.status} ${req.statusText}: "${await req.text()}" (discord)`);
    }
    const { id, channel_id } = (await req.json() as { channel_id: string; id: string; });
    await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages/${id}/crosspost`, {
        method:  "POST",
        headers: {
            Authorization: `Bot ${botToken}`
        }
    });

    if(followup) await discord(webhookURL, botToken, mcVersion, version, changelog, curseforgeID, followup);
}
