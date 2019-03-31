/*
* Tuulikartta.info main class
* Copyright (C) 2017 Ville Ilkka
*/

var saa = saa || {};

(function (Tuulikartta, undefined) {
  'use strict'

  saa.Tuulikartta.data = []
  saa.Tuulikartta.debugvalue = false
  saa.Tuulikartta.timestamp = 'now'
  saa.Tuulikartta.markerGroupSynop = L.layerGroup()
  saa.Tuulikartta.markerGroupRoad = L.layerGroup()
  var emptymarker = []

  saa.Tuulikartta.graphIds = ""

  // observation update interval in ms
  var interval = 5*60000

  // geolocation
  var geoLocation

  // Set parameters to localstorage to remember previous state
  var latitude = localStorage.getItem('latitude') ? localStorage.getItem('latitude') : 60.630556
  var longtitude = localStorage.getItem('longtitude') ? localStorage.getItem('longtitude') : 24.859726
  var zoomlevel = localStorage.getItem('zoomlevel') ? localStorage.getItem('zoomlevel') : 8

  var selectedparameter = localStorage.getItem('selectedparameter') ? localStorage.getItem('longtitude') : 'ws_10min'
  var toggleDataSelect = 'close'
  var minRoadZoomLevel = 8

  // popup max width
  var maxWidth = 650
  var maxheight = 320

  Tuulikartta.debug = function (par) {
    if (Tuulikartta.debugvalue === true) {
      console.log(par)
    }
  }

  // ---------------------------------------------------------
  // Convert epoch time to properly formatted time string
  // ---------------------------------------------------------

  Tuulikartta.timeTotime = function (epoctime) {
    // convert epoc time to time stamp
    var d = new Date(epoctime * 1000)
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

  // ---------------------------------------------------------
  // Get observation data from getdata.php
  // ---------------------------------------------------------

  Tuulikartta.callData = function () {
    Tuulikartta.debug('Getting data... ')
    document.getElementById('data-loader').innerHTML = "Ladataan havaintoja... <img src='symbols/default.gif' style='width:20px;'></img>"
    document.body.style.cursor = 'wait'
    $.ajax({
      dataType: 'json',
      url: 'php/getdata.php',
      data: {
        time: saa.Tuulikartta.timestamp
      },
      error: function () {
        document.body.style.cursor = 'default'
        document.getElementById('data-loader').innerHTML = "Havaintoja ei saatu ladattua"
        Tuulikartta.debug('An error has occurred')
      },
      success: function (data) {
        document.body.style.cursor = 'default'
        Tuulikartta.debug('Done')
        // store the Map-instance in map variable
        saa.Tuulikartta.data = data
        Tuulikartta.clearMarkers()
        Tuulikartta.drawData($('#select-wind-parameter').val())
        selectedparameter = $('#select-wind-parameter').val()
        document.getElementById('data-loader').innerHTML = ''
      }
    })
  }

  // ---------------------------------------------------------
  //  Trigger buttons
  // ---------------------------------------------------------

  $(function bunttonFunctionalities () {
    
    var height = $('#gui-box').height();
    $('.leaflet-top').css({'margin-top': height + 20 + 'px'});
    window.addEventListener('resize', function(event){
        height = $('#gui-box').height() + 20;            
        $('.leaflet-top').css({'margin-top': height + 'px'});
    })

    // select wind parameter
    $('#select-wind-parameter').change(function () {
      Tuulikartta.clearMarkers()
      Tuulikartta.drawData($(this).val())
    })

    // close graph box
    $('#close-gr').on('click', function () {
      saa.weatherGraph.opengraphbox()
    })

    saa.Tuulikartta.map.on('popupopen', function(e) {
      Tuulikartta.debug('............................')

      var fmisid = e.popup._source.fmisid
      var type = e.popup._source.type
      Tuulikartta.debug('fmisid: '+e.popup._source.fmisid+', type: '+e.popup._source.type)
      if(type === 'Synop-asema') type = 'synop'
      if(type === 'Tiesääasema') type = 'road'
      // saa.Tuulikartta.timestamp = "graph" // to avoid data reload
      saa.weatherGraph.getObservationGraph(fmisid,type,saa.Tuulikartta.timestamp)
      $(".owl-carousel").owlCarousel({
        navigation: true, // Show next and prev buttons
        slideSpeed: 300,
        paginationSpeed: 400,
        items: 1,
        pagination: false
        // itemsDesktop : false,
        // itemsDesktopSmall : false,
        // itemsTablet: false,
        // itemsMobile : false
      });
    })
    
    saa.Tuulikartta.map.on('popupclose', function(e){
      saa.Tuulikartta.timestamp = "now"
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
    })

    // ---------------------------------------------------------
    // get observatinos with timestamp
    // ---------------------------------------------------------

    $('#select-content-datasearch').click(function () {
      var date = document.getElementById('datepicker-button').value
      var time = document.getElementById('clockpicker-button').value

      var timestring = moment(date + ' ' + time, ['DD-MM-YYYY HH:mm'])
      timestring = timestring.utc().format('YYYY-MM-DDTHH:mm:ss')
      timestring = timestring + 'Z'
      saa.Tuulikartta.timestamp = timestring

      Tuulikartta.debug('............................')
      Tuulikartta.debug(`Find observations from ${timestring}`)
      Tuulikartta.clearMarkers()
      saa.Tuulikartta.map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer && 'wmsParams' in layer) {
          layer.wmsParams.preventCache = Date.now()
          layer.setParams({time: saa.Tuulikartta.timestamp})
        }
      })
      saa.Tuulikartta.namelayer.bringToFront()
      Tuulikartta.callData()
    })

    $('#select-content-now').click(function () {
      saa.Tuulikartta.timestamp = 'now'

      Tuulikartta.debug('............................')
      Tuulikartta.debug('Get latest observations')
      Tuulikartta.clearMarkers()
      Tuulikartta.callData()

      Tuulikartta.debug(`Load latest radar data`)
      saa.Tuulikartta.map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer && 'wmsParams' in layer) {
          layer.wmsParams.preventCache = Date.now()
          layer.setParams({time: ''})
        }
      })
      saa.Tuulikartta.namelayer.bringToFront()
      Tuulikartta.debug('Done')
    })

    // ---------------------------------------------------------
    // progress and regress of time
    // ---------------------------------------------------------

    $('#timepicker-progress-time').click(function () {
      Tuulikartta.clearMarkers()

      var date = document.getElementById('datepicker-button').value
      var time = document.getElementById('clockpicker-button').value

      var time = moment(date + ' ' + time, ['DD-MM-YYYY HH:mm'])
      var newTime = moment(time).add(1, 'hours')

      var timestring = newTime.utc().format('YYYY-MM-DDTHH:mm:ss')
      timestring = timestring + 'Z'

      Tuulikartta.debug('............................')
      Tuulikartta.debug('Progress time')
      Tuulikartta.debug(`Find observations from ${timestring}`)

      var utcOffSet = moment(timestring).utcOffset()
      if (utcOffSet < 0) { newTime.subtrack(Math.abs(utcOffSet), 'minutes') }
      if (utcOffSet > 0) { newTime.add(Math.abs(utcOffSet), 'minutes') }

      document.getElementById('datepicker-button').value = newTime.format('DD.MM.YYYY')
      document.getElementById('clockpicker-button').value = newTime.format('HH:mm')

      saa.Tuulikartta.timestamp = timestring
      Tuulikartta.callData()

      Tuulikartta.debug(`Load radar data from ${saa.Tuulikartta.timestamp}`)
      saa.Tuulikartta.map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer && 'wmsParams' in layer) {
          layer.wmsParams.preventCache = Date.now()
          layer.setParams({time: saa.Tuulikartta.timestamp})
        }
      })
      saa.Tuulikartta.namelayer.bringToFront()
      Tuulikartta.debug('Done')
    })

    $('#timepicker-regress-time').click(function () {
      Tuulikartta.clearMarkers()

      var date = document.getElementById('datepicker-button').value
      var time = document.getElementById('clockpicker-button').value

      var time = moment(date + ' ' + time, ['DD-MM-YYYY HH:mm'])
      var newTime = moment(time).subtract(1, 'hours')

      var timestring = newTime.utc().format('YYYY-MM-DDTHH:mm:ss')
      timestring = timestring + 'Z'

      Tuulikartta.debug('............................')
      Tuulikartta.debug('Progress time')
      Tuulikartta.debug(`Find observations from ${timestring}`)

      var utcOffSet = moment(timestring).utcOffset()
      if (utcOffSet < 0) { newTime.subtrack(Math.abs(utcOffSet), 'minutes') }
      if (utcOffSet > 0) { newTime.add(Math.abs(utcOffSet), 'minutes') }

      document.getElementById('datepicker-button').value = newTime.format('DD.MM.YYYY')
      document.getElementById('clockpicker-button').value = newTime.format('HH:mm')

      saa.Tuulikartta.timestamp = timestring
      Tuulikartta.callData()

      Tuulikartta.debug(`Load radar data from ${saa.Tuulikartta.timestamp}`)
      saa.Tuulikartta.map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer && 'wmsParams' in layer) {
          layer.wmsParams.preventCache = Date.now()
          layer.setParams({time: saa.Tuulikartta.timestamp})
        }
      })
      saa.Tuulikartta.namelayer.bringToFront()
      Tuulikartta.debug('Done')
    })
  })

  // ---------------------------------------------------------
  // initialize Leaflet map and set geolocation
  // ---------------------------------------------------------

  Tuulikartta.initMap = function () {
    var endDate = new Date()
    var minutes = Math.floor(endDate.getUTCMinutes() / 5) * 5
    endDate.setUTCMinutes(minutes, 0, 0)
    var startDate = endDate - 3600 * 1000

    var lat = parseFloat(latitude)

    var lon = parseFloat(longtitude)

    var zoom = parseInt(zoomlevel)

    var map = L.map('map', {
      zoom: zoom,
      minZoom: 5,
      maxZoom: 12,
      fullscreenControl: true,
      timeDimension: false,
      timeDimensionControl: false,
      scrollWheelZoom: true,
      center: [lat, lon],
      timeDimensionControlOptions: {
        autoPlay: false,
        speedSlider: false,
        playerOptions: {
          buffer: 10,
          transitionTime: 2000,
          loop: true
        }
      },
      attribution: 'Tuulikartta.info'
    })

    saa.Tuulikartta.baselayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '<a href="https://www.tuulikartta.info">Tuulikartta.info</a>'
    }).addTo(map)

    saa.Tuulikartta.namelayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    }).addTo(map)

    saa.Tuulikartta.map = map
    Tuulikartta.initWMS()

    map.locate({ setView: false, maxZoom: 18 })
    map.on('locationfound', onLocationFound)
    map.on('locationerror', onLocationError)

    saa.Tuulikartta.map.on('overlayadd', function(e) {
      console.log(e)
      saa.Tuulikartta.namelayer.bringToFront()
    })
  }

  function onLocationFound (e) {
    var radius = e.accuracy / 2

    var icon = L.icon({
      iconUrl: '../symbols/blue-pushpin.png',
      iconSize: [32, 32], // size of the icon
      iconAnchor: [10, 32], // point of the icon which will correspond to marker's location
      popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
    })

    L.marker(e.latlng, { icon: icon }).addTo(saa.Tuulikartta.map)
    // L.circle(e.latlng, radius).addTo(saa.Tuulikartta.map);
    Tuulikartta.map.setView(e.latlng, 9, { animation: true })
  }

  function onLocationError (e) {
    Tuulikartta.debug(e.message)
    console.log('Error: The Geolocation service failed.')
  }

  Tuulikartta.initWMS = function () {
    var time = new Date()
    time.setHours(time.getHours() + Math.round(time.getMinutes() / 60))
    time.setMinutes(0)
    time.setSeconds(0)
    time.setMilliseconds(0)

    time = time.toISOString()

    var dataWMS = 'https://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/wms'
    var geosrvWMS = 'http://wms.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/geoserver/Radar/wms'

    var radar = L.tileLayer.wms(geosrvWMS, {
      layers: 'suomi_dbz_eureffin',
      format: 'image/png',
      tileSize: 2048,
      transparent: true,
      opacity: 0.7,
      version: '1.3.0',
      crs: L.CRS.EPSG3857,
      attribution: '<a href="https://www.tuulikartta.info">Tuulikartta.info</a>'
    })

    var flash5min = L.tileLayer.wms(dataWMS, {
      layers: 'fmi:observation:flashicon',
      format: 'image/png',
      tileSize: 2048,
      transparent: true,
      opacity: 0.8,
      version: '1.3.0',
      crs: L.CRS.EPSG3857,
      interval_start: 60,
      // timestep: 1,
      attribution: '<a href="https://www.tuulikartta.info">Tuulikartta.info</a>'
    })

    var overlayMaps = {
      'Tutka - Sateen intensiteetti': radar,
      '5min salamahavainnot': flash5min
    }

    L.control.layers(false, overlayMaps).addTo(saa.Tuulikartta.map)
  }

  // ---------------------------------------------------------
  //  catch location error message
  // ---------------------------------------------------------

  Tuulikartta.handleLocationError = function (browserHasGeolocation, pos) {
    geoLocation = 'false'
    console.log('Error: The Geolocation service failed.')
  }

  // ---------------------------------------------------------
  // Resolve wind speed and icon and  draw wind data
  // ---------------------------------------------------------

  Tuulikartta.resolveWindSpeed = function (windspeed) {
    windspeed = parseFloat(windspeed)
    if (windspeed < 1) { return 'calm' } else if (windspeed >= 1 && windspeed < 2) { return 'light' } else if (windspeed >= 2 && windspeed < 7) { return 'moderate' } else if (windspeed >= 7 && windspeed < 14) { return 'brisk' } else if (windspeed >= 14 && windspeed < 21) { return 'hard' } else if (windspeed >= 21 && windspeed < 25) { return 'storm' } else if (windspeed >= 25 && windspeed < 28) { return 'severestorm' } else if (windspeed >= 28 && windspeed < 32) { return 'extremestorm' } else if (windspeed >= 32) { return 'hurricane' } else { return 'calm' }
  }

  Tuulikartta.resolveWawaCode = function (wawa) {
    wawa = parseInt(wawa)
    if (wawa === 0) return {short:'Poutaa',long:'',class:'textLabelclassGrey', hex:'#7e7e7e'}
    if (wawa === 10) return {short:'Utu',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 20) return {short:'Sumu',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 21) return {short:'Sade',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#00b430'}
    if (wawa === 22) return {short:'Tihku',long:'',class:'textLabelclassBlackBackgroundYellow', hex:'#ffffb3'}
    if (wawa === 23) return {short:'Vesisade',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#00b430'}
    if (wawa === 24) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 25) return {short:'Jäätsade',long:'',class:'textLabelclassBlackBackgroundPurple', hex:'#ff80df'}
    if (wawa === 30) return {short:'Sumu',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 31) return {short:'Sumu',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 32) return {short:'Sumu',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 33) return {short:'Sumu',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 40) return {short:'Sade',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 41) return {short:'Sade',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 42) return {short:'Sade',long:'',class:'textLabelclassBlackBackgroundWhite', hex:'#ffffff'}
    if (wawa === 50) return {short:'Tihku',long:'',class:'textLabelclassBlackBackgroundYellow', hex:'#ffffb3'}
    if (wawa === 51) return {short:'Tihku',long:'',class:'textLabelclassBlackBackgroundYellow', hex:'#ffffb3'}
    if (wawa === 52) return {short:'Tihku',long:'',class:'textLabelclassBlackBackgroundYellow', hex:'#ffffb3'}
    if (wawa === 53) return {short:'Tihku',long:'',class:'textLabelclassBlackBackgroundYellow', hex:'#ffffb3'}
    if (wawa === 54) return {short:'Jäättihku',long:'',class:'textLabelclassBlackBackgroundPurple', hex:'#ff80df'}
    if (wawa === 55) return {short:'Jäättihku',long:'',class:'textLabelclassBlackBackgroundPurple', hex:'#ff80df'}
    if (wawa === 56) return {short:'Jäättihku',long:'',class:'textLabelclassBlackBackgroundPurple', hex:'#ff80df'}
    if (wawa === 60) return {short:'Vesisade',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#00b430'}
    if (wawa === 61) return {short:'Vesisade',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#00b430'}
    if (wawa === 62) return {short:'Vesisade',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#00b430'}
    if (wawa === 63) return {short:'Vesisade',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#00b430'}
    if (wawa === 64) return {short:'Jäätsade',long:'',class:'textLabelclassBlackBackgroundPurple', hex:'#ff80df'}
    if (wawa === 65) return {short:'Jäätsade',long:'',class:'textLabelclassBlackBackgroundPurple', hex:'#ff80df'}
    if (wawa === 66) return {short:'Jäätsade',long:'',class:'textLabelclassBlackBackgroundPurple', hex:'#ff80df'}
    if (wawa === 67) return {short:'Jäätsade',long:'',class:'textLabelclassBlackBackgroundPurple', hex:'#ff80df'}
    if (wawa === 68) return {short:'Räntä',long:'',class:'textLabelclassBlackBackgroundOrange', hex:'#ffbf80'}
    if (wawa === 70) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 71) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 72) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 73) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 74) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 75) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 76) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 77) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 78) return {short:'Lumisade',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#9cc3fc'}
    if (wawa === 80) return {short:'Sadekuuroja',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#6dff94'} 
    if (wawa === 81) return {short:'Vesikuuroja',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#6dff94'} 
    if (wawa === 82) return {short:'Vesikuuroja',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#6dff94'}
    if (wawa === 83) return {short:'Vesikuuroja',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#6dff94'}
    if (wawa === 84) return {short:'Vesikuuroja',long:'',class:'textLabelclassBlackBackgroundGreen', hex:'#6dff94'}
    if (wawa === 85) return {short:'Lumikuuroja',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#3d8bff'}
    if (wawa === 86) return {short:'Lumikuuroja',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#3d8bff'}
    if (wawa === 87) return {short:'Lumikuuroja',long:'',class:'textLabelclassBlackBackgroundBlue', hex:'#3d8bff'}
    if (wawa === 89) return {short:'Raesadetta',long:'',class:'textLabelclassBlackBackgroundYellow', hex:'#ffffb3'}
    else return null

  }

  Tuulikartta.resolveTemperature = function (temperature) {
    temperature = parseFloat(temperature)
    if (temperature < -30) return '#8a79f7'
    if (temperature >= -30 && temperature < -28) return '#8a79f7'
    if (temperature >= -28 && temperature < -26) return '#6e70e7'
    if (temperature >= -26 && temperature < -24) return '#5268d8'
    if (temperature >= -24 && temperature < -22) return '#3760c9'
    if (temperature >= -22 && temperature < -20) return '#1b58ba'
    if (temperature >= -20 && temperature < -18) return '#0050ab'
    if (temperature >= -18 && temperature < -16) return '#196bbe'
    if (temperature >= -16 && temperature < -14) return '#3286d1'
    if (temperature >= -14 && temperature < -12) return '#4ba1e4'
    if (temperature >= -12 && temperature < -10) return '#65dbf7'
    if (temperature >= -10 && temperature < -8) return '#77c8f8'
    if (temperature >= -8 && temperature < -6) return '#8ad3f9'
    if (temperature >= -6 && temperature < -4) return '#9cdefb'
    if (temperature >= -4 && temperature < -2) return '#afe9fc'
    if (temperature >= -2 && temperature < -1) return '#c1f4fd'
    if (temperature >= -1 && temperature < 0) return '#d4ffff'
    if (temperature >= 0 && temperature < 1) return '#05b38a'
    if (temperature >= 1 && temperature < 2) return '#02d495'
    if (temperature >= 2 && temperature < 4) return '#8aedbb'
    if (temperature >= 4 && temperature < 6) return '#ccffd0'
    if (temperature >= 6 && temperature < 8) return '#ebfccf'
    if (temperature >= 8 && temperature < 10) return '#ebff7a'
    if (temperature >= 10 && temperature < 12) return '#ffea80'
    if (temperature >= 12 && temperature < 14) return '#f7d423'
    if (temperature >= 14 && temperature < 16) return '#f5b400'
    if (temperature >= 16 && temperature < 18) return '#f29500'
    if (temperature >= 18 && temperature < 20) return '#f07400'
    if (temperature >= 20 && temperature < 22) return '#ff5324'
    if (temperature >= 22 && temperature < 24) return '#f71707'
    if (temperature >= 24 && temperature < 26) return '#db0a07'
    if (temperature >= 26 && temperature < 28) return '#bd0404'
    if (temperature >= 28 && temperature < 30) return '#000000'
    if (temperature > 30) return '#000000'
    return '#8aedbb'
  }

  Tuulikartta.resolveWindDirection = function (winddirection) {
    var winddir = parseFloat(winddirection)
    return (winddir + 180) % 360
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

  Tuulikartta.drawData = function (param) {
    var sizeofdata = parseInt(Object.keys(saa.Tuulikartta.data).length)
    saa.Tuulikartta.markerGroupSynop.addTo(saa.Tuulikartta.map)
    saa.Tuulikartta.markerGroupRoad.addTo(saa.Tuulikartta.map)

    // check zoom levels and hide road observations if needed
    if (saa.Tuulikartta.map.getZoom() < minRoadZoomLevel) {
      saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.markerGroupRoad)
    } else {
      saa.Tuulikartta.map.addLayer(saa.Tuulikartta.markerGroupRoad)
    }
    saa.Tuulikartta.map.on('zoomend', function () {
      if (saa.Tuulikartta.map.getZoom() < minRoadZoomLevel) {
        saa.Tuulikartta.map.removeLayer(saa.Tuulikartta.markerGroupRoad)
      } else {
        saa.Tuulikartta.map.addLayer(saa.Tuulikartta.markerGroupRoad)
      }
    })

    if (L.Browser.mobile) {
      maxWidth = 250
    }
    
    for (var i = 0; i < sizeofdata; i++) {
      var location = { lat: parseFloat(saa.Tuulikartta.data[i]['lat']), lng: parseFloat(saa.Tuulikartta.data[i]['lon']) }
      var time = Tuulikartta.timeTotime(saa.Tuulikartta.data[i]['epoctime'])
      var latlon = saa.Tuulikartta.data[i]['lat'] + ',' + saa.Tuulikartta.data[i]['lon']

      if (param == 'ws_10min' || param === 'wg_10min') {
        if (saa.Tuulikartta.data[i]['ws_10min'] !== null && saa.Tuulikartta.data[i]['wd_10min'] !== null && 
                        saa.Tuulikartta.data[i]['wg_10min'] !== null) {

          if (saa.Tuulikartta.data[i][param] < 10) { var iconAnchor = [30, 28] }
          if (saa.Tuulikartta.data[i][param] >= 10) { var iconAnchor = [25, 28] }

          var icon = L.icon({
            iconUrl: '../symbols/wind/' + saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param]) + '.svg',
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
          } else {saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i])
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          //marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
                    saa.Tuulikartta.data[i]['fmisid']),{
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

      if (param == 'ws_1h' || param === 'wg_1h') {
        if (saa.Tuulikartta.data[i]['ws_1h'] !== null && saa.Tuulikartta.data[i]['ws_max_dir'] !== null && saa.Tuulikartta.data[i]['wg_max_dir'] !== null &&  saa.Tuulikartta.data[i]['wg_1h'] !== null) {

          if (saa.Tuulikartta.data[i][param] < 10) { var iconAnchor = [30, 28] }
          if (saa.Tuulikartta.data[i][param] >= 10) { var iconAnchor = [25, 28] }

          var icon = L.icon({
            iconUrl: '../symbols/wind/' + saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param]) + '.svg',
            iconSize: [60, 60], // size of the icon
            iconAnchor: iconAnchor, // point of the icon which will correspond to marker's location
            popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
          })

          if (param == 'ws_1h') {
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
          } else {saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i])
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }

          //marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
                    saa.Tuulikartta.data[i]['fmisid']),{
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

      if (param === 'ri_10min') {
        if (saa.Tuulikartta.data[i]['ri_10min'] !== null && parseFloat(saa.Tuulikartta.data[i]['ri_10min']) > 0) {
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

      if (param === 'r_1h') {
        if (saa.Tuulikartta.data[i]['r_1h'] !== null) {
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

      if (param === 'temperature') {
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

        var icon = encodeURI('data:image/svg+xml,' + svgicon).replace('#', '%23')

        if (saa.Tuulikartta.data[i]['temperature'] !== null) {
          var icon = L.icon({
            // iconUrl: '../symbols/temperature.svg',
            iconUrl: icon,
            iconSize: [30, 30],
            iconAnchor: [40, 10],
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

          // marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
          saa.Tuulikartta.data[i]['fmisid']),{
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']

          var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
            {
              interactive: false,
              keyboard: false,
              icon: Tuulikartta.createLabelIcon(hex, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
            })

          if (saa.Tuulikartta.data[i]['type'] === 'road') {
            marker.addTo(saa.Tuulikartta.markerGroupRoad)
          } else {
            marker.addTo(saa.Tuulikartta.markerGroupSynop)
          }
        }
      }

      if (param === 'n_man') {

        if (saa.Tuulikartta.data[i]['n_man'] !== null) {
          var icon = L.icon({
            iconUrl: '../symbols/nn/' + saa.Tuulikartta.data[i][param] + '.svg',
            iconSize: [30, 30], // size of the icon
            iconAnchor: [15,15], // point of the icon which will correspond to marker's location
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

          // marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
          saa.Tuulikartta.data[i]['fmisid']),{
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']

          // var marker = L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'], saa.Tuulikartta.data[i]['lon']),
          //   {
          //     interactive: false,
          //     keyboard: false,
          //     icon: Tuulikartta.createLabelIcon(hex, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
          //   })

          // if (saa.Tuulikartta.data[i]['type'] === 'road') {
          //   marker.addTo(saa.Tuulikartta.markerGroupRoad)
          // } else {
          //   marker.addTo(saa.Tuulikartta.markerGroupSynop)
          // }
        }
      }


      if (param === 'visibility') {
        if (saa.Tuulikartta.data[i]['visibility'] !== null) {
          var labelClass = 'textLabelclassGrey'
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
              }).addTo(saa.Tuulikartta.markerGroupSynop)
          }

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
              }).addTo(saa.Tuulikartta.markerGroupSynop)
          }

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
          saa.Tuulikartta.data[i]['fmisid']),{
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
          if(code.short === 'Poutaa') {
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

          if(code.short === 'Poutaa') {
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
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]))
          marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i],
          saa.Tuulikartta.data[i]['fmisid']),{
            maxWidth: maxWidth
          })
          marker.fmisid = saa.Tuulikartta.data[i]['fmisid']
          marker.type = saa.Tuulikartta.data[i]['type']
        } 
      }
    }

    if (saa.Tuulikartta.timestamp === 'now') {
      for (var i = 0; i < sizeofdata; i++) {
        if (saa.Tuulikartta.data[i]['type'] === 'synop') {
	        var time = moment(saa.Tuulikartta.data[i]['time'], ['YYYY-MM-DDTHH:mm:ssZ'])
	        var timestring = time.format('DD.MM.YYYY HH:mm')
          document.getElementById('datepicker-button').value = timestring.split(' ')[0]
	        document.getElementById('clockpicker-button').value = timestring.split(' ')[1]
          break
        }
      }
    }
  }

  // ---------------------------------------------------------
  // populate infowindow with observations
  // ---------------------------------------------------------

  Tuulikartta.populateInfoWindow = function (data,fmisid) {
    var location = { lat: parseFloat(data['lat']), lng: parseFloat(data['lon']) }
    var time = Tuulikartta.timeTotime(data['epoctime'])
    var latlon = data['lat'] + ',' + data['lon']

    if (L.Browser.mobile) {
      maxWidth = 250
      // maxHeight = 320
    }

    if (data['type'] === 'synop') {
      var stationType = '<b>Aseman tyyppi:</b> <span id="station-type">Synop-asema</span> <br>'
    } else {
      var stationType = '<b>Aseman tyyppi:</b> <span id="station-type">Tiesääasema</span> <br>'
    }

    var output = '<div style="text-align:center;">'
    output += '<b>Havaintoasema: </b>' + data['station'] + '<br>'
    output += stationType

    if (saa.Tuulikartta.timestamp === 'now') { 
      output += '<b>Viimeisin havainto: </b>' + time + '<br>' 
    } else { 
      output += '<b>Havaintoaika: </b>' + time + '<br>' 
    }
    output += '</div>'
    
    output += `<div id="graph-box" style="width:${maxWidth}px;">`
    output += `<div id="owl-carousel-chart-${fmisid}" class="owl-carousel owl-theme">`
    output += `<div id="weather-chart-${fmisid}"></div>`
    output += `<div id="weather-chart-${fmisid}_alt"></div>`
    output += '</div>'
    output += `</div>`

    return output
  }

  // ---------------------------------------------------------
  // Cookie functions
  // https://quirksmode.org/js/cookies.html
  // ---------------------------------------------------------

  Tuulikartta.createCookie = function (name, value, days) {
    if (days) {
      var date = new Date()
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
      var expires = '; expires=' + date.toGMTString()
    } else var expires = ''
    document.cookie = name + '=' + value + expires + '; path=/'
  }

  Tuulikartta.readCookie = function (name) {
    var nameEQ = name + '='
    var ca = document.cookie.split(';')
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i]
      while (c.charAt(0) == ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  Tuulikartta.eraseCookie = function (name) {
    mMinClass.createCookie(name, '', -1)
  }

  Tuulikartta.updateRadarTime = function () {
    $.getJSON('php/radartime.php?layer=fmi:observation:radar:PrecipitationRate5min', function (result) {
      var starttime = result['starttime']
      var endtime = result['endtime']

      var time = new Date(endtime).getTime() / 1000
      var time = Tuulikartta.timeTotime(time)

      document.getElementById('available-radar').innerHTML = time
    })
  }

  // ---------------------------------------------------------
  // Update map icons and data with set interval
  // ---------------------------------------------------------

  setInterval(function () {
    if (saa.Tuulikartta.timestamp === 'now') {
      Tuulikartta.debug('............................')
      Tuulikartta.debug('Update data and draw markers')
      Tuulikartta.debug('Time now: ' + (new Date()).toUTCString())
      Tuulikartta.callData()
      // Tuulikartta.updateRadarTime();
      saa.Tuulikartta.map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer && 'wmsParams' in layer) {
          layer.wmsParams.preventCache = Date.now()
          layer.setParams({})
          saa.Tuulikartta.namelayer.bringToFront()
        }
      })
    }
  }, interval)
}(saa.Tuulikartta = saa.Tuulikartta || {}))
