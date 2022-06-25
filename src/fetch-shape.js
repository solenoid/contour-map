// node
import fs from "node:fs/promises"
import path from "node:path"
import stream from "node:stream/promises"

// libs
import Zip from "adm-zip"

// local
import { getLogger } from "./utils.js"

const FROM_WHERE =
  "Use a Key from https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Contours/Shape/"

const SHAPE_URL =
  "https://prd-tnm.s3.amazonaws.com/StagedProducts/Contours/Shape"

export const fetchShape = async (options) => {
  // console.log(options)
  const { shape, cache, log } = options
  const logger = getLogger(log)
  // Allow Key with or without extension and as a full URL or just the Key
  const urlParts = shape.split("/")
  const shapeName = urlParts[urlParts.length - 1].split(".")[0]

  const shpFile = path.join(cache, `${shapeName}.shp`)
  try {
    await fs.open(shpFile)
    logger(["[cached]", shpFile])
    // logger here most likely
    return shpFile
  } catch (err) {
    if (err.code !== "ENOENT") throw err
  }

  logger(["[fetch]", shpFile])
  const zipName = `${shapeName}.zip`
  const zipURL = `${SHAPE_URL}/${zipName}`
  let res = await fetch(zipURL)
  if (!res.ok) throw new Error(`Problem fetching ${zipURL} \n${FROM_WHERE}`)

  const zipFile = path.join(cache, zipName)
  const out = await fs.open(zipFile, "wx")
  await stream.pipeline(res.body, out.createWriteStream())

  const zip = new Zip(zipFile)
  const filesToWrite = zip
    .getEntries()
    .filter(
      (entry) =>
        // TODO see if these are all the "expected same name with .shp files"
        entry.name === "Elev_Contour.dbf" ||
        entry.name === "Elev_Contour.cpg" ||
        entry.name === "Elev_Contour.prj" ||
        entry.name === "Elev_Contour.shp" ||
        entry.name === "Elev_Contour.shx" ||
        entry.name === `${shapeName}.xml` ||
        entry.name === `${shapeName}.jpg`
    )
    .map((entry) => [
      path.join(cache, `${shapeName}.${entry.name.split(".")[1]}`),
      zip.readFile(entry),
    ])

  for await (const [fileName, buffer] of filesToWrite) {
    await fs.writeFile(fileName, buffer)
  }
  logger(["[o]", shpFile])
  return shpFile
}
