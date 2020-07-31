import type { Dirent } from "fs";

import type { RunOptions } from "./types";

import { spawn } from "child_process";
import * as fs from "fs";
import { platform } from "os";
import { join } from "path";

const { opendir, copyFile } = fs.promises;

export const isWin = platform() === "win32";

export async function* walk(dir: string): AsyncIterableIterator<Dirent> {
  for await (const i of await opendir(dir)) {
    const cur = join(dir, i.name);
    yield i;
    if (i.isDirectory()) {
      yield* walk(cur);
    }
  }
}

export function ensure(dir: string): Promise<true> {
  return new Promise((resolve, reject) => {
    fs.exists(dir, (exists) => {
      if (!exists) {
        fs.mkdir(dir, (err) => {
          if (err) {
            reject(err);
          }

          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  });
}

export async function copydir(src: string, dest: string): Promise<void> {
  await ensure(dest);
  const processes = [];
  for await (const i of await opendir(src)) {
    const from = join(src, i.name);
    const target = join(dest, i.name);
    const cp = i.isDirectory() ? copydir : copyFile;
    processes.push(cp(from, target));
  }

  await Promise.all(processes);
}

export function run(opt: RunOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = isWin ? "powershell" : opt.cmd.shift();
    const p = spawn(cmd, opt.cmd, {
      stdio: "inherit",
    });

    p.on("close", () => {
      resolve();
    });
    p.on("error", (err) => {
      reject(err);
    });
  });
}
