export const dotsFeatureCollection = (dots) => ({
  type: "FeatureCollection",
  features: dots.map((dot) => ({
    type: "Feature",
    properties: {
      ContourEle: -10, // magic number still need to document
    },
    geometry: {
      type: "Point",
      coordinates: dot,
    },
  })),
})

const lineString = (x1, y1, x2, y2, grid = "major") => ({
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [x1, y1],
      [x2, y2],
    ],
  },
  properties: {
    grid,
    ContourEle: grid === "major" ? -20 : -10, // magic number still need to document
  },
})

export const gridLinesFeatureCollection = (xmin, ymin, xmax, ymax) => {
  const majorXFloor = Math.floor(xmin)
  const majorXCeiling = Math.ceil(xmax)
  const majorYFloor = Math.floor(ymin)
  const majorYCeiling = Math.ceil(ymax)
  let features = []
  for (let x = majorXFloor; x <= majorXCeiling; x++) {
    features.push(lineString(x, majorYFloor, x, majorYCeiling, "major"))
    if (x !== majorXCeiling) {
      for (let minor = 0.125; minor < 1; minor += 0.125) {
        features.push(
          lineString(x + minor, majorYFloor, x + minor, majorYCeiling, "minor")
        )
      }
    }
  }
  for (let y = majorYFloor; y <= majorYCeiling; y++) {
    features.push(lineString(majorXFloor, y, majorXCeiling, y, "major"))
    if (y !== majorYCeiling) {
      for (let minor = 0.125; minor < 1; minor += 0.125) {
        features.push(
          lineString(majorXFloor, y + minor, majorXCeiling, y + minor, "minor")
        )
      }
    }
  }
  return {
    type: "FeatureCollection",
    features,
  }
}

const logger = (args) => {
  console.log(args.join(" "))
}
// Consider supporting levels instead of boolean when getting the logger
export const getLogger = (logging) => (logging ? logger : () => {})
