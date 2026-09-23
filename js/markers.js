/*
* Tuulikartta.info map markers
* Copyright (C) 2017 Ville Oravilkka
*
* Draws observation station markers/labels for the selected parameter
* and builds the popup content shown when a marker is clicked.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  // popup max width
  var maxWidth = 650

  Tuulikartta.createLabelIcon = function (labelClass, labelText, iconAnchor) {
    return L.divIcon({
      iconSize: null,
      className: labelClass,
      iconAnchor: iconAnchor || [10, 7],
      html: labelText
    })
  }

  Tuulikartta.clearMarkers = function () {
    // remove all old markers
    saa.Tuulikartta.markerGroupSynop.clearLayers()
    saa.Tuulikartta.markerGroupRoad.clearLayers()
  }

  // ---------------------------------------------------------
  // Draw station observations
  // ---------------------------------------------------------

  Tuulikartta.drawData = function (param) {

    if (!saa.Tuulikartta.showStationObservations) return false
    Tuulikartta.clearMarkers()

    var sizeofdata = parseInt(Object.keys(saa.Tuulikartta.data).length)
    saa.Tuulikartta.markerGroupSynop.addTo(saa.Tuulikartta.map)

    if (L.Browser.mobile) {
      maxWidth = 250
    }

    for (var i = 0; i < sizeofdata; i++) {
      var location = { lat: parseFloat(saa.Tuulikartta.data[i]['lat']), lng: parseFloat(saa.Tuulikartta.data[i]['lon']) }
      var time = Tuulikartta.timeTotime(saa.Tuulikartta.data[i]['epochtime'])
      var latlon = saa.Tuulikartta.data[i]['lat'] + ',' + saa.Tuulikartta.data[i]['lon']

      if (param == 'ws_10min' || param === 'wg_10min') {
        if (saa.Tuulikartta.data[i]['ws_10min'] !== null && saa.Tuulikartta.data[i]['wd_10min'] !== null &&
          saa.Tuulikartta.data[i]['wg_10min'] !== null) {

          if (saa.Tuulikartta.data[i][param] < 10) { var iconAnchor = [30, 28] }
          if (saa.Tuulikartta.data[i][param] >= 10) { var iconAnchor = [25, 28] }

          if (saa.Tuulikartta.useWindBarbs) {
            var icon = L.icon({
              iconUrl: Tuulikartta.buildWindBarbIcon(saa.Tuulikartta.data[i][param], (saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param])).hex),
              iconSize: [60, 60],
              iconAnchor: iconAnchor,
              popupAnchor: [0, 0]
            })
          } else {
            var icon = L.icon({
              iconUrl: '../symbols/wind/' + (saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param])).code + '.svg',
              iconSize: [60, 60], // size of the icon
              iconAnchor: iconAnchor, // point of the icon which will correspond to marker's location
              popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
            })
          }

          var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
            {
              icon: icon,
              rotationAngle: saa.Tuulikartta.useWindBarbs
                ? Tuulikartta.resolveWindBarbRotation(saa.Tuulikartta.data[i]['wd_10min'])
                : Tuulikartta.resolveWindDirection(saa.Tuulikartta.data[i]['wd_10min']),
              rotationOrigin: 'center center'
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i])
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          //marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']

          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              interactive: false,
              keyboard: false,
              icon: Tuulikartta.createLabelIcon('textLabelclass', parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1),
                saa.Tuulikartta.useWindBarbs ? [10, -6] : undefined)
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }
        }
      }

      if (param === 'ws_1d' || param === 'wg_1d') {
        if (saa.Tuulikartta.data[i]['ws_1d'] !== null && saa.Tuulikartta.data[i]['ws_max_dir'] !== null && saa.Tuulikartta.data[i]['wg_max_dir'] !== null && saa.Tuulikartta.data[i]['wg_1d'] !== null) {

          if (saa.Tuulikartta.data[i][param] < 10) { var iconAnchor = [30, 28] }
          if (saa.Tuulikartta.data[i][param] >= 10) { var iconAnchor = [25, 28] }

          if (saa.Tuulikartta.useWindBarbs) {
            var icon = L.icon({
              iconUrl: Tuulikartta.buildWindBarbIcon(saa.Tuulikartta.data[i][param], (saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param])).hex),
              iconSize: [60, 60],
              iconAnchor: iconAnchor,
              popupAnchor: [0, 0]
            })
          } else {
            var icon = L.icon({
              iconUrl: '../symbols/wind/' + (saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param])).code + '.svg',
              iconSize: [60, 60], // size of the icon
              iconAnchor: iconAnchor, // point of the icon which will correspond to marker's location
              popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
            })
          }

          if (param == 'ws_1d') {
            var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
              {
                icon: icon,
                rotationAngle: saa.Tuulikartta.useWindBarbs
                  ? Tuulikartta.resolveWindBarbRotation(saa.Tuulikartta.data[i]['ws_max_dir'])
                  : Tuulikartta.resolveWindDirection(saa.Tuulikartta.data[i]['ws_max_dir']),
                rotationOrigin: 'center center'
              })
          } else {
            var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
              {
                icon: icon,
                rotationAngle: saa.Tuulikartta.useWindBarbs
                  ? Tuulikartta.resolveWindBarbRotation(saa.Tuulikartta.data[i]['wg_max_dir'])
                  : Tuulikartta.resolveWindDirection(saa.Tuulikartta.data[i]['wg_max_dir']),
                rotationOrigin: 'center center'
              })
          }

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i])
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          //marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']

          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              interactive: false,
              keyboard: false,
              icon: Tuulikartta.createLabelIcon('textLabelclass', parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1),
                saa.Tuulikartta.useWindBarbs ? [10, -6] : undefined)
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }
        }
      }

      if (param === 'rr_1h' || param === 'ri_10min' || param === 'rr_1d') {
        if (parseFloat(saa.Tuulikartta.data[i][param]) > 0) {
          var fillColor = Tuulikartta.resolvePrecipitationAmount(saa.Tuulikartta.data[i][param])
          var hex = fillColor.substr(1)
          hex = 'hex' + hex
          if (saa.Tuulikartta.data[i][param] !== null && parseFloat(saa.Tuulikartta.data[i][param]) > 0) {
            var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
              {
                interactive: true,
                keyboard: false,
                icon: Tuulikartta.createLabelIcon(hex, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
              })

            if (saa.Tuulikartta.data[i]['type'] === 'road') {
              marker.addTo(saa.Tuulikartta.markerGroupRoad)
            } else {
              marker.addTo(saa.Tuulikartta.markerGroupSynop)
            }
            marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
              saa.Tuulikartta.data[i]['fmisid']), {
              maxWidth: maxWidth
            })
            marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
            marker.type = saa.Tuulikartta.data[i]['type']
          }
        }
        // draw '–' if theres no precipitation
        if (parseFloat(saa.Tuulikartta.data[i][param]) == 0 && saa.Tuulikartta.data[i][param] !== 'NaN') {
          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              interactive: true,
              keyboard: false,
              icon: Tuulikartta.createLabelIcon('textLabelclass', '–')
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 'dewpoint' || param === 't2m' || param === 'tmin' || param === 'tmax') {

        var fillColor = Tuulikartta.resolveTemperature(saa.Tuulikartta.data[i][param])
        var hex = fillColor.substr(1)
        hex = 'hex' + hex

        var svgicon = ''
        svgicon = svgicon + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 50 50" enable-background="new 0 0 50 50" xml:space="preserve">'
        svgicon = svgicon + '<g><path d="M20.4,48.8c6.7,1.3,12.5-3.8,12.5-10.3c0-3.4-1.7-6.5-4.3-8.4V7.2c0-3.4-2.7-6.2-6.2-6.2c-3.4,0-6.2,2.8-6.2,6.2v22.9   c-3.1,2.3-4.9,6.2-4,10.6C13,44.7,16.3,48,20.4,48.8z M17.5,32l0.9-0.7v-24c0-2.2,1.8-3.9,3.9-3.9c2.2,0,4,1.8,4,3.9v24l0.9,0.7   c2.1,1.5,3.3,4,3.3,6.6c0,2.2-0.9,4.3-2.4,5.8c-1.6,1.5-3.6,2.4-5.8,2.4c-4.1,0-7.3-2.9-8-6.5C13.8,37,15,33.8,17.5,32z"></path>'
        svgicon = svgicon + '<path d="M22.4,44.4c1.6,0,3.1-0.6,4.2-1.7c1.1-1.1,1.7-2.6,1.7-4.2c0-4-3.4-5.3-4.3-6.1V15.5h-3.3v16.9c-0.7,0.8-5.1,2.4-4.1,7.3   C17.1,42.3,19.4,44.4,22.4,44.4z" stroke="black" fill="' + fillColor + '"></path>'
        svgicon = svgicon + '<path d="M36.9,7.8h-5.7v2.3h5.7c0.6,0,1.1-0.5,1.1-1.1C38.1,8.3,37.6,7.8,36.9,7.8z"></path>'
        svgicon = svgicon + '<path d="M35.8,15c0-0.6-0.5-1.1-1.1-1.1h-3.4v2.3h3.4C35.3,16.1,35.8,15.6,35.8,15z"></path>'
        svgicon = svgicon + '<path d="M38.1,21c0-0.6-0.5-1.1-1.1-1.1h-5.7v2.3h5.7C37.6,22.2,38.1,21.6,38.1,21z"></path>'
        svgicon = svgicon + '</g>'
        svgicon = svgicon + '</svg>'

        var svgicon = encodeURI('data:image/svg+xml,' + svgicon).replace('#', '%23')

        if (saa.Tuulikartta.data[i][param] !== null && Math.abs(saa.Tuulikartta.data[i][param]) < 100) {
          // add trash symbol to enable bigger popup activation area
          // trashSymbol(saa.Tuulikartta.data[i])

          // symbol
          var icon = L.icon({
            iconUrl: svgicon,
            iconSize: [30, 30],
            iconAnchor: [40, 10],
            popupAnchor: [0, 0]
          })

          marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
            {
              icon: icon,
              interactive: false,
              keyboard: false
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          // text field
          marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
            {
              interactive: true,
              keyboard: true,
              icon: Tuulikartta.createLabelIcon(hex, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 'n_man') {

        if (saa.Tuulikartta.data[i]['n_man'] !== null) {
          var icon = L.icon({
            iconUrl: '../symbols/nn/' + saa.Tuulikartta.data[i][param] + '.svg',
            iconSize: [30, 30], // size of the icon
            iconAnchor: [15, 15], // point of the icon which will correspond to marker's location
            popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
          })

          var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
            {
              icon: icon
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 'smartsymbol') {
        if (saa.Tuulikartta.data[i]['smartsymbol'] !== null) {
          var icon = L.icon({
            iconUrl: '../symbols/SmartSymbol/light/' + Math.round(saa.Tuulikartta.data[i][param]) + '.svg',
            iconSize: [50, 50], // size of the icon
            iconAnchor: [25, 25], // point of the icon which will correspond to marker's location
            popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
          })

          var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
            {
              icon: icon
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 't2mdewpoint') {
        if (saa.Tuulikartta.data[i]['t2mdewpoint'] !== null) {
          var fillColor = Tuulikartta.resolveDewpointDiff(saa.Tuulikartta.data[i][param])
          var hex = fillColor.substr(1)
          hex = 'hex' + hex

          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              interactive: true,
              keyboard: false,
              icon: Tuulikartta.createLabelIcon(hex, saa.Tuulikartta.data[i][param].toFixed(1))
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 'vis') {
        if (saa.Tuulikartta.data[i]['vis'] !== null) {
          var labelClass = 'textLabelclassGrey'

          // 1000 <= visibility < 2000
          if (parseFloat(saa.Tuulikartta.data[i][param]) < 2000 && parseFloat(saa.Tuulikartta.data[i][param]) >= 1000) {
            labelClass = 'textLabelclassBlack'
            var icon = L.icon({
              iconUrl: '../symbols/mist.svg',
              iconSize: [60, 60],
              iconAnchor: [66, 25],
              popupAnchor: [0, 0]
            })
            var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
              {
                icon: icon
              })

            if (saa.Tuulikartta.data[i]['type'] === 'road') {
              marker.addTo(saa.Tuulikartta.markerGroupRoad)
            } else {
              marker.addTo(saa.Tuulikartta.markerGroupSynop)
            }
          }

          // visibility < 1000
          if (parseFloat(saa.Tuulikartta.data[i][param]) < 1000) {
            labelClass = 'textLabelclassRed'
            var icon = L.icon({
              iconUrl: '../symbols/fog.svg',
              iconSize: [60, 60],
              iconAnchor: [66, 25],
              popupAnchor: [0, 0]
            })
            var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
              {
                icon: icon
              })

            if (saa.Tuulikartta.data[i]['type'] === 'road') {
              marker.addTo(saa.Tuulikartta.markerGroupRoad)
            } else {
              marker.addTo(saa.Tuulikartta.markerGroupSynop)
            }
          }

          // visibility > 2000
          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              interactive: true,
              keyboard: false,
              icon: Tuulikartta.createLabelIcon(labelClass, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 'pressure') {
        if (saa.Tuulikartta.data[i]['pressure'] !== null) {
          var fillColor = Tuulikartta.resolvePressure(saa.Tuulikartta.data[i][param])
          var hex = fillColor.substr(1)
          hex = 'hex' + hex

          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              interactive: true,
              keyboard: false,
              icon: Tuulikartta.createLabelIcon(hex, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 'wawa') {
        if (saa.Tuulikartta.data[i]['wawa'] !== null && Tuulikartta.resolveWawaCode(saa.Tuulikartta.data[i]['wawa']) !== null) {
          var code = Tuulikartta.resolveWawaCode(saa.Tuulikartta.data[i]['wawa'])

          var svgicon = ''
          if (code.short === 'Poutaa' || code.short === 'FairWeather') {
            svgicon = svgicon + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" enable-background="new 0 0 50 50" xml:space="preserve">'
            svgicon = svgicon + `<circle r="5" cx="10" cy="10" stroke="black" stroke-width="2" fill="#ffffff"></circle>`
            svgicon = svgicon + `</svg>`
          } else {
            svgicon = svgicon + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" enable-background="new 0 0 50 50" xml:space="preserve">'
            svgicon = svgicon + `<circle r="5" cx="10" cy="10" stroke="black" stroke-width="2" fill="${code.hex}"></circle>`
            svgicon = svgicon + `</svg>`
          }

          var icon = encodeURI('data:image/svg+xml,' + svgicon).replace('#', '%23')

          var icon = L.icon({
            iconUrl: icon,
            iconSize: [50, 50],
            iconAnchor: [0, 0],
            popupAnchor: [0, 0]
          })

          // dot
          var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
            {
              icon: icon
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          var markerHtmlStyles = `
              font-weight: bold;
              color: ${code.hex};
              margin: 10px 0 30px 0;
              font-size: 12px;
              background-color: black;
              border: 1px solid black;
              padding: 1px 1px 1px 1px;`

          if (code.short === 'Poutaa' || code.short === 'FairWeather') {
            markerHtmlStyles = `
              ffont-weight: bold;
              color: rgb(130, 129, 129);
              font-size: 11px;
              background-color: rgba(255,255,255,0.2);
              border: 1px solid black;
              padding: 1px 1px 1px 1px;`
          }

          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              icon: L.divIcon({
                iconAnchor: [-17, 10],
                labelAnchor: [0, 0],
                popupAnchor: [0, 0],
                html: `<span style="${markerHtmlStyles}" >${code.short}</span>`,
                className: null
              })
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 'snow_aws') {
        if (parseFloat(saa.Tuulikartta.data[i][param]) > 0) {
          var fillColor = Tuulikartta.resolveSnowDepth(saa.Tuulikartta.data[i][param])
          var hex = fillColor.substr(1)
          hex = 'hex' + hex
          if (saa.Tuulikartta.data[i][param] !== null && parseFloat(saa.Tuulikartta.data[i][param]) > 0) {
            var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
              {
                interactive: true,
                keyboard: false,
                icon: Tuulikartta.createLabelIcon(hex, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
              })

            marker.addTo(saa.Tuulikartta.markerGroupSynop)
            marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
              saa.Tuulikartta.data[i]['fmisid']), {
              maxWidth: maxWidth
            })
            marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
            marker.type = saa.Tuulikartta.data[i]['type']
          }
        }
        if (parseFloat(saa.Tuulikartta.data[i][param]) == 0 && saa.Tuulikartta.data[i][param] !== 'NaN') {
          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              interactive: true,
              keyboard: false,
              icon: Tuulikartta.createLabelIcon('textLabelclass', '–')
            })
          marker.addTo(saa.Tuulikartta.markerGroupSynop)
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
            saa.Tuulikartta.data[i]['fmisid']), {
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        }
      }

      if (param === 'rh') {
        if (saa.Tuulikartta.data[i][param] !== 'NaN') {
          var fillColor = Tuulikartta.resolveRelativeHumidity(saa.Tuulikartta.data[i][param])
          var hex = fillColor.substr(1)
          hex = 'hex' + hex
          if (saa.Tuulikartta.data[i][param] !== null && parseFloat(saa.Tuulikartta.data[i][param]) > 0) {
            var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
              {
                interactive: true,
                keyboard: false,
                icon: Tuulikartta.createLabelIcon(hex, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
              })

            if (saa.Tuulikartta.data[i]['type'] === 'road') {
              marker.addTo(saa.Tuulikartta.markerGroupRoad)
            } else {
              marker.addTo(saa.Tuulikartta.markerGroupSynop)
            }

            marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
              saa.Tuulikartta.data[i]['fmisid']), {
              maxWidth: maxWidth
            })
            marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
            marker.type = saa.Tuulikartta.data[i]['type']
          }
        }

      }

      if (param === 'synopplot') {
        var icon = L.icon({
          iconUrl: Tuulikartta.buildSynopPlotIcon(saa.Tuulikartta.data[i]),
          iconSize: Tuulikartta.synopPlotIconSize,
          iconAnchor: Tuulikartta.synopPlotIconAnchor,
          popupAnchor: [0, 0]
        })

        var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
          {
            icon: icon
          })

        if (saa.Tuulikartta.data[i]['type'] === 'road') {
          marker.addTo(saa.Tuulikartta.markerGroupRoad)
        } else {
          saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i])
          marker.addTo(saa.Tuulikartta.markerGroupSynop)
        }

        marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
          saa.Tuulikartta.data[i]['fmisid']), {
          maxWidth: maxWidth
        })
        marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
        marker.type = saa.Tuulikartta.data[i]['type']
      }
    }

    if (saa.Tuulikartta.timeValue === 'now') {
      for (var i = 0; i < 100; i++) {
        if (saa.Tuulikartta.data[i]['type'] === 'synop') {
          var time = moment(saa.Tuulikartta.data[i]['time'], ['YYYY-MM-DDTHH:mm:ssZ'])
          var timestring = time.format('DD.MM.YYYY HH:mm')
          document.getElementById('datepicker-button').value = timestring.split(' ')[0]
          document.getElementById('clockpicker-button').value = timestring.split(' ')[1]
          break
        }
      }
    }

    Tuulikartta.updateVelocityLayer(param)
  }

  // ---------------------------------------------------------
  // populate infowindow with observations
  // ---------------------------------------------------------

  Tuulikartta.populateInfoWindow = function (data, fmisid) {
    var location = { lat: parseFloat(data['lat']), lng: parseFloat(data['lon']) }
    var time = Tuulikartta.timeTotime(data['epochtime'])
    var latlon = data['lat'] + ',' + data['lon']

    if (L.Browser.mobile) {
      maxWidth = 250
      // maxHeight = 320
    }

    if (data['type'] === 'synop') {
      var stationType = '<b>' + translations[selectedLanguage]['stationType'] + ':</b> <span id="station-type">' + translations[selectedLanguage]['synop'] + '</span> <br>'
    } else {
      var stationType = '<b>' + translations[selectedLanguage]['stationType'] + ':</b> <span id="station-type">' + translations[selectedLanguage]['road'] + '</span> <br>'
    }

    var output = '<div style="text-align:center;">'
    output += '<b>' + translations[selectedLanguage]['observationStation'] + ': </b>' + data['station'] + '<br>'
    output += stationType

    if (saa.Tuulikartta.timeValue === 'now') {
      output += '<b>' + translations[selectedLanguage]['latestObservation'] + ': </b>' + time + '<br>'
    } else {
      output += '<b>' + translations[selectedLanguage]['observationTime'] + ': </b>' + time + '<br>'
    }
    output += '</div>'

    output += `<div id="graph-box-loader" style="text-align: center;"></div>`;
    output += `<div id="graph-box" style="width:${maxWidth}px;">`
    output += `<div id="owl-carousel-chart-${fmisid}" class="owl-carousel owl-theme">`
    output += `<div id="weather-chart-${fmisid}_windrose"></div>`
    output += `<div id="weather-chart-${fmisid}"></div>`
    output += `<div id="weather-chart-${fmisid}_alt"></div>`
    output += `<div id="weather-chart-${fmisid}_alt2"></div>`
    output += '</div>'
    output += `</div>`

    return output
  }

}(saa.Tuulikartta = saa.Tuulikartta || {}))
