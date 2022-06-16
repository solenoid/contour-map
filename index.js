#!/usr/bin/env node --no-warnings

// libs
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

// local
import { main } from "./src/main.js"
// Needs node@18 for the following assert to be supported
// Still warns on experimental without above --no-warnings
import pkg from "./package.json" assert { type: "json" }

const args = yargs(hideBin(process.argv))
  .option("bbox", {
    alias: "b",
    type: "string",
    // TODO consider dynamic default from min and max in shape geometry
    desc: "Clip to <xmin,ymin,xmax,ymax>",
    // TODO consider pulling coerce out into very testable functions
    coerce: (bbox) => {
      const [x1, y1, x2, y2] = bbox.split(",").map(Number)
      const xmax = Math.max(x1, x2)
      const xmin = Math.min(x1, x2)
      const ymax = Math.max(y1, y2)
      const ymin = Math.min(y1, y2)
      return [xmin, ymin, xmax, ymax]
    },
  })
  .option("shapes", {
    alias: "s",
    type: "array",
    desc: "One or more Staged Products Shape names",
    // TODO consider pulling coerce out into very testable functions
    coerce: (shapes) =>
      shapes
        .map((shape) => shape.split(","))
        .flat() // TODO consider trimming
        .filter(Boolean),
  })
  .option("simplify", {
    type: "string",
    default: "5%",
    desc: "mapshaper simplify",
  })
  .option("grid", {
    alias: "g",
    type: "boolean",
    default: true,
    desc: "Draw major and minor grid lines",
  })
  .option("dots", {
    alias: "d",
    type: "array",
    default: [],
    desc: "Zero or more x,y,x,y pairs",
    // TODO consider pulling coerce out into very testable functions
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
  .demandOption(["bbox"], "Need to have a bounding box")
  .demandOption(["shapes"], "Need at least one shapefile")
  .version()
  .alias("version", "v")
  .help()
  .alias("help", "h")
  .parse()

// console.log(args)

await main({
  bbox: args.bbox,
  dots: args.dots,
  grid: args.grid,
  shapes: args.shapes,
  simplify: args.simplify,
  packageName: pkg.name,
})
