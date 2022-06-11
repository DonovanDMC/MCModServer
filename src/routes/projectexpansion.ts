import type { BaseInfo, BaseSecrets, MCVersion } from "../util/types";
import { exists } from "../util/util";
import curseforge from "../util/curseforge";
import modrinth from "../util/modrinth";
import github from "../util/github";
import discord from "../util/discord";
import { jsonc as JSONC } from "jsonc";
import type { Request } from "express";
import { Router } from "express";
import multer from "multer";
import Joi from "joi";
import git from "simple-git";
import { v5 as uuid, validate } from "uuid";
import { assert } from "tsafe";
import {
	mkdir,
	readdir,
	readFile,
	unlink,
	writeFile
} from "fs/promises";
import { tmpdir } from "os";

const namespaceGitlog = "631a7609-3793-454d-b601-8f2a0e8b98ba";
const namespaceChangelog = "0d56e322-ca06-4bb6-b0e6-e1aefaf29811";

if (!await exists(`${tmpdir()}/upload/projectexpansion`)) await mkdir(`${tmpdir()}/upload/projectexpansion`, { recursive: true });
const configDir = new URL("../../config/projectexpansion/", import.meta.url);
const dataDir = new URL("../../data/", import.meta.url);
const versionsDir = new URL("versions/", configDir);
const fileHandler = multer({
	dest: `${tmpdir()}/upload/projectexpansion`
});

interface Secrets extends BaseSecrets {
	discordToken: string;
	webhook: string;
}
type Info = BaseInfo;
const secrets = JSONC.parse((await readFile(new URL("secrets.jsonc", configDir))).toString()) as Secrets;
const info = JSONC.parse((await readFile(new URL("info.jsonc", configDir))).toString()) as Info;
const enabledVersions: Record<string, MCVersion> = {};
const disabledVersions: Record<string, MCVersion> = {};
const vDir = await readdir(versionsDir, { withFileTypes: true });
for (const file of vDir) {
	if (!file.isFile() || !file.name.match(/\.jsonc?$/)) continue;
	const content = JSONC.parse((await readFile(new URL(file.name, versionsDir))).toString()) as MCVersion;
	(content.enabled ? enabledVersions : disabledVersions)[content.gitName] = content;
}

const publishSchema = Joi.object({
	gitlog:               Joi.string().required(),
	changelog:            Joi.string().required(),
	expectedLatestCommit: Joi.string().required().regex(/^[0-9a-f]{40}$/),
	version:              Joi.string().regex(/^\d+\.\d+\.\d+$/).required()
});

