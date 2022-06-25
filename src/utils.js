// NOTE the name "ContourEle" is likely due to shape file name truncation
//      it likely stands for ContourElevation if it was a full name.
export const CONTOUR_ELEVATION = "ContourEle"

export const dotsFeatureCollection = (dotElevation, dots) => ({
  type: "FeatureCollection",
  features: dots.map((dot) => ({
    type: "Feature",
    properties: {
      [CONTOUR_ELEVATION]: dotElevation,
    },
    geometry: {
      type: "Point",
      coordinates: dot,
    },
  })),
})

const lineString = (x1, y1, x2, y2, elevation) => ({
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [x1, y1],
      [x2, y2],
    ],
  },
  properties: {
    [CONTOUR_ELEVATION]: elevation,
  },
})

export const gridLinesFeatureCollection = (
  major,
  minor,
  xmin,
  ymin,
  xmax,
  ymax
) => {
  const majorXFloor = Math.floor(xmin)
  const majorXCeiling = Math.ceil(xmax)
  const majorYFloor = Math.floor(ymin)
  const majorYCeiling = Math.ceil(ymax)
  let features = []
  for (let x = majorXFloor; x <= majorXCeiling; x++) {
    features.push(lineString(x, majorYFloor, x, majorYCeiling, major))
    if (x !== majorXCeiling) {
      for (let m = 0.125; m < 1; m += 0.125) {
        features.push(
          lineString(x + m, majorYFloor, x + m, majorYCeiling, minor)
        )
      }
    }
  }
  for (let y = majorYFloor; y <= majorYCeiling; y++) {
    features.push(lineString(majorXFloor, y, majorXCeiling, y, major))
    if (y !== majorYCeiling) {
      for (let m = 0.125; m < 1; m += 0.125) {
        features.push(
          lineString(majorXFloor, y + m, majorXCeiling, y + m, minor)
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
