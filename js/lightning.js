/*
* Tuulikartta.info
* Copyright (C) 2017 Ville Ilkka
*/

var saa = saa || {};

(function(lightning, undefined) {

  var timePeriod;
  saa.lightning.geoLayer = L.layerGroup()

  saa.lightning.init = function (timeString, interval) {

    var timeArray = timeString.split('/')
    var time = moment.utc(timeString).toISOString()

    saa.Tuulikartta.dataLoader(true)
    $.ajax({
      dataType: 'json',
      data: {
        time: time,
        interval: saa.Tuulikartta.lightningInterval
      },
      url: 'php/lightning.php',
      error: function () {
        console.log('error')
      },
      success: function (data) {
        // console.log(data)
      },
      complete: function (data) {
        saa.Tuulikartta.dataLoader(false)
        var data = data.responseJSON
        saa.lightning.drawData(data)
      }
    })
  }

  saa.lightning.drawData = function(data) {

    saa.lightning.geoLayer.clearLayers()

    var groundLightningStyle = {
      radius: 4, 
      fillColor: 'red', 
      fillOpacity: 0.7, 
      stroke: true,
      weight: 1,
      opacity: 0.8,
      color: 'black',
      interactive: false
    };

    var cloudLightningStyle = {
      radius: 3, 
      fillColor: 'violet', 
      fillOpacity: 0.6, 
      stroke: true,
      weight: 1,
      opacity: 0.5,
      color: 'black',
      interactive: false
    };
    
    var customLayerGround = L.geoJson(data[0], {
      pointToLayer: function (feature, latlng) {
          return L.circleMarker(latlng, groundLightningStyle);
      }
    }).addTo(saa.lightning.geoLayer)

    if(saa.Tuulikartta.showCloudStrikes == true) {
      var customLayerCloud = L.geoJson(data[1], {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, cloudLightningStyle);
        }
      }).addTo(saa.lightning.geoLayer)
    }
    saa.lightning.geoLayer.addTo(saa.Tuulikartta.map)

  }

}(saa.lightning = saa.lightning || {}));
