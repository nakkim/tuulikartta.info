/*
* Tuulikartta.info wind particle / velocity layer
* Copyright (C) 2017 Ville Oravilkka
*
* Builds the interpolated wind velocity grid from station observations
* and manages the leaflet-velocity animation layer and its toggle control.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  Tuulikartta.isVelocityParameter = function (parameter) {
    return parameter === 'ws_10min' || parameter === 'wg_10min'
  }

  Tuulikartta.bringVelocityLayerToFront = function () {
    if (!saa.Tuulikartta.velocityLayer || !saa.Tuulikartta.map) return
    if (!saa.Tuulikartta.map.hasLayer(saa.Tuulikartta.velocityLayer)) return

    if (typeof saa.Tuulikartta.velocityLayer.bringToFront === 'function') {
      saa.Tuulikartta.velocityLayer.bringToFront()
      return
    }

    // Fallback for layers without bringToFront support.
    saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.velocityLayer)
    saa.Tuulikartta.velocityLayer.addTo(saa.Tuulikartta.map)
  }

  Tuulikartta.updateVelocityControlState = function (parameter) {
    var isVelocityParameter = Tuulikartta.isVelocityParameter(parameter)
    var controlElement = saa.Tuulikartta.windParticlesControlElement

    if (controlElement) {
      $(controlElement).toggleClass('disabled', !isVelocityParameter)
    }

    if (!isVelocityParameter) {
      saa.Tuulikartta.showWindParticles = false
      if (controlElement) {
        $(controlElement).removeClass('active')
      }
      if (saa.Tuulikartta.velocityLayer && saa.Tuulikartta.map && saa.Tuulikartta.map.hasLayer(saa.Tuulikartta.velocityLayer)) {
        saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.velocityLayer)
      }
      return
    }

    if (saa.Tuulikartta.showWindParticles) {
      Tuulikartta.updateVelocityLayer(parameter)
    }
  }

  // ---------------------------------------------------------
  // Build wind velocity grid from station observations using
  // inverse distance weighting (IDW) interpolation
  // ---------------------------------------------------------

  Tuulikartta.resolveParticleWindSpeed = function (windspeed) {
    var speed = parseFloat(windspeed)
    return speed

    // if (isNaN(speed) || speed <= 0) return 0
    // if (speed >= 32) return 32

    // var bands = [
    //   { min: 0, max: 1 },
    //   { min: 1, max: 2 },
    //   { min: 2, max: 7 },
    //   { min: 7, max: 14 },
    //   { min: 14, max: 21 },
    //   { min: 21, max: 25 },
    //   { min: 25, max: 28 },
    //   { min: 28, max: 32 }
    // ]
    // var visualBandSize = 32 / bands.length

    // for (var i = 0; i < bands.length; i++) {
    //   var band = bands[i]
    //   if (speed < band.max) {
    //     var bandProgress = (speed - band.min) / (band.max - band.min)
    //     return (i * visualBandSize) + (bandProgress * visualBandSize)
    //   }
    // }

    // return 32
  }

  Tuulikartta.buildWindVelocityData = function (parameter) {
    var data = saa.Tuulikartta.data
    var speedParameter = parameter === 'wg_10min' ? 'wg_10min' : 'ws_10min'
    var directionParameter = 'wd_10min'

    if (!Tuulikartta.isVelocityParameter(parameter)) return null
    if (!data || data.length === 0) return null

    // Collect stations with valid wind speed and direction
    var stations = []
    for (var i = 0; i < data.length; i++) {
      var s = data[i]
      if (s[speedParameter] !== null && s[directionParameter] !== null &&
        !isNaN(parseFloat(s[speedParameter])) && !isNaN(parseFloat(s[directionParameter]))) {
        var ws = Tuulikartta.resolveParticleWindSpeed(s[speedParameter])
        var wdRad = parseFloat(s[directionParameter]) * Math.PI / 180
        stations.push({
          lat: parseFloat(s.lat),
          lon: parseFloat(s.lon),
          // meteorological convention: direction wind comes FROM → negate for velocity vector
          u: -ws * Math.sin(wdRad),
          v: -ws * Math.cos(wdRad)
        })
      }
    }

    if (stations.length < 3) return null

    // Output grid covering Finland and surroundings
    var lo1 = 18.0, lo2 = 32.0
    var la1 = 70.5, la2 = 59.5
    var dx = 0.5, dy = 0.5
    var nx = Math.round((lo2 - lo1) / dx) + 1  // 33
    var ny = Math.round((la1 - la2) / dy) + 1  // 25

    var uData = new Array(nx * ny)
    var vData = new Array(nx * ny)

    for (var row = 0; row < ny; row++) {
      var lat = la1 - row * dy
      var cosLat = Math.cos(lat * Math.PI / 180)
      for (var col = 0; col < nx; col++) {
        var lon = lo1 + col * dx
        var uSum = 0, vSum = 0, wSum = 0

        for (var k = 0; k < stations.length; k++) {
          var dlat = lat - stations[k].lat
          var dlon = (lon - stations[k].lon) * cosLat
          var dist2 = dlat * dlat + dlon * dlon
          // snap to station value when very close, otherwise inverse distance squared
          var w = dist2 < 1e-6 ? 1e12 : 1 / dist2
          uSum += w * stations[k].u
          vSum += w * stations[k].v
          wSum += w
        }

        var idx = row * nx + col
        uData[idx] = uSum / wSum
        vData[idx] = vSum / wSum
      }
    }

    var header = {
      parameterUnit: 'ms-1',
      parameterCategory: 2,
      nx: nx, ny: ny,
      lo1: lo1, la1: la1,
      lo2: lo2, la2: la2,
      dx: dx, dy: dy,
      refTime: new Date().toISOString()
    }

    return [
      { header: Object.assign({}, header, { parameterNumber: 2, parameterNumberName: 'eastward_wind' }), data: uData },
      { header: Object.assign({}, header, { parameterNumber: 3, parameterNumberName: 'northward_wind' }), data: vData }
    ]
  }

  // ---------------------------------------------------------
  // Create or update the leaflet-velocity wind animation layer
  // ---------------------------------------------------------

  Tuulikartta.updateVelocityLayer = function (parameter) {
    if (!saa.Tuulikartta.showWindParticles) return

    var windData = Tuulikartta.buildWindVelocityData(parameter)
    if (!windData) return

    if (saa.Tuulikartta.velocityLayer) {
      saa.Tuulikartta.velocityLayer.setData(windData)
      if (!saa.Tuulikartta.map.hasLayer(saa.Tuulikartta.velocityLayer)) {
        saa.Tuulikartta.velocityLayer.addTo(saa.Tuulikartta.map)
      }
    } else {
      saa.Tuulikartta.velocityLayer = L.velocityLayer({
        displayValues: true,
        displayOptions: {
          velocityType: selectedLanguage === 'fi' ? 'Tuulen' : 'Wind',
          position: 'bottomright',
          emptyString: selectedLanguage === 'fi' ? 'Ei tuulitietoa' : 'No wind data',
          angleConvention: 'meteo',
          speedUnit: "ms",
          directionString: translations[selectedLanguage]['windDirectionLabel'],
          speedString: translations[selectedLanguage]['windSpeedLabel'],
          displayEmptyString: selectedLanguage === 'fi' ? 'Ei tietoa' : 'No data'
        },
        data: windData,
        minVelocity: 0,
        maxVelocity: 32,
        velocityScale: 0.005,
        opacity: 0,
        colorScale: Tuulikartta.buildVelocityColorScale()
      })
      saa.Tuulikartta.velocityLayer.addTo(saa.Tuulikartta.map)
    }
    Tuulikartta.bringVelocityLayerToFront()
    saa.Tuulikartta.namelayer.bringToFront()
  }

}(saa.Tuulikartta = saa.Tuulikartta || {}))
