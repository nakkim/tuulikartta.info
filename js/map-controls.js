/*
* Tuulikartta.info map controls
* Copyright (C) 2017 Ville Oravilkka
*
* Settings sidebar content and the custom Leaflet controls
* (settings, radar, lightning, wind particles, table, info) added to the map.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  Tuulikartta.populateSidebar = function (radarLayerOpacity) {
    var html = ""
    html += '<div class="sidebar-container">'
    html += '<h1>' + translations[selectedLanguage]['settings'] + '</h1>'
    html += '<input id="show-observations" type="checkbox" checked> ' + translations[selectedLanguage]['showObservations']
    html += '<br/>'
    html += '<input id="road-observations" type="checkbox" disabled> ' + translations[selectedLanguage]['roadObs']
    html += '<br/>'
    html += '<br/>'
    html += '<span><b>' + translations[selectedLanguage]['renderSettings'] + '</b></span>'
    html += '<br/>'
    html += '<input id="use-wind-barbs" type="checkbox"' + (saa.Tuulikartta.useWindBarbs ? ' checked' : '') + '> ' + translations[selectedLanguage]['useWindBarbs']
    html += '<br/>'
    html += '<input id="show-divergence" type="checkbox" disabled' + (saa.Tuulikartta.showDivergence ? ' checked' : '') + '> ' + translations[selectedLanguage]['showDivergence']
    html += '<br/>'
    html += '<br/>'
    html += '<span><b>' + translations[selectedLanguage]['layerOpacity'] + '</b></span>'
    html += '<table>'
    html += '<tr>'
    html += '<td>' + translations[selectedLanguage]['radarLayer'] + ':</td><td><input type="range" id="radar-opacity" name="opacity" min="0" max="100" value="' + radarLayerOpacity + '"></td>'
    html += '</tr>'
    html += '</table>'
    html += '<br/>'
    html += '<span><b>' + translations[selectedLanguage]['lightningObs'] + '</b></span>'
    html += '<table>'
    html += '<tr>'
    html += '<td>' + translations[selectedLanguage]['lightningShow'] + ':</td>'
    html += '<td>'
    html += '<select id="lightning-source">'
    if (saa.Tuulikartta.showCloudStrikes == true || saa.Tuulikartta.showCloudStrikes == 'true') {
      html += '<option value="1" selected>' + translations[selectedLanguage]['allObs'] + '</option>'
      html += '<option value="0">' + translations[selectedLanguage]['groundOnly'] + '</option>'
    } else {
      html += '<option value="1">' + translations[selectedLanguage]['allObs'] + '</option>'
      html += '<option value="0" selected>' + translations[selectedLanguage]['groundOnly'] + '</option>'
    }
    html += '</select>'
    html += '</td>'
    html += '</tr>'
    html += '<tr>'
    html += '<td>' + translations[selectedLanguage]['timeWindow'] + ':</td>'
    html += '<td>'
    html += '<select id="lightning-interval">'
    html += '<option value="5">5 ' + translations[selectedLanguage]['minutes'] + '</option>'
    html += '<option value="15">15 ' + translations[selectedLanguage]['minutes'] + '</option>'
    html += '<option value="30">30 ' + translations[selectedLanguage]['minutes'] + '</option>'
    html += '</select>'
    html += '</td>'
    html += '</tr>'
    html += '</table>'
    html += '<br/>'
    html += '<br/>'
    html += '</div>'

    return html
  }

  /* settings control */
  Tuulikartta.createSettingsControl = function (sidebar) {
    var customControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create(
          'div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-select-source'
        )
        container.onclick = function () {
          sidebar.toggle()
        }
        container.title = translations[selectedLanguage]['settings']
        return container
      }
    })
    return new customControl()
  }

  /* radar control */
  Tuulikartta.createRadarControl = function () {
    var radarControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create(
          'div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-select-radar'
        )
        container.onclick = function () {
          saa.Tuulikartta.radarLayer.setParams({ time: saa.Tuulikartta.timeStamp })
          if (saa.Tuulikartta.map.hasLayer(saa.Tuulikartta.radarLayer)) {
            saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.radarLayer)
            $(this).removeClass('active')
          } else {
            saa.Tuulikartta.updateRadarData()
            saa.Tuulikartta.map.addLayer(saa.Tuulikartta.radarLayer)
            Tuulikartta.bringVelocityLayerToFront()
            $(this).addClass('active')
          }
        }
        container.title = translations[selectedLanguage]['radarTitle']
        return container
      }
    })
    return new radarControl()
  }

  /* lightning control */
  Tuulikartta.createLightningControl = function () {
    var lightningControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create(
          'div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-select-flash'
        )
        container.onclick = function () {
          if (saa.Tuulikartta.map.hasLayer(saa.lightning.geoLayer)) {
            saa.Tuulikartta.map.removeLayer(saa.lightning.geoLayer)
            $(this).removeClass('active')
            saa.Tuulikartta.getLightningData = false
            saa.lightning.geoLayer.clearLayers()
          } else {
            saa.lightning.init(saa.Tuulikartta.timeStamp)
            saa.Tuulikartta.map.addLayer(saa.lightning.geoLayer)
            $(this).addClass('active')
            saa.Tuulikartta.getLightningData = true
          }
          saa.Tuulikartta.updateRadarData()
        }
        container.title = translations[selectedLanguage]['lightningTitle']
        return container
      }
    })
    return new lightningControl()
  }

  /* wind particles control */
  Tuulikartta.createWindParticlesControl = function (getSelectedParameter) {
    var windParticlesControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create(
          'div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-select-wind-particles'
        )
        saa.Tuulikartta.windParticlesControlElement = container
        container.onclick = function () {
          if (!Tuulikartta.isVelocityParameter(getSelectedParameter())) {
            return
          }

          if (saa.Tuulikartta.showWindParticles) {
            saa.Tuulikartta.showWindParticles = false
            $(this).removeClass('active')
            if (saa.Tuulikartta.velocityLayer) {
              saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.velocityLayer)
            }
          } else {
            saa.Tuulikartta.showWindParticles = true
            $(this).addClass('active')
            Tuulikartta.updateVelocityLayer(getSelectedParameter())
          }
          Tuulikartta.updateDivergenceControlState()
        }
        container.title = translations[selectedLanguage]['windParticlesTitle']
        return container
      }
    })
    return new windParticlesControl()
  }

  /* observation table control */
  Tuulikartta.createTableControl = function () {
    var tableDataControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create(
          'div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-select-table'
        )

        container.onclick = function () {
          modal.style.display = "block";
        }

        container.title = translations[selectedLanguage]['tableTitle']
        return container
      }
    })
    return new tableDataControl()
  }

  /* traffic cam control */
  // var trafficCamControl = L.Control.extend({
  //   options: {
  //     position: 'topright'
  //   },
  //   onAdd: function (map) {
  //     var container = L.DomUtil.create(
  //       'div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-select-cam'
  //     )

  //     container.onclick = function(){
  //       if(saa.Tuulikartta.timeValue === 'now') {
  //         if(saa.Tuulikartta.map.hasLayer(saa.camera.markers)) {
  //           saa.Tuulikartta.map.removeLayer(saa.camera.markers)
  //           $(this).removeClass('active')
  //           getTrafficCamData = false
  //           saa.camera.markers.clearLayers()
  //         } else {
  //           saa.camera.init()
  //           $(this).addClass('active')
  //           getTrafficCamData = true
  //         }
  //       }
  //     }

  //     container.title = translations[selectedLanguage]['camTitle']
  //     return container
  //   }
  // })
  // map.addControl(new trafficCamControl());

  Tuulikartta.createInfoControl = function () {
    var infoControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create(
          'div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-toggle-info'
        )

        container.onclick = function () {
          var x = document.getElementById("site-info");
          if (x.style.display === "none") {
            x.style.display = "block";
          } else {
            x.style.display = "none";
          }
        }
        container.title = translations[selectedLanguage]['info']
        return container
      }
    })
    return new infoControl()
  }

}(saa.Tuulikartta = saa.Tuulikartta || {}))
