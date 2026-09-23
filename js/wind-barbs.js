/*
* Tuulikartta.info wind barbs
* Copyright (C) 2017 Ville Oravilkka
*
* Builds meteorological wind barb icons (shaft plus pennants/full/half
* feathers encoding wind speed in 5-knot steps) as data-URI SVG icons.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  var MS_TO_KNOTS = 1.943844

  // point on a feather/pennant attached at (cx, y) on the shaft, angled
  // back towards the shaft tip
  function featherEnd(cx, y, length, angleDeg) {
    var rad = angleDeg * Math.PI / 180
    return {
      x: cx + length * Math.sin(rad),
      y: y - length * Math.cos(rad)
    }
  }

  Tuulikartta.buildWindBarbIcon = function (windSpeedMs, color) {
    var speed = parseFloat(windSpeedMs)
    var fillColor = color || '#ffffff'
    var cx = 30
    var cy = 30
    var shaftTip = 7
    var spacing = 6
    var barbLength = 14
    var halfBarbLength = 7
    var barbAngle = 55

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">'

    if (isNaN(speed) || speed < 1) {
      // calm: a circle around the station point, no shaft
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + fillColor + '" stroke="black" stroke-width="2"></circle>'
      svg += '</svg>'
      return 'data:image/svg+xml,' + encodeURIComponent(svg)
    }

    var knots = speed * MS_TO_KNOTS
    var rounded = Math.max(5, Math.round(knots / 5) * 5)
    var pennants = Math.floor(rounded / 50)
    var remainder = rounded % 50
    var fullBarbs = Math.floor(remainder / 10)
    var halfBarb = (remainder % 10) >= 5 ? 1 : 0

    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + shaftTip + '" stroke="black" stroke-width="2"></line>'

    // pennants (50kt) sit closest to the shaft tip, then full barbs (10kt),
    // with any half barb (5kt) innermost, closest to the station point
    var pos = shaftTip

    for (var p = 0; p < pennants; p++) {
      var baseTop = pos
      var baseBottom = pos + spacing * 1.5
      var tip = featherEnd(cx, (baseTop + baseBottom) / 2, barbLength, barbAngle)
      svg += '<polygon points="' + cx + ',' + baseTop + ' ' + cx + ',' + baseBottom + ' ' + tip.x + ',' + tip.y + '" fill="' + fillColor + '" stroke="black" stroke-width="1"></polygon>'
      pos = baseBottom
    }

    for (var f = 0; f < fullBarbs; f++) {
      var end = featherEnd(cx, pos, barbLength, barbAngle)
      svg += '<line x1="' + cx + '" y1="' + pos + '" x2="' + end.x + '" y2="' + end.y + '" stroke="black" stroke-width="2"></line>'
      pos += spacing
    }

    if (halfBarb) {
      var halfEnd = featherEnd(cx, pos, halfBarbLength, barbAngle)
      svg += '<line x1="' + cx + '" y1="' + pos + '" x2="' + halfEnd.x + '" y2="' + halfEnd.y + '" stroke="black" stroke-width="2"></line>'
    }

    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="black"></circle>'
    svg += '</svg>'

    return 'data:image/svg+xml,' + encodeURIComponent(svg)
  }

}(saa.Tuulikartta = saa.Tuulikartta || {}))
