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

  saa.Tuulikartta.showStationObservations = true
  var showRoadObservations = false
  var showOldObservations = false
  saa.Tuulikartta.getLightningData = false
  var getTrafficCamData = false
  saa.Tuulikartta.showCloudStrikes = localStorage.getItem('showCloudStrikes') ? localStorage.getItem('showCloudStrikes') : true
  saa.Tuulikartta.lightningInterval = 5

  saa.Tuulikartta.radarLayer = ''
  saa.Tuulikartta.flashLayer = ''
  saa.Tuulikartta.velocityLayer = null
  saa.Tuulikartta.showWindParticles = false
  saa.Tuulikartta.windParticlesControlElement = null

  var radarLayerOpacity = localStorage.getItem('radarLayerOpacity') ? localStorage.getItem('radarLayerOpacity') : 80

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

          if (saa.Tuulikartta.getLightningData) {
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
      if (saa.Tuulikartta.getLightningData) {
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
      Tuulikartta.updateVelocityControlState(selectedParameter)

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
  // Populate info content element
  // ---------------------------------------------------------

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
    sidebar.setContent(Tuulikartta.populateSidebar(radarLayerOpacity))

    map.addControl(Tuulikartta.createSettingsControl(sidebar));
    map.addControl(Tuulikartta.createRadarControl());
    map.addControl(Tuulikartta.createLightningControl());
    map.addControl(Tuulikartta.createWindParticlesControl(function () { return selectedParameter }));
    Tuulikartta.updateVelocityControlState(selectedParameter)
    map.addControl(Tuulikartta.createTableControl());
    map.addControl(Tuulikartta.createInfoControl());
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
