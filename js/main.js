/*
* Tuulikartta.info main class
* Copyright (C) 2017 Ville Ilkka
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  saa.Tuulikartta.data = []
  saa.Tuulikartta.debugvalue = false
  saa.Tuulikartta.timeValue = 'now'
  saa.Tuulikartta.timeStamp = ''
  saa.Tuulikartta.markerGroupSynop = L.layerGroup()
  saa.Tuulikartta.markerGroupRoad = L.layerGroup()
  var emptymarker = []
  var showForeignObservations = localStorage.getItem('foreignObservations') ? localStorage.getItem('foreigObservations') : false

  saa.Tuulikartta.graphIds = ""

  // observation update interval in ms
  var interval = 5 * 60000

  // geolocation
  var geoLocation

  // Set parameters to localstorage to remember previous state
  var latitude = localStorage.getItem('latitude') ? localStorage.getItem('latitude') : 65
  var longtitude = localStorage.getItem('longtitude') ? localStorage.getItem('longtitude') : 25
  var zoomlevel = localStorage.getItem('zoomlevel') ? localStorage.getItem('zoomlevel') : 8
  var observationSource = localStorage.getItem('observationSource') ? localStorage.getItem('observationSource') : 'Näytä vain synop-asemat'
  var selectedParameter = localStorage.getItem('selectedparameter') ? localStorage.getItem('longtitude') : 'ws_10min'
  var startPosition = 0
  var toggleDataSelect = 'close'
  var minRoadZoomLevel = 8

  var showStationObservations = true
  var showRoadObservations = false
  var showOldObservations = false
  var getLightningData = false
  var getTrafficCamData = false
  saa.Tuulikartta.showCloudStrikes = localStorage.getItem('showCloudStrikes') ? localStorage.getItem('showCloudStrikes') : true
  saa.Tuulikartta.lightningInterval = 5

  saa.Tuulikartta.radarLayer = ''
  saa.Tuulikartta.flashLayer = ''
  saa.Tuulikartta.velocityLayer = null
  var showWindParticles = false
  var windParticlesControlElement = null

  var radarLayerOpacity = localStorage.getItem('radarLayerOpacity') ? localStorage.getItem('radarLayerOpacity') : 80

  // popup max width
  var maxWidth = 650
  var maxheight = 320

  Tuulikartta.debug = function (par) {
    if (Tuulikartta.debugvalue === true) {
      console.log(par)
    }
  }

  Tuulikartta.handleUrlParams = function (lat, lon, zoom, initParam, initTime) {
    latitude = lat
    longtitude = lon
    zoomlevel = zoom
    selectedParameter = initParam

    if (initTime) {
      saa.Tuulikartta.timeValue = initTime
      saa.Tuulikartta.timeStamp = initTime

      // input fields are only created once the datepicker plugin's own
      // ready-handler has run (and defaulted them to "now"), so restore
      // them in a later-registered ready-handler to win the race
      $(function () {
        var localTime = moment.utc(initTime, 'YYYY-MM-DDTHH:mm:ssZ').local()
        document.getElementById('datepicker-button').value = localTime.format('DD.MM.YYYY')
        document.getElementById('clockpicker-button').value = localTime.format('HH:mm')
        $('#select-content-datasearch').removeClass('inactive')
        $('#select-content-now').addClass('inactive')
      })
    }
  }

  // ---------------------------------------------------------
  // Reflect current map/time state as a URL fragment
  // ---------------------------------------------------------

  Tuulikartta.updateUrlHash = function () {
    var lat = saa.Tuulikartta.map.getCenter().lat
    var lon = saa.Tuulikartta.map.getCenter().lng
    var zoom = saa.Tuulikartta.map.getZoom()

    var hash = '?lang=' + selectedLanguage + '#latlon=' + Math.round(lat * 100) / 100 + ',' + Math.round(lon * 100) / 100 + '#zoom=' + zoom + '#parameter=' + selectedParameter

    if (saa.Tuulikartta.timeValue !== 'now') {
      hash += '#time=' + saa.Tuulikartta.timeValue
    }

    window.location.replace(hash)
  }

  // ---------------------------------------------------------
  // Convert epoch time to properly formatted time string
  // ---------------------------------------------------------

  Tuulikartta.timeTotime = function (epochtime) {
    // convert epoc time to time stamp
    var d = new Date(epochtime * 1000)
    var hours = d.getHours()
    var minutes = d.getMinutes()
    // add leading zeros
    if (parseInt(hours) < 10) {
      hours = '0' + hours
    }
    if (parseInt(minutes) < 10) {
      minutes = '0' + minutes
    }
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + hours + ':' + minutes
  }

  Tuulikartta.dataLoader = function (param) {
    var dataLoader = document.getElementById('data-loader')
    dataLoader.innerHTML = translations[selectedLanguage]['loadObservations']
    if (param) {
      dataLoader.style.display = 'block'
      document.body.style.cursor = 'wait'
    } else {
      dataLoader.style.display = 'none'
      document.body.style.cursor = 'default'
    }
  }

  Tuulikartta.checkValidity = function (timestamp) {
    var time = moment.utc(timestamp, 'YYYYMMDDHHmmss', true);
    var difference = moment().diff(time, 'minutes');
    Tuulikartta.debug(`Difference: ${difference}`)
    if (difference < 18) {
      return true
    } else {
      return false
    }
  }

  // ---------------------------------------------------------
  // Get observation data
  // ---------------------------------------------------------

  Tuulikartta.callData = function () {
    saa.Tuulikartta.dataLoader(true)
    saa.Tuulikartta.map.spin(true, {
      lines: 14,
      length: 25,
      width: 27,
      radius: 80,
      scale: 0.35,
      corners: 1,
      speed: 1.4,
      animation: 'spinner-line-fade-quick',
      color: '#b1b1b1'
    })

    var observationFiles = $.get('list.php');

    $.when(observationFiles).done(function (a) {
      if (saa.Tuulikartta.timeValue === 'now') {
        // pick the last file from list.php if timetamp is valid
        Tuulikartta.debug('Get data as "now"')
        if (a.length > 0) {
          Tuulikartta.debug(`Found ${a.length} data files`)
          var time = (a[a.length - 1]).split('/')
          time = time[1]
          time = (time.split('.'))[0]
          if (Tuulikartta.checkValidity(time)) {
            Tuulikartta.debug(`Found data with a valid timestamp: ${time}`)
            $.ajax({
              dataType: 'json',
              url: a[a.length - 1],
              data: {},
              error: function () {
                document.body.style.cursor = 'default'
              },
              success: function (data) {
                saa.Tuulikartta.dataLoader(false)
                saa.Tuulikartta.map.spin(false)
                // store the Map-instance in map variable
                saa.Tuulikartta.data = data
                selectedParameter = $('#select-wind-parameter').val()
                startPosition = resolveGraphStartposition(selectedParameter)
                Tuulikartta.drawData(selectedParameter)
                Tuulikartta.populateObservationTable()
              }
            })
          } else {
            Tuulikartta.debug(`Did not found data with a valid timestamp`)
            Tuulikartta.requestData()
          }

        } else {
          Tuulikartta.debug(`No data files found`)
          Tuulikartta.requestData()
        }

      } else if (a.includes(`data/${moment.utc(saa.Tuulikartta.timeValue, 'YYYY-MM-DDTHH:mm:ssZ', true).format('YYYYMMDDHHmmss')}.json`)) {
        // check whether timestamp can be found from list.php files
        Tuulikartta.debug(`Get data with timestamp: ${saa.Tuulikartta.timeValue}`)
        var requestedTime = `data/${moment.utc(saa.Tuulikartta.timeValue, 'YYYY-MM-DDTHH:mm:ssZ', true).format('YYYYMMDDHHmmss')}.json`
        Tuulikartta.debug(`requestTime: ${requestedTime}`)
        $.ajax({
          dataType: 'json',
          url: requestedTime,
          data: {},
          error: function () {
            document.body.style.cursor = 'default'
          },
          success: function (data) {
            saa.Tuulikartta.dataLoader(false)
            saa.Tuulikartta.map.spin(false)
            // store the Map-instance in map variable
            saa.Tuulikartta.data = data
            selectedParameter = $('#select-wind-parameter').val()
            startPosition = resolveGraphStartposition(selectedParameter)
            Tuulikartta.drawData(selectedParameter)
            Tuulikartta.populateObservationTable()
          }
        })

      } else {
        // get data from backend
        Tuulikartta.debug('No data files found with a given timestamp')
        saa.Tuulikartta.requestData()
      }
    })
  }

  // ---------------------------------------------------------
  // Requestobservation data from getdata.php
  // ---------------------------------------------------------

  Tuulikartta.requestData = function () {
    $.ajax({
      dataType: 'json',
      url: 'php/getdata.php',
      data: {
        time: saa.Tuulikartta.timeValue
      },
      error: function () {
        document.body.style.cursor = 'default'
      },
      success: function (data) {
        saa.Tuulikartta.dataLoader(false)
        saa.Tuulikartta.map.spin(false)
        // store the Map-instance in map variable
        saa.Tuulikartta.data = data
        selectedParameter = $('#select-wind-parameter').val()
        startPosition = resolveGraphStartposition(selectedParameter)
        Tuulikartta.drawData(selectedParameter)
        Tuulikartta.populateObservationTable()
      }
    })
  }

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

  Tuulikartta.updateVelocityControlState = function () {
    var isVelocityParameter = Tuulikartta.isVelocityParameter(selectedParameter)

    if (windParticlesControlElement) {
      $(windParticlesControlElement).toggleClass('disabled', !isVelocityParameter)
    }

    if (!isVelocityParameter) {
      showWindParticles = false
      if (windParticlesControlElement) {
        $(windParticlesControlElement).removeClass('active')
      }
      if (saa.Tuulikartta.velocityLayer && saa.Tuulikartta.map && saa.Tuulikartta.map.hasLayer(saa.Tuulikartta.velocityLayer)) {
        saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.velocityLayer)
      }
      return
    }

    if (showWindParticles) {
      Tuulikartta.updateVelocityLayer()
    }
  }

  //
  // Update radar data timestamps
  //

  Tuulikartta.updateRadarData = function () {
    if (saa.Tuulikartta.timeValue === 'now') {
      $.ajax({
        dataType: 'json',
        url: 'php/dataparser.php',
        data: {
          name: 'suomi_dbz_eureffin',
          server: '//openwms.fmi.fi/geoserver/Radar/wms'
        },
        error: function (request, status, error) {
          console.log(request.responseText);
        },
        success: function (data) {
          var timeString = data['dimension']
          var timeArray = timeString.split('/')
          var endTime = moment.utc(timeArray[1]).toISOString()
          saa.Tuulikartta.timeStamp = endTime
          saa.Tuulikartta.radarLayer.setParams({ time: saa.Tuulikartta.timeStamp })
          Tuulikartta.callData()

          if (getLightningData) {
            saa.lightning.geoLayer.clearLayers()
            saa.lightning.init(endTime)
          }
          // if(getTrafficCamData) {
          //   saa.camera.markers.clearLayers()
          //   saa.camera.init()
          // }

        }
      })
    } else {
      Tuulikartta.callData()
      saa.Tuulikartta.radarLayer.setParams({ time: saa.Tuulikartta.timeStamp })
      if (getLightningData) {
        saa.lightning.geoLayer.clearLayers()
        saa.lightning.init(saa.Tuulikartta.timeStamp)
      }
    }

  }

  // ---------------------------------------------------------
  //  Trigger buttons
  // ---------------------------------------------------------

  $(function bunttonFunctionalities() {

    // select wind parameter
    $('#select-wind-parameter').change(function () {
      selectedParameter = $(this).val()
      startPosition = resolveGraphStartposition(selectedParameter)
      Tuulikartta.clearMarkers()
      Tuulikartta.drawData(selectedParameter)
      Tuulikartta.updateVelocityControlState()

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
        startPosition: startPosition
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
        showStationObservations = true
        saa.Tuulikartta.map.addLayer(saa.Tuulikartta.markerGroupSynop)
        if (showRoadObservations)
          saa.Tuulikartta.map.addLayer(saa.Tuulikartta.markerGroupRoad)
      } else {
        showStationObservations = false
        saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.markerGroupSynop)
        if (showRoadObservations)
          saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.markerGroupRoad)
      }
    })

    $('#road-observations').change(function () {
      if (this.checked == true) {
        if (showStationObservations == true) saa.Tuulikartta.markerGroupRoad.addTo(saa.Tuulikartta.map)
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
        radarLayerOpacity = this.value
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

  // ---------------------------------------------------------
  // Build observation menu and Populate info content element
  // ---------------------------------------------------------

  Tuulikartta.buildObservationMenu = function () {
    $('#main-navbar-param').html("")
    var html = '<select id="select-wind-parameter" class="select-style" style="height:26px;">'
    html = html + '<optgroup label="' + translations[selectedLanguage]["currentObs"] + '">'
    html = html + '<option value="ws_10min">' + translations[selectedLanguage]["ws_10min"] + '</option>'
    html = html + '<option value="wg_10min">' + translations[selectedLanguage]["wg_10min"] + '</option>'
    html = html + '<option value="ri_10min">' + translations[selectedLanguage]["ri_10min"] + '</option>'
    html = html + '<option value="rr_1h">' + translations[selectedLanguage]["rr_1h"] + '</option>'
    html = html + '<option value="t2m">' + translations[selectedLanguage]["t2m"] + '</option>'
    html = html + '<option value="t2mdewpoint">' + translations[selectedLanguage]["t2mdewpoint"] + '</option>'
    html = html + '<option value="dewpoint">' + translations[selectedLanguage]["dewpoint"] + '</option>'
    html = html + '<option value="vis">' + translations[selectedLanguage]["vis"] + '</option>'
    html = html + '<option value="wawa">' + translations[selectedLanguage]["wawa"] + '</option>'
    html = html + '<option value="n_man">' + translations[selectedLanguage]["n_man"] + '</option>'
    html = html + '<option value="snow_aws">' + translations[selectedLanguage]["snow_aws"] + '</option>'
    html = html + '<option value="pressure">' + translations[selectedLanguage]["pressure"] + '</option>'
    html = html + '<option value="rh">' + translations[selectedLanguage]["rh"] + '</option>'
    html = html + '<optgroup label="' + translations[selectedLanguage]["dailyObs"] + '">'
    html = html + '<option value="ws_1d">' + translations[selectedLanguage]["ws_1d"] + '</option>'
    html = html + '<option value="wg_1d">' + translations[selectedLanguage]["wg_1d"] + '</option>'
    html = html + '<option value="rr_1d">' + translations[selectedLanguage]["rr_1d"] + '</option>'
    html = html + '<option value="tmax">' + translations[selectedLanguage]["tmax"] + '</option>'
    html = html + '<option value="tmin">' + translations[selectedLanguage]["tmin"] + '</option>'

    html = html + '</select>'
    $('#main-navbar-param').html(html)
  }

  Tuulikartta.populateInfoContent = function () {
    $('#site-info-body').html('')
    var html = '<p style="line-height: 150%"><a href="tietoa-sivustosta/">' + translations[selectedLanguage]["dataInfo"] + '</a></p>'
    html = html + '<p style="line-height: 150%">'
    html = html + '    <span style="color:#343434; font-weight:bold;">Tuulikartta.info</span>' + translations[selectedLanguage]["dataInfoBody1"] + '</br>'
    html = html + '    ' + translations[selectedLanguage]["dataInfoBody2"] + '</br>'
    html = html + '    ' + translations[selectedLanguage]["dataInfoBody3"] + '</a>'
    html = html + '</p>'
    html = html + '<p>' + translations[selectedLanguage]["feedback"] + ' <a href="mailto:contact@tuulikartta.info">contact@tuulikartta.info</a></p>'
    html = html + '<p>' + translations[selectedLanguage]["dataInfoBody4"] + '</p>'

    $('#site-info-body').html(html)
  }

  Tuulikartta.populateObservationTable = function () {
    try {
      if (selectedLanguage === 'en')
        document.getElementById('observation-table-header').innerHTML = 'Weather observations'

      var columnConfigs = [
        {
          title: translations[selectedLanguage]['observationStation'],
          field: 'station',
          width: 200,
          widthShrink: 1
        },
        {
          title: translations[selectedLanguage]['observationTime'],
          field: 'time',
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var code = cell.getValue()
              if (code !== null) {
                var date = moment(code);
                return date.format('DD.MM.YYYY HH:mm')
              }
              return null
            } catch (e) {
              console.error('Error formatting observationTime:', e)
              return null
            }
          }
        },
        {
          title: translations[selectedLanguage]['wd_10min'],
          field: 'wd_10min',
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var value = cell.getValue();
              if (value !== null) {
                return `<img src="symbols/wind.svg" width="15" heigh="15" style="transform:rotate(${value}deg)"/> ${value}°`;
              }
              return value;
            } catch (e) {
              console.error('Error formatting wd_10min:', e)
              return null
            }
          }
        },
        {
          title: translations[selectedLanguage]['n_man'],
          field: 'n_man',
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var value = cell.getValue();
              if (value !== null) {
                return `<img src="symbols/nn/${value}.svg" width="15" heigh="15";/>`;
              }
              return value;
            } catch (e) {
              console.error('Error formatting n_man:', e)
              return null
            }
          }
        }
      ];

      var windSpeedFields = ['ws_10min', 'wg_10min', 'ws_1d', 'wg_1d'];
      var temperatureFields = ['t2m', 'tmax', 'tmin', 'dewpoint'];
      var precipitationFields = ['ri_10min', 'rr_1h', 'rr_1d'];
      var otherNumericFields = {
        'vis': {
          resolver: null,
          validator: function (value) { return value !== null; },
          colorizer: function (value) {
            if (value > 1000 && value <= 2000) {
              return 'rgba(1,1,1,0.15)';
            } else if (value < 1000) {
              return 'rgba(224,7,0,0.4)';
            }
            return 'rgba(1,1,1,0)';
          },
          formatter: function (value) { return value; }
        },
        'wawa': {
          resolver: Tuulikartta.resolveWawaCode,
          validator: function (code) { return code !== null; },
          colorizer: function (code) {
            if (code.short === 'Utu' || code.short === 'Sumu' || code.short === 'Haze' || code.short === 'Fog') {
              return 'rgba(1,1,1,0.15)';
            }
            return Tuulikartta.hexToRgbA(code.hex, 0.4);
          },
          formatter: function (code) { return code.short; }
        },
        'rh': {
          resolver: null,
          validator: function (value) { return value !== null; },
          colorizer: function (value) { return Tuulikartta.hexToRgbA(Tuulikartta.resolveRelativeHumidity(value), 0.4); },
          formatter: function (value) { return (value).toFixed(1); }
        },
        'snow_aws': {
          resolver: null,
          validator: function (value) { return value !== null && value > -1; },
          colorizer: function (value) { return Tuulikartta.hexToRgbA(Tuulikartta.resolveSnowDepth(value), 0.4); },
          formatter: function (value) { return value; }
        },
        'pressure': {
          resolver: null,
          validator: function (value) { return value !== null; },
          colorizer: function (value) { return Tuulikartta.hexToRgbA(Tuulikartta.resolvePressure(value), 0.4); },
          formatter: function (value) { return (value).toFixed(1); }
        }
      };

      var createWindSpeedColumn = function (field) {
        return {
          title: translations[selectedLanguage][field],
          field: field,
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var code = Tuulikartta.resolveWindSpeed(cell.getValue())
              if (code !== null) {
                cell.getElement().style.backgroundColor = Tuulikartta.hexToRgbA(code.hex, 0.7);
                return cell.getValue()
              }
              return null
            } catch (e) {
              console.error('Error formatting wind speed field ' + field + ':', e)
              return null
            }
          }
        };
      };

      var createTemperatureColumn = function (field) {
        return {
          title: translations[selectedLanguage][field],
          field: field,
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var value = cell.getValue()
              if (value !== null) {
                if (field !== 't2m' && Math.abs(value) >= 100) {
                  cell.getElement().style.backgroundColor = 'rgba(1,1,1,0)'
                  return null
                }
                cell.getElement().style.backgroundColor = Tuulikartta.hexToRgbA(Tuulikartta.resolveTemperature(value), 0.4);
                return value
              }
              cell.getElement().style.backgroundColor = 'rgba(1,1,1,0)'
              return null
            } catch (e) {
              console.error('Error formatting temperature field ' + field + ':', e)
              return null
            }
          }
        };
      };

      var createPrecipitationColumn = function (field) {
        return {
          title: translations[selectedLanguage][field],
          field: field,
          hozAlign: "center",
          formatter: function (cell) {
            try {
              if (cell.getValue() !== null) {
                cell.getElement().style.backgroundColor = Tuulikartta.hexToRgbA(Tuulikartta.resolvePrecipitationAmount(cell.getValue()), 0.4);
                return cell.getValue()
              }
              cell.getElement().style.backgroundColor = 'rgba(1,1,1,0)'
              return null
            } catch (e) {
              console.error('Error formatting precipitation field ' + field + ':', e)
              return null
            }
          }
        };
      };

      var createSpecialColumn = function (field, config) {
        return {
          title: translations[selectedLanguage][field],
          field: field,
          hozAlign: "center",
          formatter: function (cell) {
            try {
              var value = cell.getValue()
              var resolvedValue = config.resolver ? config.resolver(value) : value

              if (config.validator(resolvedValue)) {
                cell.getElement().style.backgroundColor = config.colorizer(resolvedValue);
                return config.formatter(resolvedValue)
              }
              cell.getElement().style.backgroundColor = 'rgba(1,1,1,0)'
              return null
            } catch (e) {
              console.error('Error formatting special field ' + field + ':', e)
              return null
            }
          }
        };
      };

      columnConfigs = columnConfigs.concat(windSpeedFields.map(createWindSpeedColumn));
      columnConfigs = columnConfigs.concat(temperatureFields.map(createTemperatureColumn));
      columnConfigs = columnConfigs.concat(precipitationFields.map(createPrecipitationColumn));
      Object.keys(otherNumericFields).forEach(function (field) {
        columnConfigs.push(createSpecialColumn(field, otherNumericFields[field]));
      });

      var table = new Tabulator("#observation-table", {
        layout: "fitDataStretch",
        columns: columnConfigs
      });
      table.setData(saa.Tuulikartta.data)
    } catch (e) {
      console.error('Error in populateObservationTable:', e)
    }
  }

  // ---------------------------------------------------------
  // initialize Leaflet map and set geolocation
  // ---------------------------------------------------------

  Tuulikartta.initMap = function () {

    var lat = parseFloat(latitude)
    var lon = parseFloat(longtitude)
    var zoom = parseInt(zoomlevel)

    var map = L.map('map', {
      zoom: zoom,
      minZoom: 5,
      maxZoom: 16,
      scrollWheelZoom: true,
      center: [lat, lon],
      attribution: 'Tuulikartta.info'
    })

    saa.Tuulikartta.baselayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '<a href="https://www.tuulikartta.info">Tuulikartta.info</a>'
    }).addTo(map)

    saa.Tuulikartta.namelayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    }).addTo(map)

    saa.Tuulikartta.map = map
    Tuulikartta.initWMS()

    // remove default zoomcontrol and add a new one with custom titles
    map.zoomControl.remove()
    L.control.zoom({ zoomInTitle: translations[selectedLanguage]['zoomIn'], zoomOutTitle: translations[selectedLanguage]['zoomOut'] }).addTo(map)

    L.control.locate({
      drawCircle: false,
      showCompass: false,
      locateOptions: {
        maxZoom: 9,
        enableHighAccuracy: true
      },
      icon: 'fas fa-map-marker-alt',
      showPopup: false,
      strings: {
        title: translations[selectedLanguage]['geolocation']
      }
    }).addTo(map);

    saa.Tuulikartta.map.on('overlayadd', function (e) {
      saa.Tuulikartta.namelayer.bringToFront()
    })

    /* settings sidebar */
    var sidebar = L.control.sidebar('settings-sidebar', {
      position: 'left',
      autoPan: false
    })
    map.addControl(sidebar);
    sidebar.setContent(populateSidebar())

    /* settings control */
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
    map.addControl(new customControl());

    /* radar control */
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
    map.addControl(new radarControl());

    /* lightning control */
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
            getLightningData = false
            saa.lightning.geoLayer.clearLayers()
          } else {
            saa.lightning.init(saa.Tuulikartta.timeStamp)
            saa.Tuulikartta.map.addLayer(saa.lightning.geoLayer)
            $(this).addClass('active')
            getLightningData = true
          }
          saa.Tuulikartta.updateRadarData()
        }
        container.title = translations[selectedLanguage]['lightningTitle']
        return container
      }
    })
    map.addControl(new lightningControl());

    /* wind particles control */
    var windParticlesControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create(
          'div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-select-wind-particles'
        )
        windParticlesControlElement = container
        container.onclick = function () {
          if (!Tuulikartta.isVelocityParameter(selectedParameter)) {
            return
          }

          if (showWindParticles) {
            showWindParticles = false
            $(this).removeClass('active')
            if (saa.Tuulikartta.velocityLayer) {
              saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.velocityLayer)
            }
          } else {
            showWindParticles = true
            $(this).addClass('active')
            Tuulikartta.updateVelocityLayer()
          }
        }
        container.title = translations[selectedLanguage]['windParticlesTitle']
        return container
      }
    })
    map.addControl(new windParticlesControl());
    Tuulikartta.updateVelocityControlState()

    /* radar control */
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
    map.addControl(new tableDataControl());

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
    map.addControl(new infoControl());
  }

  function populateSidebar() {
    var html = ""
    html += '<div class="sidebar-container">'
    html += '<h1>' + translations[selectedLanguage]['settings'] + '</h1>'
    html += '<input id="show-observations" type="checkbox" checked> ' + translations[selectedLanguage]['showObservations']
    html += '<br/>'
    html += '<input id="road-observations" type="checkbox" disabled> ' + translations[selectedLanguage]['roadObs']
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

  Tuulikartta.updateVelocityLayer = function () {
    if (!showWindParticles) return

    var windData = Tuulikartta.buildWindVelocityData(selectedParameter)
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

  Tuulikartta.initWMS = function () {
    var geosrvWMS = 'https://openwms.fmi.fi/geoserver/Radar/wms'

    saa.Tuulikartta.radarLayer = L.tileLayer.wms(geosrvWMS, {
      layers: 'suomi_dbz_eureffin',
      format: 'image/png',
      tileSize: 2048,
      transparent: true,
      opacity: radarLayerOpacity / 100,
      time: saa.Tuulikartta.timeStamp,
      version: '1.3.0',
      crs: L.CRS.EPSG3857,
      attribution: '<a href="https://www.tuulikartta.info">Tuulikartta.info</a>'
    })

    // L.control.layers(false, overlayMaps).addTo(saa.Tuulikartta.map)
  }

  Tuulikartta.createLabelIcon = function (labelClass, labelText) {
    return L.divIcon({
      iconSize: null,
      className: labelClass,
      iconAnchor: [10, 7],
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

    if (!showStationObservations) return false
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

          var icon = L.icon({
            iconUrl: '../symbols/wind/' + (saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param])).code + '.svg',
            iconSize: [60, 60], // size of the icon
            iconAnchor: iconAnchor, // point of the icon which will correspond to marker's location
            popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
          })

          var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
            {
              icon: icon,
              rotationAngle: Tuulikartta.resolveWindDirection(saa.Tuulikartta.data[i]['wd_10min']),
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
              icon: Tuulikartta.createLabelIcon('textLabelclass', parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
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

          var icon = L.icon({
            iconUrl: '../symbols/wind/' + (saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param])).code + '.svg',
            iconSize: [60, 60], // size of the icon
            iconAnchor: iconAnchor, // point of the icon which will correspond to marker's location
            popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
          })

          if (param == 'ws_1d') {
            var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
              {
                icon: icon,
                rotationAngle: Tuulikartta.resolveWindDirection(saa.Tuulikartta.data[i]['ws_max_dir']),
                rotationOrigin: 'center center'
              })
          } else {
            var marker = L.marker([saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']],
              {
                icon: icon,
                rotationAngle: Tuulikartta.resolveWindDirection(saa.Tuulikartta.data[i]['wg_max_dir']),
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
              icon: Tuulikartta.createLabelIcon('textLabelclass', parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
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

    Tuulikartta.updateVelocityLayer()
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

  function resolveGraphStartposition(value) {
    if (value === 'ws_10min' || value === 'wg_10min' || value === 'ws_1d' || value === 'wg_1d')
      return 1
    else if (value === 'ri_10min' || value === 'ri_10min' || value === 'rr_1h' || value === 'rr_1d' || value === 't2m' || value === 'dewpoint' || value === 'tmax' || value === 'tmin' || value === 'wawa')
      return 2
    else if (value === 'vis' || value === 'n_man')
      return 3
    else
      return 1
  }

  // ---------------------------------------------------------
  // Update map icons and data with set interval
  // ---------------------------------------------------------

  setInterval(function () {
    if (saa.Tuulikartta.timeValue === 'now') {
      Tuulikartta.updateRadarData()
      saa.Tuulikartta.map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer && 'wmsParams' in layer) {
          layer.setParams({})
          saa.Tuulikartta.namelayer.bringToFront()
        }
      })
    }
  }, interval)
}(saa.Tuulikartta = saa.Tuulikartta || {}))