const app = Router()
	.post("/publish/:id", fileHandler.single("file"), async(req: Request<{ id: string; }, unknown, {
		gitlog: string;
		changelog: string;
		expectedLatestCommit: string;
		version: string;
	}>, res) => {
		if (disabledVersions[req.params.id]) return res.status(403).json({
			success: false,
			error:   "Version Disabled"
		});
		const ver = enabledVersions[req.params.id];
		if (!ver) return res.status(404).json({
			success: false,
			error:   "Invalid Version"
		});

		if (!req.body) return res.status(400).json({
			success: false,
			error:   "A request body is required."
		});
		let gitlog = req.body.gitlog,
			gitlogID: string | null = uuid(gitlog, namespaceGitlog),
			changelog = req.body.changelog,
			changelogID: string | null = uuid(changelog, namespaceChangelog);
		const nfErrors: Array<string> = [];
		const expectedLatestCommit = req.body.expectedLatestCommit;
		if (gitlog) {
			if (validate(gitlog)) {
				gitlogID = gitlog;
				if (!await exists(new URL(gitlogID, dataDir))) {
					nfErrors.push(`Cannot find gitlog with id "${gitlogID}".`);
					gitlogID = null;
				} else gitlog = (await readFile(new URL(gitlogID, dataDir))).toString();
			} else await writeFile(new URL(gitlogID, dataDir), gitlog);
		}
		if (changelog) {
			if (validate(changelog)) {
				changelogID = changelog;
				if (!await exists(new URL(changelogID, dataDir))) {
					nfErrors.push(`Cannot find changelog with id "${changelogID}".`);
					changelogID = null;
				} else changelog = (await readFile(new URL(changelogID, dataDir))).toString();
			} else await writeFile(new URL(changelogID, dataDir), changelog);
		}
		const { error } = publishSchema.validate(req.body, { abortEarly: false });
		let errors: Array<string> | string = [];
		if (error) errors.push(...error.details.map(d => d.message));
		if (!req.file) errors.push("A file is required.");
		if (nfErrors.length) errors.push(...nfErrors);
		if (errors.length === 1) errors = errors[0];
		if (errors.length) return res.status(400).json({
			success: false,
			error:   errors,
			data:    {
				gitlogID:    !gitlog ? null : gitlogID,
				changelogID: !changelog ? null : changelogID
			}
		});
		const version = req.body.version;
		const tag = `${ver.name}-${version}`;
		const refs = (await git().listRemote([info.gitRepo])).split("\n");
		// const currentVersions = refs.filter(ref => ref.match(new RegExp(`refs/tags/${ver.name}-\\d+.\\d+.\\d+`))).map(ref => ref.split("refs/tags")[1].split("-")[1]);
		const latestCommit = refs.find(ref => ref.includes(`refs/heads/${ver.gitName}`))?.slice(0, 40);
		if (!latestCommit) return res.status(500).json({
			success: false,
			error:   "Failed to determine latest commit hash.",
			data:    {
				gitlogID,
				changelogID
			}
		});
		if (expectedLatestCommit !== latestCommit) return res.status(400).json({
			success: false,
			error:   `Expected commit hash "${expectedLatestCommit}" did not match latest commit hash "${latestCommit}".`,
			data:    {
				gitlogID,
				changelogID
			}
		});
		/* if (currentVersions.includes(version)) return res.status(400).json({
			success: false,
			error:   `Version "${version}" already exists at source. (${info.gitRepo}/releases/tag/${ver.name}-${version})`,
			data:    {
				gitlogID,
				changelogID
			}
		});*/
		if (!refs.find(ref => ref.includes(tag))) return res.status(400).json({
			success: false,
			error:   `Expected tag "${tag}" to exist at remote "${info.gitRepo}", but it does not.`,
			data:    {
				gitlogID,
				changelogID
			}
		});

		assert(req.file);
		let curseforgeID: number, modrinthID: string, gitURL: string;
		try {
			curseforgeID = await curseforge(info.curseforgeID, secrets.cfAuth, `[${ver.gitName}] ${version}`, ver.releaseType, changelog, info.changeLogType, ver.mcVersions.curseforge, ver.dependencies.curseforge, req.file.path, req.file.originalname);
			console.log("CurseForge Uploaded: https://www.curseforge.com/minecraft/mc-mods/project-expansion/files/%d", curseforgeID);
			modrinthID = await modrinth(info.modrinthID, secrets.gitAuth, `[${ver.gitName}] ${version}`, tag, changelog, ver.mcVersions.modrinth, ver.releaseType, ver.modrinthLoaders, ver.dependencies.modrinth, req.file.path, req.file.originalname);
			console.log("Modrinth Uploaded: https://modrinth.com/mod/project-expansion/version/%s", modrinthID);
			gitURL = await github(info.gitRepo, secrets.gitAuth, tag, ver.gitName, version, gitlog, curseforgeID, req.file.path, req.file.originalname);
			console.log("Github Release: %s", gitURL);
			await discord(secrets.webhook, secrets.discordToken, ver.name, version, changelog, curseforgeID);
		} catch (err) {
			return res.status(500).json({
				success: false,
				error:   (err as Error).stack
			});
		}

		if (gitlogID) await unlink(new URL(gitlogID, dataDir));
		if (changelogID) await unlink(new URL(changelogID, dataDir));

		return res.status(201).json({
			success: true,
			data:    {
				curseforgeID,
				curseforgeURL: `https://www.curseforge.com/minecraft/mc-mods/project-expansion/files/${curseforgeID}`,
				modrinthID,
				modrinthURL:   `https://modrinth.com/mod/project-expansion/version/${modrinthID}`,
				gitURL
			}
		});
	});

export default app;
