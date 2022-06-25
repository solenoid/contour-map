// node
import fs from "node:fs/promises"

// libs
import mapshaper from "mapshaper"

// local
import {
  CONTOUR_ELEVATION,
  dotsFeatureCollection,
  getLogger,
  gridLinesFeatureCollection,
} from "./utils.js"

export const genMap = async (options) => {
  // console.log(options)
  const {
    shapes,
    bbox,
    dots,
    grid,
    keep10,
    keep20,
    keep40,
    simplify,
    build,
    log,
  } = options
  const logger = getLogger(log)
  if (log) mapshaper.enableLogging()

  // TODO consider intermediary file strategy
  const contourLinesFile = `${build}/contour-lines.json`
  const gridLinesFile = `${build}/grid-lines.json`
  const dotsFile = `${build}/dots.json`
  const svgFile = `${build}/out.svg`

  const overallMin = Math.min(keep10[0], keep20[0], keep40[0])
  const majorElevation = overallMin - 20
  const minorElevation = overallMin - 10
  const keep10Min = keep10[0]
  const keep20Min = keep20[0]
  const keep40Min = keep40[0]
  const keep10Max = keep10[1]
  const keep20Max = keep20[1]
  const keep40Max = keep40[1]

  const HAS_GRID_LINES = grid
  if (HAS_GRID_LINES) {
    const geoGridLines = gridLinesFeatureCollection(
      majorElevation,
      minorElevation,
      ...bbox
    )
    await fs.writeFile(gridLinesFile, JSON.stringify(geoGridLines, null, 2))
    logger(["[o]", "Wrote", gridLinesFile])
  }

  const HAS_DOTS = dots.length > 0
  if (HAS_DOTS) {
    const geoDots = dotsFeatureCollection(minorElevation, dots)
    await fs.writeFile(dotsFile, JSON.stringify(geoDots, null, 2))
    logger(["[o]", "Wrote", dotsFile])
  }

  const filter = `
(${CONTOUR_ELEVATION} >= ${overallMin}) &&
 ((${CONTOUR_ELEVATION} >= ${keep10Min} &&
   ${CONTOUR_ELEVATION} <  ${keep10Max} && ${CONTOUR_ELEVATION} % 10 == 0) ||
  (${CONTOUR_ELEVATION} >= ${keep20Min} &&
   ${CONTOUR_ELEVATION} <  ${keep20Max} && ${CONTOUR_ELEVATION} % 20 == 0) ||
  (${CONTOUR_ELEVATION} >= ${keep40Min} &&
   ${CONTOUR_ELEVATION} <  ${keep40Max} && ${CONTOUR_ELEVATION} % 40 == 0))`
    .replaceAll("\n", "")
    .replaceAll(/\s+/g, " ")

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
    `fields=${CONTOUR_ELEVATION}`,
    `copy-fields=${CONTOUR_ELEVATION}`,
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

  // Line Widths
  // [major, minor, < keep10, < keep20, < keep40, everything else]
  const referenceStrokeWidths = [20, 4, 1.5, 2, 3, 4]
  const latWidth = bbox[2] - bbox[0]
  const divisor = 6 * (latWidth + 0.25)
  // TODO consider dropping trailing and leading zeros
  const normalizeStrokeWidth = (width) => (width / divisor).toFixed(3)
  const strokeWidths = referenceStrokeWidths.map(normalizeStrokeWidth)

  // TODO consider if keep 10, 20, 40 are always increasing
  const strokeWidth = `
(${CONTOUR_ELEVATION} < ${minorElevation})
 ? ${strokeWidths[0]} : (${CONTOUR_ELEVATION} < ${overallMin})
 ? ${strokeWidths[1]} : (${CONTOUR_ELEVATION} < ${keep10Max})
 ? ${strokeWidths[2]} : (${CONTOUR_ELEVATION} < ${keep20Max})
 ? ${strokeWidths[3]} : (${CONTOUR_ELEVATION} < ${keep40Max})
 ? ${strokeWidths[4]} : ${strokeWidths[5]}`.replaceAll("\n", "")

  // TODO consider making available as args
  // Line Colors
  const CUT_COLOR_0 = 0
  const CUT_COLOR_1 = 100
  const CUT_COLOR_2 = 200
  const strokeColors = [
    "rgba(200,150,100,0.75)",
    "rgba(100,150,200,1)",
    "rgba(100,150,50,1)",
    "rgba(20,50,0,1)",
  ].map((color) => `"${color}"`)
  const stroke = `
(${CONTOUR_ELEVATION} < ${CUT_COLOR_0})
 ? ${strokeColors[0]} : (${CONTOUR_ELEVATION} < ${CUT_COLOR_1})
 ? ${strokeColors[1]} : (${CONTOUR_ELEVATION} < ${CUT_COLOR_2})
 ? ${strokeColors[2]} : ${strokeColors[3]}`.replaceAll("\n", "")

  // Dots
  // TODO consider making available as args
  const fill = "rgba(250,150,0,0.2)"
  const radius = 10

  // Dimensions
  // TODO consider making available as args
  const width = 1440
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
    `fill='${fill}'`,
    "-style",
    `r=${radius}`,
    ...clip,
    "-o",
    `width=${width}`,
    svgFile,
  ].filter(Boolean)
  logger(["[mapshaper]", ...secondArgs])
  await mapshaper.runCommands(secondArgs)
  // TODO consider getting rid of lines that are only <g/> with nothing else
}
