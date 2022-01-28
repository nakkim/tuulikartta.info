/*
* Tuulikartta.info
* Copyright (C) 2017 Ville Ilkka
*/

var saa = saa || {};

(function(camera, undefined) {


  var now = moment(new Date()),
      stations = ''
      
  saa.camera.markers = L.markerClusterGroup({
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
        removeOutsideVisibleBounds: true,
        chunkedLoading: true,
        chunkInterval: 1000,
        maxClusterRadius: 100,
        disableClusteringAtZoom: 13,
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
          camera.draw(stations)
        }
      })
    })
  }

  camera.draw = function(data) {

    saa.camera.markers.clearLayers()

    console.log(data)
    for (var i = 0; i < Object.keys(data['features']).length; i++) {

      var diff = (moment.duration(now.diff(moment(data['features'][i]['latestUpdate'])))).asHours()
      var symbol = ''
      if (diff <= 0.16) {
        symbol = 'cameragre.svg' 
      } else if (diff > 0.16 && diff <= 1) {
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
      saa.camera.markers.addLayer(marker)
    }
    saa.Tuulikartta.map.addLayer(saa.camera.markers)
      
  }

}(saa.camera = saa.camera || {}));
