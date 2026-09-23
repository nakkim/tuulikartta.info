/*
* Tuulikartta.info synop plot
* Copyright (C) 2017 Ville Oravilkka
*
* Builds a combined synoptic station plot icon (WMO station model), laid
* out per the RMetS/MetLink station plot guide
* (https://www.metlink.org/resource/student-charts/):
* wind barb (knots), total cloud cover (oktas), temperature, dew point,
* pressure (3-digit tenths-of-hPa code), gust (knots), visibility (km)
* and present weather code. Cloud type/height and past weather are not
* part of this station network's observations, so cloud type is left
* out entirely and past weather/pressure tendency always show '-'.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  var CX = 65
  var CY = 60
  var R = 11
  var MS_TO_KNOTS = 1.943844

  function fmt(value, decimals, scale) {
    if (value === null || value === undefined || value === 'NaN' || isNaN(parseFloat(value))) return '-'
    return (parseFloat(value) * (scale || 1)).toFixed(decimals)
  }

  // pressure is plotted as the last three digits of the value in tenths
  // of a millibar, e.g. 1003.1 -> "031", 987.1 -> "871"
  function pressureCode(value) {
    if (value === null || value === undefined || value === 'NaN' || isNaN(parseFloat(value))) return '-'
    var tenths = Math.round(parseFloat(value) * 10) % 1000
    return ('00' + tenths).slice(-3)
  }

  function text(x, y, anchor, content, color) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" font-family="sans-serif" font-size="11" fill="' + (color || 'black') + '">' + content + '</text>'
  }

  // point on the circle at `angleDeg` clockwise from the top
  function circlePoint(angleDeg) {
    var rad = angleDeg * Math.PI / 180
    return { x: CX + R * Math.sin(rad), y: CY - R * Math.cos(rad) }
  }

  function sectorMarkup(sectorAngle) {
    var top = circlePoint(0)
    var end = circlePoint(sectorAngle)
    var largeArc = sectorAngle > 180 ? 1 : 0
    return '<path d="M ' + CX + ',' + CY + ' L ' + top.x + ',' + top.y + ' A ' + R + ',' + R + ' 0 ' + largeArc + ',1 ' + end.x + ',' + end.y + ' Z" fill="black"></path>'
  }

  function diameterLine(angleDeg, color) {
    var a = circlePoint(angleDeg), b = circlePoint(angleDeg + 180)
    return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (color || 'black') + '" stroke-width="1.5"></line>'
  }

  // WMO total cloud cover symbol, following the official WMO reference
  // glyphs: a sector filled clockwise from the top for the even oktas
  // (2, 4, 6 = quarter/half/three-quarters), with the odd oktas (1, 3, 5)
  // reusing the preceding sector and adding a diameter line; 7 and 8 are
  // both a solid disc (7 with a thin line marking the remaining sliver)
  // and 9 (sky obscured) is an unfilled circle with a cross through it
  function cloudCoverMarkup(octas) {
    var circle = '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" stroke="black" stroke-width="1.5"></circle>'

    if (octas === null || octas === undefined || isNaN(parseFloat(octas))) {
      return circle + text(CX, CY + 4, 'middle', '-')
    }

    octas = Math.round(parseFloat(octas))

    if (octas <= 0) return circle
    if (octas === 1) return circle + diameterLine(0)
    if (octas === 2) return circle + sectorMarkup(90)
    if (octas === 3) return circle + sectorMarkup(90) + diameterLine(0)
    if (octas === 4) return circle + sectorMarkup(180)
    if (octas === 5) return circle + sectorMarkup(180) + diameterLine(90)
    if (octas === 6) return circle + sectorMarkup(270)
    if (octas === 7) return '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="black" stroke="black" stroke-width="1.5"></circle>' + diameterLine(0, 'white')
    if (octas === 8) return '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="black" stroke="black" stroke-width="1.5"></circle>'

    // 9: sky obscured
    return circle + diameterLine(45) + diameterLine(135)
  }

  Tuulikartta.buildSynopPlotIcon = function (obs) {
    var windAvailable = obs['ws_10min'] !== null && obs['ws_10min'] !== undefined &&
      obs['wd_10min'] !== null && obs['wd_10min'] !== undefined

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="130" height="112" viewBox="0 0 130 112">'

    if (windAvailable) {
      svg += Tuulikartta.buildWindBarbGroup(obs['ws_10min'], obs['wd_10min'], CX, CY)
    }

    svg += cloudCoverMarkup(obs['n_man'])

    if (!windAvailable) {
      svg += text(6, 102, 'start', '-')
    }

    svg += text(79, 64, 'start', '-', 'red') // pressure tendency and trend: not available from this network
    svg += text(79, 88, 'start', '-') // past weather: not available from this network

    svg += text(124, 18, 'end', fmt(obs['wg_10min'], 0, MS_TO_KNOTS))
    svg += text(6, 36, 'start', fmt(obs['t2m'], 1))
    svg += text(124, 40, 'end', pressureCode(obs['pressure']))
    svg += text(4, 48, 'start', fmt(obs['vis'], 0, 0.001), 'red')
    svg += text(6, 88, 'start', fmt(obs['dewpoint'], 1), 'red')
    svg += text(27, 64, 'start', fmt(obs['wawa'], 0))

    svg += '</svg>'

    return 'data:image/svg+xml,' + encodeURIComponent(svg)
  }

  Tuulikartta.synopPlotIconSize = [130, 112]
  Tuulikartta.synopPlotIconAnchor = [CX, CY]

}(saa.Tuulikartta = saa.Tuulikartta || {}))
