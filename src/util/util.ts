import type { PathLike } from "node:fs";
import { access } from "node:fs/promises";

export const exists = (input: PathLike) => access(input).then(() => true, () => false);
