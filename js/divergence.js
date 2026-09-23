/*
* Tuulikartta.info wind divergence / convergence overlay
* Copyright (C) 2017 Ville Oravilkka
*
* Derives a horizontal wind divergence field from the same interpolated
* u/v grid used by the velocity (wind particle) layer, and renders it as
* a semi-transparent colored image overlay (blue = convergence,
* red = divergence).
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  var METERS_PER_DEGREE_LAT = 111320

  // ---------------------------------------------------------
  // Compute divergence (du/dx + dv/dy) on the regular u/v grid
  // ---------------------------------------------------------

  Tuulikartta.computeDivergenceGrid = function (windData) {
    if (!windData) return null

    var header = windData[0].header
    var uData = windData[0].data
    var vData = windData[1].data
    var nx = header.nx, ny = header.ny
    var dx = header.dx, dy = header.dy
    var la1 = header.la1

    var divergence = new Array(nx * ny)
    var maxAbs = 0

    for (var row = 0; row < ny; row++) {
      var lat = la1 - row * dy
      var metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos(lat * Math.PI / 180)

      for (var col = 0; col < nx; col++) {
        var idx = row * nx + col

        var dudx
        if (col === 0) {
          dudx = (uData[idx + 1] - uData[idx]) / (dx * metersPerDegreeLon)
        } else if (col === nx - 1) {
          dudx = (uData[idx] - uData[idx - 1]) / (dx * metersPerDegreeLon)
        } else {
          dudx = (uData[idx + 1] - uData[idx - 1]) / (2 * dx * metersPerDegreeLon)
        }

        var dvdy
        if (row === 0) {
          dvdy = (vData[idx] - vData[idx + nx]) / (dy * METERS_PER_DEGREE_LAT)
        } else if (row === ny - 1) {
          dvdy = (vData[idx - nx] - vData[idx]) / (dy * METERS_PER_DEGREE_LAT)
        } else {
          dvdy = (vData[idx - nx] - vData[idx + nx]) / (2 * dy * METERS_PER_DEGREE_LAT)
        }

        var value = dudx + dvdy
        divergence[idx] = value
        var absValue = Math.abs(value)
        if (absValue > maxAbs) maxAbs = absValue
      }
    }

    return { header: header, data: divergence, maxAbs: maxAbs }
  }

  // ---------------------------------------------------------
  // Map a divergence value to an RGBA color
  // negative (convergence) -> blue, positive (divergence) -> red
  // magnitude relative to the grid's own max controls opacity
  // ---------------------------------------------------------

  Tuulikartta.resolveDivergenceColor = function (value, maxAbs) {
    if (!maxAbs) return [0, 0, 0, 0]

    var t = value / maxAbs
    if (t > 1) t = 1
    if (t < -1) t = -1

    var alpha = Math.round(Math.abs(t) * 200)

    return t < 0 ? [33, 102, 172, alpha] : [214, 96, 77, alpha]
  }

  // ---------------------------------------------------------
  // Build a Leaflet image overlay from the divergence grid
  // ---------------------------------------------------------

  Tuulikartta.buildDivergenceOverlay = function (windData) {
    var grid = Tuulikartta.computeDivergenceGrid(windData)
    if (!grid) return null

    var header = grid.header
    var nx = header.nx, ny = header.ny

    var canvas = document.createElement('canvas')
    canvas.width = nx
    canvas.height = ny
    var ctx = canvas.getContext('2d')
    var imageData = ctx.createImageData(nx, ny)

    for (var i = 0; i < nx * ny; i++) {
      var color = Tuulikartta.resolveDivergenceColor(grid.data[i], grid.maxAbs)
      var pixelIndex = i * 4
      imageData.data[pixelIndex] = color[0]
      imageData.data[pixelIndex + 1] = color[1]
      imageData.data[pixelIndex + 2] = color[2]
      imageData.data[pixelIndex + 3] = color[3]
    }

    ctx.putImageData(imageData, 0, 0)

    var bounds = L.latLngBounds([header.la2, header.lo1], [header.la1, header.lo2])

    return L.imageOverlay(canvas.toDataURL(), bounds, {
      opacity: 0.65,
      interactive: false
    })
  }

  // ---------------------------------------------------------
  // Show/hide/refresh the divergence overlay layer depending on
  // the current parameter and the wind particle/divergence toggles
  // ---------------------------------------------------------

  Tuulikartta.updateDivergenceLayer = function (parameter) {
    if (saa.Tuulikartta.divergenceLayer && saa.Tuulikartta.map && saa.Tuulikartta.map.hasLayer(saa.Tuulikartta.divergenceLayer)) {
      saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.divergenceLayer)
    }

    var shouldShow = saa.Tuulikartta.showWindParticles && saa.Tuulikartta.showDivergence && Tuulikartta.isVelocityParameter(parameter)
    if (!shouldShow) return

    var windData = Tuulikartta.buildWindVelocityData(parameter)
    if (!windData) return

    saa.Tuulikartta.divergenceLayer = Tuulikartta.buildDivergenceOverlay(windData)
    if (!saa.Tuulikartta.divergenceLayer) return

    saa.Tuulikartta.divergenceLayer.addTo(saa.Tuulikartta.map)
    Tuulikartta.bringVelocityLayerToFront()
  }

  // ---------------------------------------------------------
  // Enable/disable the "show divergence" checkbox depending on
  // whether the wind particle (velocity) layer is currently on
  // ---------------------------------------------------------

  Tuulikartta.updateDivergenceControlState = function () {
    var checkbox = document.getElementById('show-divergence')
    if (checkbox) {
      checkbox.disabled = !saa.Tuulikartta.showWindParticles
    }
    Tuulikartta.updateDivergenceLayer(saa.Tuulikartta.selectedParameter)
  }

}(saa.Tuulikartta = saa.Tuulikartta || {}))
