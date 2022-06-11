import ProjectExpansion from "./routes/projectexpansion";
import type { GlobalSecrets } from "./util/types";
import express from "express";
import morgan from "morgan";
import { jsonc as JSONC } from "jsonc";
import { readFile } from "fs/promises";

const configDir = new URL("../config/", import.meta.url);
const secrets = JSONC.parse((await readFile(new URL("secrets.jsonc", configDir))).toString()) as GlobalSecrets;

const app = express();
app.use(morgan("dev"))
	.use(async(req, res, next) => {
		if (!req.headers.authorization || req.headers.authorization !== secrets.auth) return res.status(401).json({
			success: false,
			error:   "Invalid Auth."
		});
		return next();
	})
	.use("/projectexpansion", ProjectExpansion)
	.use(async(req, res) => res.status(404).end())
	.listen(3621, "0.0.0.0", () => console.log("Listening On http://0.0.0.0:3621"));
