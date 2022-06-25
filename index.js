#!/usr/bin/env node --no-warnings

// node
import fs from "node:fs/promises"
import path from "node:path"

// libs
import findCacheDir from "find-cache-dir"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

// local
import { fetchShape } from "./src/fetch-shape.js"
import { genMap } from "./src/gen-map.js"
import { getLogger } from "./src/utils.js"
// Needs node@18 for the following assert to be supported
// Still warns on experimental without above --no-warnings
import pkg from "./package.json" assert { type: "json" }

const defaultBuildDir = path.join(process.cwd(), "build")
const defaultCacheDir = findCacheDir({ name: pkg.name })

// TODO pull out coerce and concerns around
// different args syntax support; also get
// in good testing for different arg forms.
const keepCoerce = (val) =>
  val
    .map((d) => (typeof d === "string" ? d.split(",").map(Number) : d))
    .flat()
    .filter((d) => Number.isFinite(d))

const args = yargs(hideBin(process.argv))
  // Shapes are required for now, they could be derived from the bbox
  .option("shapes", {
    alias: "s",
    desc: "One or more Staged Products Shape names",
    type: "array",
    coerce: (shapes) =>
      shapes
        .map((shape) => shape.split(","))
        .flat() // TODO consider trimming
        .filter(Boolean),
  })

  // We require a bounding box, it may become the only thing needed if
  // the shapes that it overlaps can be derived instead of also required
  .option("bbox", {
    alias: "b",
    desc: "Clip to <xmin,ymin,xmax,ymax>",
    type: "string",
    coerce: (bbox) => {
      const [x1, y1, x2, y2] = bbox.split(",").map(Number)
      const xmax = Math.max(x1, x2)
      const xmin = Math.min(x1, x2)
      const ymax = Math.max(y1, y2)
      const ymin = Math.min(y1, y2)
      return [xmin, ymin, xmax, ymax]
    },
  })

  // Allow dots at points of interest
  .option("dots", {
    alias: "d",
    desc: "Zero or more x,y,x,y pairs",
    type: "array",
    default: [],
    coerce: (dots) =>
      dots
        .map((dot) => dot.split(","))
        .flat()
        .filter(Boolean)
        // turn into pairs dropping any x missing y at the end
        .map((val, i, list) =>
          i % 2 ? [Number(list[i - 1]), Number(val)] : null
        )
        .filter(Boolean),
  })

  // Show or hide major and minor grid lines
  .option("grid", {
    alias: "g",
    desc: "Draw major and minor grid lines",
    type: "boolean",
    default: true,
  })

  // Simplify out lots of details by default and allow other settings
  .option("simplify", {
    desc: "mapshaper simplify",
    type: "string",
    default: "5%",
  })

  // Keep 10 foot contour lines that are within the bounds
  .option("keep10", {
    type: "array",
    default: [0, 100],
    desc: "10 foot contour bounds",
    coerce: keepCoerce,
  })

  // Keep 20 foot contour lines that are within the bounds
  .option("keep20", {
    type: "array",
    default: [100, 1000],
    desc: "20 foot contour bounds",
    coerce: keepCoerce,
  })

  // Keep 40 foot contour lines that are within the bounds
  .option("keep40", {
    type: "array",
    default: [1000, 21000],
    desc: "40 foot contour bounds",
    coerce: keepCoerce,
  })

  // Simple build directory with default, still need to test well
  .option("build", {
    desc: "dir",
    type: "string",
    default: defaultBuildDir,
  })

  // Allow cache directory overrides with sensible default
  .option("cache", {
    desc: "dir",
    type: "string",
  })
  .default("cache", defaultCacheDir, "see github.com/avajs/find-cache-dir")

  // Simple logging, may consider more complex level setup latter
  .option("log", {
    desc: "Turn logging on or off",
    type: "boolean",
    default: false,
  })

  // Required options
  .demandOption(["shapes"], "Need at least one shapefile")
  .demandOption(["bbox"], "Need to have a bounding box")

  // Standard version args
  .version()
  .alias("version", "v")

  // Standard help args
  .help()
  .alias("help", "h")

  // Parse all the command line args
  .parse()

const logger = getLogger(args.log)
for (const [key, value] of Object.entries(args)) {
  logger(["[a]", key, JSON.stringify(value)])
}
// console.log(args)

// TODO consider clean for both cache dir and build dir
await fs.mkdir(args.build, { recursive: true })
await fs.mkdir(args.cache, { recursive: true })
logger(["[d]", "build", args.build])
logger(["[d]", "cache", args.cache])

const fetchArgKeys = ["cache", "log"]
const fetchArgs = Object.fromEntries(
  Object.entries(args).filter(([key]) => fetchArgKeys.includes(key))
)

// Fetch or use cache and resolve full names for shape files
const shapes = await Promise.all(
  args.shapes.map(async (shape) => await fetchShape({ ...fetchArgs, shape }))
)

const mapArgKeys = [
  "bbox",
  "dots",
  "grid",
  "simplify",
  "keep10",
  "keep20",
  "keep40",
  "build",
  "log",
]
const mapArgs = Object.fromEntries(
  Object.entries(args).filter(([key]) => mapArgKeys.includes(key))
)

await genMap({ ...mapArgs, shapes })
