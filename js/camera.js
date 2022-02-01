/*
* Tuulikartta.info
* Copyright (C) 2017 Ville Ilkka
*/

var saa = saa || {};

(function(camera, undefined) {


  var now = moment(new Date()),
      stations = ''
      imageWidth = 600, // pixels
      maxWidth = 750

  saa.camera.markers = L.markerClusterGroup({
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: true,
        chunkedLoading: true,
        chunkInterval: 1000,
        maxClusterRadius: 100,
        disableClusteringAtZoom: 10,
        iconCreateFunction: function(cluster) {
          return L.divIcon({ html:
            '<div style="text-align:center; width:40px;font-size:13px;">'+
               '<img src="../symbols/cameragry.svg" style="width:50px;height:50px;margin-bottom:-7px">' +
               '<b>' + cluster.getChildCount() + '</b>' +
            '</div>'
          });
        }
      });

  camera.init = function() {
    
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
    var promise = $.get({
      dataType: 'json',
      url: '//tie.digitraffic.fi/api/v3/metadata/camera-stations',
      success: function (data) {
        stations = data
      }
    }).then(function(){
      $.get({
        url: '//tie.digitraffic.fi/api/v1/data/camera-data',
        success: function (data) {

          for (var i = 0; i < Object.keys(stations['features']).length; i++) {
            for (var k = 0; k < Object.keys(data['cameraStations']).length; k++) {
              
              if(data['cameraStations'][k]['id'] === stations['features'][i]['properties']['id']) {
                    var end = moment(data['cameraStations'][k]['cameraPresets'][0]['measuredTime']),
                    diff = (moment.duration(now.diff(end))).asHours();
                if(diff < 6 && data['cameraStations'][k]['cameraPresets'][0]['presentationName'] !== 'Tienpinta' ) {
                  stations['features'][i]['latestUpdate'] = data['cameraStations'][k]['cameraPresets'][0]['measuredTime']
                }
              }
            }
          }
          saa.Tuulikartta.map.spin(false)
          camera.draw(stations)
        }
      })
    })
  }

  camera.draw = function(data) {

    if (L.Browser.mobile) {
      maxWidth = 280
      imageWidth = 280
      // maxHeight = 320
    }

    $('#graph-box-loader').html("");
    saa.camera.markers.clearLayers()

    for (var i = 0; i < Object.keys(data['features']).length; i++) {

      var diff = (moment.duration(now.diff(moment(data['features'][i]['latestUpdate'])))).asMinutes()
      if(diff < 0) continue

      var symbol = ''
      if (diff >= 0 && diff <= 15) {
        symbol = 'cameragre.svg' 
      } else if (diff > 15 && diff <= 60) {
        symbol = 'camerayel.svg'
      } else {
        symbol = 'cameragry.svg'
      }

      var icon = L.icon({
        iconUrl: "../symbols/"+symbol,
        iconSize: [30, 30], // size of the icon
        iconAnchor: [5, 5], // point of the icon which will correspond to marker's location
        popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
      })

      var marker = L.marker([data['features'][i]['geometry']['coordinates'][1], data['features'][i]['geometry']['coordinates'][0]], 
        {
          icon: icon
        })
      marker.bindPopup(saa.camera.populateInfoWindow(data['features'][i]),{
        maxWidth: maxWidth
      })
      saa.camera.markers.addLayer(marker)
    }
    saa.Tuulikartta.map.addLayer(saa.camera.markers)
      
  }

  camera.populateInfoWindow = function(data) {

    var diff = Math.round((moment.duration(now.diff(moment(data['latestUpdate'])))).asMinutes())

    var output = '<div style="text-align:center;width:'+imageWidth+'px;">'
    output += '<div>'
    output += '<span id="station-update-cam-name""><b>'+translations[selectedLanguage]['cameraStationName']+':</b>: '+data['properties']['names']['fi']+'</span></br>'
    output += '<span id="station-update-cam-update" "><b>'+translations[selectedLanguage]['latestUpdate']+'</b>: '+diff+' '+translations[selectedLanguage]['minutesAgo']+'</span>'
    output += '</div>'

    output += '<div class="owl-carousel owl-theme">'
    for (var i = 0; i < Object.keys(data['properties']['presets']).length; i++) {
      output += '<div>'
      output += '<span><b>'+translations[selectedLanguage]['cameraName']+': </b>'+data['properties']['presets'][i]['presentationName']+'</span></br>'
      output += '<img src="'+data['properties']['presets'][i]['imageUrl']+'" style="width:'+imageWidth+'px;">'
      output += '</div>'
    }
    output += '</div>'


    return output
  }

}(saa.camera = saa.camera || {}));
