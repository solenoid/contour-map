// node
import fs from "node:fs/promises"

// libs
import mapshaper from "mapshaper"

// local
import {
  dotsFeatureCollection,
  getLogger,
  gridLinesFeatureCollection,
} from "./utils.js"

export const mapGen = async (
  shapes,
  build,
  bbox,
  simplify,
  grid,
  dots,
  log
) => {
  const logger = getLogger(log)
  if (log) mapshaper.enableLogging()

  // TODO consider intermediary file strategy
  const contourLinesFile = `${build}/contour-lines.json`
  const gridLinesFile = `${build}/grid-lines.json`
  const dotsFile = `${build}/dots.json`

  const HAS_GRID_LINES = grid
  if (HAS_GRID_LINES) {
    const geoGridLines = gridLinesFeatureCollection(...bbox)
    await fs.writeFile(gridLinesFile, JSON.stringify(geoGridLines, null, 2))
    logger(["[o]", "Wrote", gridLinesFile])
  }

  const HAS_DOTS = dots.length > 0
  if (HAS_DOTS) {
    const geoDots = dotsFeatureCollection(dots)
    await fs.writeFile(dotsFile, JSON.stringify(geoDots, null, 2))
    logger(["[o]", "Wrote", dotsFile])
  }

  const CUT_1_UNDER = -10
  const CUT_0 = 0
  const CUT_1 = 100
  const CUT_2 = 1000
  const CUT_3 = 21000
  const EL = "ContourEle"

  const filter = `
${EL} >= ${CUT_0} && (
 (${EL} < ${CUT_1} && ${EL} % 10 == 0) ||
 (${EL} < ${CUT_2} && ${EL} % 20 == 0) ||
 (${EL} < ${CUT_3} && ${EL} % 40 == 0) )`.replaceAll("\n", "")

  const clip = ["-clip", `bbox2=${bbox.join(",")}`]

  const firstArgs = [
    "-i",
    "combine-files",
    ...shapes,
    ...clip,
    "-merge-layers",
    "force",
    "-filter",
    filter,
    "remove-empty",
    "-dissolve",
    `fields=${EL}`,
    `copy-fields=${EL}`,
    "planar",
    "-simplify",
    simplify,
    "no-repair",
    "planar",
    "-explode",
    "-clean",
    "-o",
    contourLinesFile,
  ]
  logger(["[mapshaper]", ...firstArgs])
  await mapshaper.runCommands(firstArgs)

  // [major, minor, < 100, < 1000, < 21000, everything else]
  const referenceStrokeWidths = [20, 4, 1.5, 2, 3, 4]
  const latWidth = bbox[2] - bbox[0]
  const divisor = 6 * (latWidth + 0.25)
  // TODO consider dropping trailing and leading zeros
  const normalizeStrokeWidth = (width) => (width / divisor).toFixed(3)
  const strokeWidths = referenceStrokeWidths.map(normalizeStrokeWidth)

  const strokeWidth = `
(${EL} < ${CUT_1_UNDER})
 ? ${strokeWidths[0]} : (${EL} < ${CUT_0})
 ? ${strokeWidths[1]} : (${EL} < ${CUT_1})
 ? ${strokeWidths[2]} : (${EL} < ${CUT_2})
 ? ${strokeWidths[3]} : (${EL} < ${CUT_3})
 ? ${strokeWidths[4]} : ${strokeWidths[5]}`.replaceAll("\n", "")

  const stroke = `
${EL} < 0
 ? "rgba(200,150,100,0.75)" : (${EL} < 100)
 ? "rgba(100,150,200,1)" : (${EL} < 200)
 ? "rgba(100,150,50,1)" : "rgba(20,50,0,1)"`.replaceAll("\n", "")

  const secondArgs = [
    "-i",
    "combine-files",
    contourLinesFile,
    HAS_GRID_LINES ? gridLinesFile : null,
    HAS_DOTS ? dotsFile : null,
    "-style",
    `stroke-width='${strokeWidth}'`,
    "-style",
    `stroke='${stroke}'`,
    "-style",
    "fill=rgba(250,150,0,0.2)",
    "-style",
    "r=10",
    ...clip,
    "-o",
    "width=1440",
    `${build}/out.svg`,
  ].filter(Boolean)
  logger(["[mapshaper]", ...secondArgs])
  await mapshaper.runCommands(secondArgs)
  // TODO consider getting rid of lines that are only <g/> with nothing else
}
