/*
* Tuulikartta.info main class
* Copyright (C) 2017 Ville Oravilkka
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
  saa.Tuulikartta.selectedParameter = localStorage.getItem('selectedparameter') ? localStorage.getItem('longtitude') : 'ws_10min'
  saa.Tuulikartta.startPosition = 0
  var toggleDataSelect = 'close'
  var minRoadZoomLevel = 8

  saa.Tuulikartta.showStationObservations = true
  var showOldObservations = false
  saa.Tuulikartta.getLightningData = localStorage.getItem('showLightning') === 'true'
  saa.Tuulikartta.showCloudStrikes = localStorage.getItem('showCloudStrikes') ? localStorage.getItem('showCloudStrikes') : true
  saa.Tuulikartta.lightningInterval = 5
  saa.Tuulikartta.lightningControlElement = null
  saa.Tuulikartta.useWindBarbs = localStorage.getItem('useWindBarbs') === 'true'

  saa.Tuulikartta.radarLayer = ''
  saa.Tuulikartta.flashLayer = ''
  saa.Tuulikartta.velocityLayer = null
  saa.Tuulikartta.showWindParticles = localStorage.getItem('showWindParticles') === 'true'
  saa.Tuulikartta.windParticlesControlElement = null
  saa.Tuulikartta.divergenceLayer = null
  saa.Tuulikartta.showDivergence = localStorage.getItem('showDivergence') === 'true'

  saa.Tuulikartta.showRadar = localStorage.getItem('showRadar') === 'true'
  saa.Tuulikartta.radarControlElement = null
  saa.Tuulikartta.showLegend = localStorage.getItem('showLegend') === 'true'
  saa.Tuulikartta.legendControlElement = null
  saa.Tuulikartta.legendPanelElement = null

  saa.Tuulikartta.showObservationTable = localStorage.getItem('showObservationTable') === 'true'
  saa.Tuulikartta.tableControlElement = null

  saa.Tuulikartta.showSettingsSidebar = localStorage.getItem('showSettingsSidebar') === 'true'
  saa.Tuulikartta.sidebarControl = null

  saa.Tuulikartta.radarLayerOpacity = localStorage.getItem('radarLayerOpacity') ? localStorage.getItem('radarLayerOpacity') : 80

  Tuulikartta.debug = function (par) {
    if (Tuulikartta.debugvalue === true) {
      console.log(par)
    }
  }

  Tuulikartta.handleUrlParams = function (lat, lon, zoom, initParam, initTime) {
    latitude = lat
    longtitude = lon
    zoomlevel = zoom
    saa.Tuulikartta.selectedParameter = initParam

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

    var hash = '?lang=' + selectedLanguage + '#latlon=' + Math.round(lat * 100) / 100 + ',' + Math.round(lon * 100) / 100 + '#zoom=' + zoom + '#parameter=' + saa.Tuulikartta.selectedParameter

    if (saa.Tuulikartta.timeValue !== 'now') {
      hash += '#time=' + saa.Tuulikartta.timeValue
    }
    if (saa.Tuulikartta.showObservationTable) {
      hash += '#table=visible'
    }
    if (saa.Tuulikartta.showWindParticles) {
      hash += '#velocity=visible'
    }
    if (saa.Tuulikartta.showRadar) {
      hash += '#radar=visible'
    }
    if (saa.Tuulikartta.getLightningData) {
      hash += '#lightning=visible'
    }
    if (saa.Tuulikartta.showSettingsSidebar) {
      hash += '#settings=visible'
    }

    window.location.replace(hash)
  }

  // ---------------------------------------------------------
  // Meteogram dialog. Used instead of the popup on mobile screens and
  // opened from the link in the popup. The windrose is left out.
  // ---------------------------------------------------------

  Tuulikartta.isMobileScreen = function () {
    return L.Browser.mobile || window.matchMedia('(max-width: 768px)').matches
  }

  Tuulikartta.findStation = function (fmisid, type) {
    var data = saa.Tuulikartta.data || {}
    for (var key in data) {
      if (String(data[key]['fmisid']) === String(fmisid) && (!type || data[key]['type'] === type)) {
        return data[key]
      }
    }
    return null
  }

  Tuulikartta.openMeteogramDialog = function (fmisid, type) {
    var dialog = document.getElementById('meteogram-dialog')
    var station = Tuulikartta.findStation(fmisid, type)
    if (!dialog || !station) return

    var prefix = 'meteogram-chart-' + fmisid
    $('#meteogram-station-info').html(Tuulikartta.buildStationInfoHtml(station))
    $('#meteogram-charts').html(
      '<div id="' + prefix + '"></div>' +
      '<div id="' + prefix + '_alt"></div>' +
      '<div id="' + prefix + '_alt2"></div>'
    )

    // show the dialog before drawing, so the charts get the dialog width
    dialog.style.display = 'block'
    saa.weatherGraph.getObservationGraph(fmisid, type, saa.Tuulikartta.timeValue, {
      prefix: prefix,
      loader: '#meteogram-loader'
    })
  }

  Tuulikartta.closeMeteogramDialog = function () {
    var dialog = document.getElementById('meteogram-dialog')
    if (!dialog) return
    dialog.style.display = 'none'
    $('#meteogram-charts').html('')
    $('#meteogram-loader').html('')
  }

  // ---------------------------------------------------------
  // Show/hide the observation table modal and persist the state
  // ---------------------------------------------------------

  Tuulikartta.setObservationTableVisible = function (visible) {
    var modal = document.getElementById('modal-form')
    if (modal) {
      modal.style.display = visible ? 'block' : 'none'
    }

    saa.Tuulikartta.showObservationTable = visible
    localStorage.setItem('showObservationTable', visible)

    if (saa.Tuulikartta.tableControlElement) {
      $(saa.Tuulikartta.tableControlElement).toggleClass('active', visible)
    }

    Tuulikartta.updateUrlHash()
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

  // Loading indicator in the bottom left corner. Sources (observation data,
  // radar images, lightning) that start while others are still loading
  // form one batch, shown as a single "(loaded/total)" progress line.
  var activeLoads = {}
  var loadsStarted = 0
  var loadsDone = 0

  Tuulikartta.setLoading = function (source, isLoading) {
    if (isLoading && !activeLoads[source]) {
      activeLoads[source] = true
      loadsStarted++
    } else if (!isLoading && activeLoads[source]) {
      delete activeLoads[source]
      loadsDone++
    }

    var dataLoader = document.getElementById('data-loader')
    if (loadsDone >= loadsStarted) {
      loadsStarted = 0
      loadsDone = 0
      dataLoader.innerHTML = ''
      dataLoader.style.display = 'none'
      return
    }
    dataLoader.innerHTML = '<div class="loading-item"><span class="loading-spinner"></span>' +
      translations[selectedLanguage]['loadDatasets'] + ' (' + loadsDone + '/' + loadsStarted + ')</div>'
    dataLoader.style.display = 'block'
  }

  Tuulikartta.dataLoader = function (param) {
    Tuulikartta.setLoading('data', param)
    document.body.style.cursor = param ? 'wait' : 'default'
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
                saa.Tuulikartta.dataLoader(false)
                saa.Tuulikartta.map.spin(false)
              },
              success: function (data) {
                saa.Tuulikartta.dataLoader(false)
                saa.Tuulikartta.map.spin(false)
                // store the Map-instance in map variable
                saa.Tuulikartta.data = data
                saa.Tuulikartta.selectedParameter = $('#select-wind-parameter').val()
                saa.Tuulikartta.startPosition = Tuulikartta.resolveGraphStartposition(saa.Tuulikartta.selectedParameter)
                Tuulikartta.drawData(saa.Tuulikartta.selectedParameter)
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
            saa.Tuulikartta.dataLoader(false)
            saa.Tuulikartta.map.spin(false)
          },
          success: function (data) {
            saa.Tuulikartta.dataLoader(false)
            saa.Tuulikartta.map.spin(false)
            // store the Map-instance in map variable
            saa.Tuulikartta.data = data
            saa.Tuulikartta.selectedParameter = $('#select-wind-parameter').val()
            saa.Tuulikartta.startPosition = Tuulikartta.resolveGraphStartposition(saa.Tuulikartta.selectedParameter)
            Tuulikartta.drawData(saa.Tuulikartta.selectedParameter)
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
        saa.Tuulikartta.dataLoader(false)
        saa.Tuulikartta.map.spin(false)
      },
      success: function (data) {
        saa.Tuulikartta.dataLoader(false)
        saa.Tuulikartta.map.spin(false)
        // store the Map-instance in map variable
        saa.Tuulikartta.data = data
        saa.Tuulikartta.selectedParameter = $('#select-wind-parameter').val()
        saa.Tuulikartta.startPosition = Tuulikartta.resolveGraphStartposition(saa.Tuulikartta.selectedParameter)
        Tuulikartta.drawData(saa.Tuulikartta.selectedParameter)
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
  // Populate info content element
  // ---------------------------------------------------------

  Tuulikartta.populateInfoContent = function () {
    $('#site-info-body').html('')
    var dataInfoUrl = selectedLanguage === 'en' ? 'tietoa-sivustosta/en/' : 'tietoa-sivustosta/'
    var html = '<p style="line-height: 150%"><a href="' + dataInfoUrl + '">' + translations[selectedLanguage]["dataInfo"] + '</a></p>'
    html = html + '<p style="line-height: 150%">'
    html = html + '    <span style="color:#343434; font-weight:bold;">Tuulikartta.info</span>' + translations[selectedLanguage]["dataInfoBody1"] + '</br>'
    html = html + '    ' + translations[selectedLanguage]["dataInfoBody2"] + '</br>'
    html = html + '    ' + translations[selectedLanguage]["dataInfoBody3"] + '</a>'
    html = html + '</p>'
    html = html + '<p>' + translations[selectedLanguage]["feedback"] + ' <a href="mailto:tuulikartta@proton.me">tuulikartta@proton.me</a></p>'
    // html = html + '<p>' + translations[selectedLanguage]["dataInfoBody4"] + '</p>'

    $('#site-info-body').html(html)
  }

  // ---------------------------------------------------------
  // initialize Leaflet map and set geolocation
  // ---------------------------------------------------------

  Tuulikartta.initMap = function () {

    // station popups are replaced by the meteogram dialog on mobile screens,
    // so don't let them pan the map for the moment they are open
    if (Tuulikartta.isMobileScreen()) {
      L.Popup.prototype.options.autoPan = false
    }

    var lat = parseFloat(latitude)
    var lon = parseFloat(longtitude)
    var zoom = parseInt(zoomlevel)

    var map = L.map('map', {
      zoom: zoom,
      minZoom: 5,
      maxZoom: 12,
      scrollWheelZoom: true,
      center: [lat, lon],
      attribution: 'Tuulikartta.info'
    })

    var pmtilesProtocol = new pmtiles.Protocol()
    maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile)

    saa.Tuulikartta.baselayer = L.maplibreGL({
      style: 'https://tuulikartta-tiles.hel1.your-objectstorage.com/style.json',
      attribution: '<a href="https://www.tuulikartta.info">Tuulikartta.info</a> | © OpenStreetMap contributors | Protomaps'
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

    /* settings sidebar */
    var sidebar = L.control.sidebar('settings-sidebar', {
      position: 'left',
      autoPan: false
    })
    saa.Tuulikartta.sidebarControl = sidebar
    sidebar.on('show', function () {
      saa.Tuulikartta.showSettingsSidebar = true
      localStorage.setItem('showSettingsSidebar', 'true')
      Tuulikartta.updateUrlHash()
    })
    sidebar.on('hide', function () {
      saa.Tuulikartta.showSettingsSidebar = false
      localStorage.setItem('showSettingsSidebar', 'false')
      Tuulikartta.updateUrlHash()
    })
    map.addControl(sidebar);
    sidebar.setContent(Tuulikartta.populateSidebar(saa.Tuulikartta.radarLayerOpacity))

    map.addControl(Tuulikartta.createSettingsControl(sidebar));
    if (saa.Tuulikartta.showSettingsSidebar) {
      sidebar.show()
    }

    map.addControl(Tuulikartta.createRadarControl());
    if (saa.Tuulikartta.showRadar) {
      map.addLayer(saa.Tuulikartta.radarLayer)
      if (saa.Tuulikartta.radarControlElement) {
        $(saa.Tuulikartta.radarControlElement).addClass('active')
      }
    }

    map.addControl(Tuulikartta.createLightningControl());
    if (saa.Tuulikartta.getLightningData && saa.Tuulikartta.lightningControlElement) {
      $(saa.Tuulikartta.lightningControlElement).addClass('active')
    }

    map.addControl(Tuulikartta.createWindParticlesControl(function () { return saa.Tuulikartta.selectedParameter }));
    Tuulikartta.updateVelocityControlState(saa.Tuulikartta.selectedParameter)

    map.addControl(Tuulikartta.createTableControl());
    if (saa.Tuulikartta.showObservationTable) {
      Tuulikartta.setObservationTableVisible(true)
    }

    map.addControl(Tuulikartta.createLegendControl());
    Tuulikartta.setLegendVisible(saa.Tuulikartta.showLegend)

    map.addControl(Tuulikartta.createInfoControl());

    Tuulikartta.updateUrlHash()
  }

  Tuulikartta.initWMS = function () {
    var geosrvWMS = 'https://openwms.fmi.fi/geoserver/Radar/wms'

    saa.Tuulikartta.radarLayer = L.tileLayer.wms(geosrvWMS, {
      layers: 'suomi_dbz_eureffin',
      format: 'image/png',
      tileSize: 2048,
      transparent: true,
      opacity: saa.Tuulikartta.radarLayerOpacity / 100,
      time: saa.Tuulikartta.timeStamp,
      version: '1.3.0',
      crs: L.CRS.EPSG3857,
      attribution: '<a href="https://www.tuulikartta.info">Tuulikartta.info</a>'
    })

    saa.Tuulikartta.radarLayer.on('loading', function () {
      Tuulikartta.setLoading('radar', true)
    })
    saa.Tuulikartta.radarLayer.on('load remove', function () {
      Tuulikartta.setLoading('radar', false)
    })

    // L.control.layers(false, overlayMaps).addTo(saa.Tuulikartta.map)
  }

  Tuulikartta.resolveGraphStartposition = function (value) {
    if (value === 'ws_10min' || value === 'wg_10min' || value === 'ws_1d' || value === 'wg_1d')
      return 1
    else if (value === 'ri_10min' || value === 'ri_10min' || value === 'rr_1h' || value === 'rr_1d' || value === 't2m' || value === 'dewpoint' || value === 'tmax' || value === 'tmin' || value === 'wawa' || value === 'smartsymbol')
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
        }
      })
    }
  }, interval)
}(saa.Tuulikartta = saa.Tuulikartta || {}))
