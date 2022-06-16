// node
import fs from "node:fs/promises"
import path from "node:path"
import stream from "node:stream/promises"
// libs
import Zip from "adm-zip"
import fetch from "node-fetch"

const FROM_WHERE =
  "Use a Key from https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Contours/Shape/"

const SHAPE_URL =
  "https://prd-tnm.s3.amazonaws.com/StagedProducts/Contours/Shape"

export const shapeFetch = async (shapeRaw, cacheDir) => {
  // Allow Key with or without extension and as a full URL or just the Key
  const urlParts = shapeRaw.split("/")
  const shape = urlParts[urlParts.length - 1].split(".")[0]

  const shpFile = path.join(cacheDir, `${shape}.shp`)
  try {
    await fs.open(shpFile)
    return shpFile
  } catch (err) {
    if (err.code !== "ENOENT") throw err
  }

  const zipName = `${shape}.zip`
  const zipURL = `${SHAPE_URL}/${zipName}`
  let res = await fetch(zipURL)
  if (!res.ok) throw new Error(`Problem fetching ${zipURL} \n${FROM_WHERE}`)

  const zipFile = path.join(cacheDir, zipName)
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
        entry.name === `${shape}.xml` ||
        entry.name === `${shape}.jpg`
    )
    .map((entry) => [
      path.join(cacheDir, `${shape}.${entry.name.split(".")[1]}`),
      zip.readFile(entry),
    ])

  for await (const [fileName, buffer] of filesToWrite) {
    await fs.writeFile(fileName, buffer)
  }

  return shpFile
}
