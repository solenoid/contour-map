// node
import fs from "node:fs/promises"
import path from "node:path"

// libs
import findCacheDir from "find-cache-dir"

// local
import { mapGen } from "./map-gen.js"
import { shapeFetch } from "./shape-fetch.js"
import { getLogger } from "./utils.js"

export const main = async ({
  bbox,
  shapes,
  packageName,
  simplify,
  grid,
  dots,
  log,
}) => {
  // TODO document these cache and build dirs better
  // TODO consider clean for both cache dir and build dir
  const cacheDir = findCacheDir({ name: packageName })
  const buildDir = path.join(process.cwd(), "build")
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.mkdir(buildDir, { recursive: true })
  const logger = getLogger(log)
  logger(["[dir]", "cache", cacheDir])
  logger(["[dir]", "build", buildDir])
  const shpFiles = await Promise.all(
    shapes.map(async (shape) => await shapeFetch(shape, cacheDir, log))
  )
  await mapGen(shpFiles, buildDir, bbox, simplify, grid, dots, log)
}
