/*
* Tuulikartta.info wind barbs
* Copyright (C) 2017 Ville Oravilkka
*
* Builds meteorological wind barb markup (shaft plus pennants/full/half
* feathers encoding wind speed in 5-knot steps), usable either as a
* standalone data-URI SVG icon or embedded in a larger symbol such as
* the synop station plot.
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

  // builds the shaft + pennants/full/half feathers for a wind barb whose
  // station point sits at (cx, cy) and whose shaft points "up" (north);
  // rotate the returned markup around (cx, cy) to point it the right way
  Tuulikartta.buildWindBarbFeathers = function (windSpeedMs, cx, cy, pennantColor) {
    var speed = parseFloat(windSpeedMs)
    var fillColor = pennantColor || 'black'

    if (isNaN(speed) || speed < 1) {
      return { hasShaft: false, markup: '' }
    }

    var shaftTip = cy - 23
    var spacing = 6
    var barbLength = 14
    var halfBarbLength = 7
    var barbAngle = 55

    var knots = speed * MS_TO_KNOTS
    var rounded = Math.max(5, Math.round(knots / 5) * 5)
    var pennants = Math.floor(rounded / 50)
    var remainder = rounded % 50
    var fullBarbs = Math.floor(remainder / 10)
    var halfBarb = (remainder % 10) >= 5 ? 1 : 0

    var markup = '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + shaftTip + '" stroke="black" stroke-width="2"></line>'

    // pennants (50kt) sit closest to the shaft tip, then full barbs (10kt),
    // with any half barb (5kt) innermost, closest to the station point
    var pos = shaftTip

    for (var p = 0; p < pennants; p++) {
      var baseTop = pos
      var baseBottom = pos + spacing * 1.5
      var tip = featherEnd(cx, (baseTop + baseBottom) / 2, barbLength, barbAngle)
      markup += '<polygon points="' + cx + ',' + baseTop + ' ' + cx + ',' + baseBottom + ' ' + tip.x + ',' + tip.y + '" fill="' + fillColor + '" stroke="black" stroke-width="1"></polygon>'
      pos = baseBottom
    }

    for (var f = 0; f < fullBarbs; f++) {
      var end = featherEnd(cx, pos, barbLength, barbAngle)
      markup += '<line x1="' + cx + '" y1="' + pos + '" x2="' + end.x + '" y2="' + end.y + '" stroke="black" stroke-width="2"></line>'
      pos += spacing
    }

    if (halfBarb) {
      var halfEnd = featherEnd(cx, pos, halfBarbLength, barbAngle)
      markup += '<line x1="' + cx + '" y1="' + pos + '" x2="' + halfEnd.x + '" y2="' + halfEnd.y + '" stroke="black" stroke-width="2"></line>'
    }

    return { hasShaft: true, markup: markup }
  }

  // wind barb group rotated to point towards the direction the wind blows
  // FROM, ready to be embedded ahead of a station circle that will be
  // drawn on top of it (covering the inner part of the shaft)
  Tuulikartta.buildWindBarbGroup = function (windSpeedMs, winddirection, cx, cy) {
    var feathers = Tuulikartta.buildWindBarbFeathers(windSpeedMs, cx, cy)
    if (!feathers.hasShaft) return ''
    var angle = Tuulikartta.resolveWindBarbRotation(winddirection)
    return '<g transform="rotate(' + angle + ' ' + cx + ' ' + cy + ')">' + feathers.markup + '</g>'
  }

  Tuulikartta.buildWindBarbIcon = function (windSpeedMs, color) {
    var fillColor = color || '#ffffff'
    var cx = 30
    var cy = 30

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">'

    var feathers = Tuulikartta.buildWindBarbFeathers(windSpeedMs, cx, cy, fillColor)
    if (!feathers.hasShaft) {
      // calm: a circle around the station point, no shaft
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + fillColor + '" stroke="black" stroke-width="2"></circle>'
      svg += '</svg>'
      return 'data:image/svg+xml,' + encodeURIComponent(svg)
    }

    svg += feathers.markup
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="black"></circle>'
    svg += '</svg>'

    return 'data:image/svg+xml,' + encodeURIComponent(svg)
  }

}(saa.Tuulikartta = saa.Tuulikartta || {}))
