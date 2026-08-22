/*
* Tuulikartta.info UI events
* Copyright (C) 2017 Ville Oravilkka
*
* Wires up the toolbar/sidebar controls: wind parameter selection, map
* move/popup handling, time navigation, language switch, layer toggles,
* radar opacity slider and lightning options.
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  var showRoadObservations = false
  var getTrafficCamData = false

  $(function bunttonFunctionalities() {

    // select wind parameter
    $('#select-wind-parameter').change(function () {
      saa.Tuulikartta.selectedParameter = $(this).val()
      saa.Tuulikartta.startPosition = Tuulikartta.resolveGraphStartposition(saa.Tuulikartta.selectedParameter)
      Tuulikartta.clearMarkers()
      Tuulikartta.drawData(saa.Tuulikartta.selectedParameter)
      Tuulikartta.updateVelocityControlState(saa.Tuulikartta.selectedParameter)

      Tuulikartta.updateUrlHash()
    })

    saa.Tuulikartta.map.on('popupopen', function (e) {
      var fmisid = e.popup._source.fmisid
      var type = e.popup._source.type
      if (type === 'Synop-asema') type = 'synop'
      if (type === 'Tiesääasema') type = 'road'
      saa.weatherGraph.getObservationGraph(fmisid, type, saa.Tuulikartta.timeValue)
      $(".owl-carousel").owlCarousel({
        navigation: true, // Show next and prev buttons
        slideSpeed: 300,
        paginationSpeed: 400,
        items: 1,
        pagination: false,
        startPosition: saa.Tuulikartta.startPosition
      });
    })

    // ---------------------------------------------------------
    // Get and save user location to localstorage
    // ---------------------------------------------------------

    saa.Tuulikartta.map.on('move', function () {
      var lat = saa.Tuulikartta.map.getCenter().lat
      var lon = saa.Tuulikartta.map.getCenter().lng
      var zoom = saa.Tuulikartta.map.getZoom()
      localStorage.setItem('latitude', lat)
      localStorage.setItem('longitude', lon)
      localStorage.setItem('zoomlevel', zoom)

      Tuulikartta.updateUrlHash()
    })

    // ---------------------------------------------------------
    // get observatinos with timestamp
    // ---------------------------------------------------------

    $('#select-content-datasearch').click(function () {
      $(this).removeClass('inactive')
      $('#select-content-now').addClass('inactive')

      var date = document.getElementById('datepicker-button').value
      var time = document.getElementById('clockpicker-button').value

      var timestring = moment(date + ' ' + time, ['DD-MM-YYYY HH:mm'])
      timestring = timestring.utc().format('YYYY-MM-DDTHH:mm:ss')
      timestring = timestring + 'Z'
      saa.Tuulikartta.timeValue = timestring
      saa.Tuulikartta.timeStamp = timestring

      Tuulikartta.clearMarkers()
      saa.Tuulikartta.radarLayer.setParams({ time: saa.Tuulikartta.timeStamp })
      saa.Tuulikartta.namelayer.bringToFront()
      Tuulikartta.updateRadarData()
      getTrafficCamData = false
      // saa.camera.markers.clearLayers()
      $($("#map").find(".leaflet-control-select-cam")).removeClass('active');

      Tuulikartta.updateUrlHash()
    })

    $('#select-content-now').click(function () {
      saa.Tuulikartta.timeValue = 'now'
      $(this).removeClass('inactive')
      $('#select-content-datasearch').addClass('inactive')

      Tuulikartta.clearMarkers()
      Tuulikartta.updateRadarData()

      saa.Tuulikartta.radarLayer.setParams({ time: saa.Tuulikartta.timeStamp })
      saa.Tuulikartta.namelayer.bringToFront()

      Tuulikartta.updateUrlHash()
    })

    // ---------------------------------------------------------
    // progress and regress of time
    // ---------------------------------------------------------

    $('#timepicker-progress-time').click(function () {
      $('#select-content-datasearch').removeClass('inactive')
      $('#select-content-now').addClass('inactive')

      Tuulikartta.clearMarkers()

      var date = document.getElementById('datepicker-button').value
      var time = document.getElementById('clockpicker-button').value

      var time = moment(date + ' ' + time, ['DD-MM-YYYY HH:mm'])
      var newTime = moment(time).add(1, 'hours')

      var timestring = newTime.utc().format('YYYY-MM-DDTHH:mm:ss')
      timestring = timestring + 'Z'
      saa.Tuulikartta.timeStamp = timestring

      var utcOffSet = moment(timestring).utcOffset()
      if (utcOffSet < 0) { newTime.subtrack(Math.abs(utcOffSet), 'minutes') }
      if (utcOffSet > 0) { newTime.add(Math.abs(utcOffSet), 'minutes') }

      document.getElementById('datepicker-button').value = newTime.format('DD.MM.YYYY')
      document.getElementById('clockpicker-button').value = newTime.format('HH:mm')

      saa.Tuulikartta.timeValue = timestring
      saa.Tuulikartta.timeStamp = timestring
      Tuulikartta.updateRadarData()

      saa.Tuulikartta.radarLayer.setParams({ time: saa.Tuulikartta.timeStamp })
      saa.Tuulikartta.namelayer.bringToFront()

      Tuulikartta.updateUrlHash()
    })

    $('#timepicker-regress-time').click(function () {
      $('#select-content-datasearch').removeClass('inactive')
      $('#select-content-now').addClass('inactive')

      Tuulikartta.clearMarkers()

      var date = document.getElementById('datepicker-button').value
      var time = document.getElementById('clockpicker-button').value

      var time = moment(date + ' ' + time, ['DD-MM-YYYY HH:mm'])
      var newTime = moment(time).subtract(1, 'hours')

      var timestring = newTime.utc().format('YYYY-MM-DDTHH:mm:ss')
      timestring = timestring + 'Z'
      saa.Tuulikartta.timeStamp = timestring

      var utcOffSet = moment(timestring).utcOffset()
      if (utcOffSet < 0) { newTime.subtrack(Math.abs(utcOffSet), 'minutes') }
      if (utcOffSet > 0) { newTime.add(Math.abs(utcOffSet), 'minutes') }

      document.getElementById('datepicker-button').value = newTime.format('DD.MM.YYYY')
      document.getElementById('clockpicker-button').value = newTime.format('HH:mm')

      saa.Tuulikartta.timeValue = timestring
      Tuulikartta.updateRadarData()

      saa.Tuulikartta.radarLayer.setParams({ time: saa.Tuulikartta.timeStamp })
      saa.Tuulikartta.namelayer.bringToFront()

      Tuulikartta.updateUrlHash()
    })

    // ---------------------------------------------------------
    // change language
    // ---------------------------------------------------------

    $('#language-selector-value').click(function () {
      if (selectedLanguage === 'fi') {
        $(this).html('FI')
        selectedLanguage = 'en'
        localStorage.setItem('language', 'en')
      } else {
        $(this).html('EN')
        selectedLanguage = 'fi'
        localStorage.setItem('language', 'fi')
      }
      Tuulikartta.updateUrlHash()
      window.location.reload()
    })

    // ---------------------------------------------------------
    // show data layers
    // ---------------------------------------------------------

    $('#show-observations').change(function () {
      if (this.checked == true) {
        saa.Tuulikartta.showStationObservations = true
        saa.Tuulikartta.map.addLayer(saa.Tuulikartta.markerGroupSynop)
        if (showRoadObservations)
          saa.Tuulikartta.map.addLayer(saa.Tuulikartta.markerGroupRoad)
      } else {
        saa.Tuulikartta.showStationObservations = false
        saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.markerGroupSynop)
        if (showRoadObservations)
          saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.markerGroupRoad)
      }
    })

    $('#road-observations').change(function () {
      if (this.checked == true) {
        if (saa.Tuulikartta.showStationObservations == true) saa.Tuulikartta.markerGroupRoad.addTo(saa.Tuulikartta.map)
        showRoadObservations = true
      } else {
        saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.markerGroupRoad)
        showRoadObservations = false
      }
    })

    // -------------------------------------------------------------
    // change layer opacity
    // -------------------------------------------------------------

    var slider = document.getElementById("radar-opacity");
    // Update the current slider value (each time you drag the slider handle)
    slider.oninput = function () {
      var layer = saa.Tuulikartta.radarLayer
      if (layer) {
        var opacity = this.value;
        layer.setOpacity(this.value / 100);
        saa.Tuulikartta.radarLayerOpacity = this.value
        localStorage.setItem('radarLayerOpacity', this.value)
      }
    }

    // -------------------------------------------------------------
    // lightning options
    // -------------------------------------------------------------

    $('#lightning-source').change(function () {
      if (this.value == 1) {
        saa.Tuulikartta.showCloudStrikes = true
        localStorage.setItem('showCloudStrikes', 'true')
        saa.lightning.init(saa.Tuulikartta.timeStamp)
      } else {
        saa.Tuulikartta.showCloudStrikes = false
        localStorage.setItem('showCloudStrikes', 'false')
        saa.lightning.init(saa.Tuulikartta.timeStamp)
      }
    })

    $('#lightning-interval').change(function () {
      saa.Tuulikartta.lightningInterval = this.value
      saa.lightning.init(saa.Tuulikartta.timeStamp)
    })

  })

}(saa.Tuulikartta = saa.Tuulikartta || {}))
