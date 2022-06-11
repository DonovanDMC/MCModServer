import type { PathLike } from "fs";
import { access } from "fs/promises";

export const exists = (input: PathLike) => access(input).then(() => true, () => false);
