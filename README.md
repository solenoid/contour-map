# Contour Map

Create SVG files for contour maps from USGS shapefile data.

The somewhat standard `node_modules/.cache` directory is where fetched shapefiles are stored. Note first time a shapefile is downloaded it is much slower than when cached there after.

```
npm exec -- @solenoid/contour-map -v
```

For local development you can use `node` or call `index.js` directly.

```
node --no-warnings index.js -v
./index.js -v
```

## First Maps

If you wanted a contour map of Wachusett Mountain (skiing) and Crow Hill (climbing) areas try the following.

- [Mount Wachusett Summit at -71.7875,42.688889](https://en.wikipedia.org/wiki/Mount_Wachusett)
- [Crow Hill Rock Climbing at -71.858,42.515](https://www.mountainproject.com/area/105905492/crow-hill)

```
# general usage
npm exec -- @solenoid/contour-map \
--shapes=ELEV_Boston_W_MA_1X1_Shape \
--bbox=-72,42.44,-71.75,42.56 \
--dots=-71.8875,42.488889,-71.858,42.515 \
--simplify=50%

# local development
./index.js \
--shapes=ELEV_Boston_W_MA_1X1_Shape \
--bbox=-72,42.44,-71.75,42.56 \
--dots=-71.8875,42.488889,-71.858,42.515 \
--simplify=50%

## Other starting maps

# 1 degree of latitude and longitude
./index.js \
--shapes=ELEV_Boston_W_MA_1X1_Shape \
--bbox=-72,42,-71,43 \
--dots=-71.8875,42.488889,-71.858,42.515 \
--simplify=10%

# Meriam's Corner and Minute Man Visitor Center.
./index.js \
--shapes=ELEV_Boston_W_MA_1X1_Shape \
--bbox=-71.351,42.43,-71.251,42.48 \
--dots=-71.324424,42.459437,-71.269489,42.448579 \
--simplify=75%

# All of Massachusetts and States South with a dot on UMASS Amherst.
./index.js \
--shapes=ELEV_Boston_W_MA_1X1_Shape \
--shapes=ELEV_Albany_E_MA_1X1_Shape \
--shapes=ELEV_Boston_E_MA_1X1_Shape \
--shapes=ELEV_Providence_C_MA_1X1_Shape \
--shapes=ELEV_Providence_E_MA_1X1_Shape \
--shapes=ELEV_Providence_W_RI_1X1_Shape \
--shapes=ELEV_Hartford_E_CT_1X1_Shape \
--shapes=ELEV_Hartford_W_CT_1X1_Shape \
--shapes=ELEV_Albany_W_NY_1X1_Shape \
--bbox=-73.51,41.035,-69.92,42.89 \
--simplify=2% \
--dots=-72.526390,42.391501
```
