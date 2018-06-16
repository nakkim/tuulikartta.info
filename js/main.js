/*
* Tuulikartta.info main class
* Copyright (C) 2017 Ville Ilkka
*/

var saa = saa || {};

(function(Tuulikartta, undefined)
{

    'use strict';   

    // var emptydata;
    // var emptymap;
    // var emptyradar;

    saa.Tuulikartta.debugvalue = false;
    var emptymarker = [];

    // observation update interval in ms
    var interval = 60000;

    // geolocation
    var geoLocation;

    // Set parameters to localstorage to remember previous state
    var latitude    = localStorage.getItem("latitude") ? localStorage.getItem("latitude") : 60.630556;
    var longtitude  = localStorage.getItem("longtitude") ? localStorage.getItem("longtitude") : 24.859726;
    var zoomlevel   = localStorage.getItem("zoomlevel") ? localStorage.getItem("zoomlevel") : 8;

    var selectedparameter = localStorage.getItem("selectedparameter") ? localStorage.getItem("longtitude") : "ws_10min";
    var toggleDataSelect = "closed";



    Tuulikartta.debug = function(par) {
        if (Tuulikartta.debugvalue === true) {
            console.log(par);
        }
    }


    // ---------------------------------------------------------
    // Wind classes
    // http://ilmatieteenlaitos.fi/tuulet
    // ---------------------------------------------------------

    var severity = ['white', // 2-3
        '#e6f7ff', // 3-4
        '#ccffcc', // 4-5     kohtalaista
        '#ccffcc', // 5-6
        '#ccffcc', // 6-7
        '#ffff99', // 7-8     navakkaa
        '#ffff99', // 8-9
        '#ffff99', // 9-10
        '#ffff99', // 10-11
        '#ffff99', // 11-12
        '#ffff99', // 12-13
        '#ffff99', // 13-14
        '#ffcc00', // 14-15   kovaa
        '#ffcc00', // 15-16
        '#ffcc00', // 16-17
        '#ffcc00', // 17-18
        '#ffcc00', // 18-19
        '#ffcc00', // 18-19
        '#ffcc00', // 19-20
        '#ffcc00', // 21-21
        '#ff3300', // 21-22   myrskyä
        '#ff3300', // 22-23
        '#ff3300', // 23-24
        '#ff3300', // 24-25
        '#ff0066', // 25-26   kovaa myrskyä
        '#ff0066', // 26-27
        '#ff0066', // 27-28
        '#cc0099', // 28-29   ankaraa myrskyä
        '#cc0099', // 29-30
        '#cc0099', // 30-31
        '#cc0099', // 31-32
        '#6600cc', // 32-     hirmumyrskyä
    ];




    // ---------------------------------------------------------
    // Convert epoch time to properly formatted time string
    // ---------------------------------------------------------

    Tuulikartta.timeTotime = function(epoctime) {
        // convert epoc time to time stamp
        var d = new Date(0);
        d.setUTCSeconds(epoctime);
        var hours = d.getHours();
        var minutes = d.getMinutes();
        // add leading zeros
        if (parseInt(hours) < 10) {
            hours = '0' + hours;
        }
        if (parseInt(minutes) < 10) {
            minutes = '0' + minutes;
        }
        return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear() + " " + hours + ":" + minutes;
    }




    // ---------------------------------------------------------
    // Get observation data from getdata.php
    // ---------------------------------------------------------

    Tuulikartta.callData = function() {
        Tuulikartta.debug('Getting data... ');
        $.ajax({
            dataType: "json",
            url: 'php/getdata.php',
            data: {},
            error: function () {
                Tuulikartta.debug('An error has occurred');
            },
            success: function (data) {
                Tuulikartta.debug('Done');
                // store the Map-instance in map variable
                saa.Tuulikartta.data = data;
                Tuulikartta.drawWind(saa.Tuulikartta.map, saa.Tuulikartta.data, selectedparameter);
                selectedparameter = $("#select-wind-parameter").val();
                //Tuulikartta.draw(selectedparameter, saa.Tuulikartta.map, saa.Tuulikartta.data);
            }
        });
    }




    // ---------------------------------------------------------
    //  Trigger buttons
    // ---------------------------------------------------------

    $(function bunttonFunctionalities() {

        //select wind parameter and display a short info text
        $("#select-wind-parameter").change(function () {
            Tuulikartta.drawWind(saa.Tuulikartta.map, saa.Tuulikartta.data, $(this).val());
        });

        // close graph box
        $('#close-gr').on('click', function () {
            Tuulikartta.opengraphbox();
        });

        // select observations dialog 
        var obsValues = !!Tuulikartta.readCookie('observation_values_hidden');
        $("#data-content-select").dialog({
            position: { my: 'bottom+90', at: 'left+182' },
            autoOpen: !obsValues,
            close: function () {
                Tuulikartta.createCookie('observation_values_hidden', 'true', 7);
            }
        });

        $("#dialog-opener").click(function () {
            if (!$("#data-content-select").dialog("isOpen")) {
                $("#data-content-select").dialog("open");
            } else {
                $("#data-content-select").dialog("close");
            }
        });

        // draw radar layer again when selected radar layer changes
        $("#select-radar-parameter").change(function () {
            Tuulikartta.updateRadarData(saa.Tuulikartta.map);
        });

    });



    
    // ---------------------------------------------------------
    // initialize Google Map and set geolocation 
    // ---------------------------------------------------------

    Tuulikartta.initMap = function() {
        Tuulikartta.debug('Initializing map... ');
        var lat = parseFloat(latitude),
            lon = parseFloat(longtitude),
            zoom = parseInt(zoomlevel);
        var centerpoint = { lat: lat, lng: lon };
        var map = new google.maps.Map(document.getElementById('map'), {
            zoom: zoom,
            minZoom: 6,
            maxZoom: 10,
            styles: mapstyle,
            center: centerpoint,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false
        });
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(pos);
                // add pin to use location
                // https://sites.google.com/site/gmapsdevelopment/
                var base = 'https://maps.gstatic.com/mapfiles/ridefinder-images/';
                var marker = new google.maps.Marker({
                    position: pos,
                    map: map,
                    icon: 'symbols/blue-pushpin.png'
                });
            }, function () {
                Tuulikartta.handleLocationError(true, map.getCenter());
            });
        } else {
            // Browser doesn't support Geolocation
            Tuulikartta.handleLocationError(false, map.getCenter());
        }

        Tuulikartta.debug('Done');
        saa.Tuulikartta.map = map;
        Tuulikartta.updateLocation(map);
        Tuulikartta.updateRadarData(map);

        return map;
    }




    // ---------------------------------------------------------
    //  catch location error message
    // ---------------------------------------------------------

    Tuulikartta.handleLocationError = function(browserHasGeolocation, pos) {
        geoLocation = 'false';
        console.log('Error: The Geolocation service failed.');
    }




    // ---------------------------------------------------------
    // Get and save user location to localstorage
    // geolocation overrides this option
    // ---------------------------------------------------------

    Tuulikartta.updateLocation = function(map) {
        google.maps.event.addListener(map, "bounds_changed", function () {
            var lat = map.getCenter().lat();
            var lon = map.getCenter().lng();
            var zoom = map.getZoom();
            localStorage.setItem("latitude", lat);
            localStorage.setItem("longitude", lon);
            localStorage.setItem("zoomlevel", zoom);
        });
    }




    // ---------------------------------------------------------
    // draw wind data
    // ---------------------------------------------------------

    Tuulikartta.drawWind = function(map, data, param) {

        // remove all old markers
        for (var i = 0; i < emptymarker.length; i++) {
            emptymarker[i].setMap(null);
        }
        emptymarker.length = 0;

        var sizeofdata = parseInt(Object.keys(data).length);
        var valid = 0;
        for (i = 0; i < sizeofdata; i++) {
            var location = { lat: parseFloat(data[i]['lat']), lng: parseFloat(data[i]['lon']) };
            var time = Tuulikartta.timeTotime(data[i]['epoctime']);
            var latlon = data[i]["lat"] + ',' + data[i]["lon"];
            if (data[i]['ws_10min'] !== 'NaN' && data[i]['wd_10min'] !== 'NaN' && data[i]['wg_10min'] !== 'NaN') {
                valid++;
                if (param == 'ws_10min') {
                    var text = data[i]['ws_10min'];
                    var color = severity[Math.floor(data[i]['ws_10min'])];
                }
                if (param == 'wg_10min') {
                    var text = data[i]['wg_10min'];
                    var color = severity[Math.floor(data[i]['wg_10min'])];
                }
                var marker = new google.maps.Marker({
                    clickable: true,
                    label: {
                        text: text,
                        color: 'black',
                        fontSize: '17px'
                    },
                    icon: {
                        //animation: google.maps.Animation.DROP,
                        //path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        path: 'm -33.990361,-1.1968618 c 0,-18.4590402 35.3952361,-47.3967002 35.0092561,-47.1095602 0,0 35.5166199,28.65052 35.5166199,47.1095602 0,18.4590298 -15.78065,33.4108498 -35.2629399,33.4108498 -19.4822861,0 -35.2629361,-14.95182 -35.2629361,-33.4108498 z',
                        scale: .5,
                        fillColor: color,
                        fillOpacity: 0.7,
                        strokeColor: 'black',
                        strokeWeight: 1.5,
                        rotation: ((parseFloat(data[i]['wd_10min']) + 180) % 360),
                    },
                    position: location,
                    map: map
                });
                emptymarker.push(marker);

                var output = Tuulikartta.populateInfoWindow(data[i]);

                marker.info = new google.maps.InfoWindow({
                    content: output //stationInfo + stationType + latestObservation + meanWind + gustWind + degWind + dataGraph
                });
                google.maps.event.addListener(marker, 'click', function () {
                    // this = marker
                    var marker_map = this.getMap();
                    this.info.open(marker_map, this);
                    // Note: If you call open() without passing a marker, the InfoWindow will use
                    // the position specified upon construction through the InfoWindowOptions object literal.
                });
                google.maps.event.addListener(marker, 'click', function () {
                    // getObservationGraph(latlon,data[i]["fmisid"],data[i]["type"]);
                });
            }
        }
        var time = data[0]['time'].split('T')
        var timestring = data[0]['time'];
        var timeobj = new Date(timestring).getTime();
        var timestring = Tuulikartta.timeTotime(timeobj / 1000);
        document.getElementById("available-observation-time").innerHTML = timestring
        Tuulikartta.debug("parameters drawn " + valid + "/" + parseInt(Object.keys(data).length));
    }





    // ---------------------------------------------------------
    // populate infowindow with observations
    // ---------------------------------------------------------

    Tuulikartta.populateInfoWindow = function(data) {

        var location = { lat: parseFloat(data['lat']), lng: parseFloat(data['lon']) };
        var time = Tuulikartta.timeTotime(data['epoctime']);
        var latlon = data["lat"] + ',' + data["lon"];

        var output = "";
        if (data['type'] === 'synop') {
            var stationType = '<b>Aseman tyyppi:</b> Synop-asema <br>';
        } else {
            var stationType = '<b>Aseman tyyppi:</b> Tiesääasema <br>';
        }

        output += '<b>Havaintoasema: </b>' + data['station'] + '<br>';
        output += '<b>Viimeisin havainto: </b>' + time + '<br>';
        output += '<b>Keskituuli: </b>' + data['ws_10min'] + ' m/s <br>';
        output += '<b>Puuska: </b>' + data['wg_10min'] + ' m/s <br>';
        output += '<b>Tuulen suunta: </b>' + data['wd_10min'] + '&deg; <br>';
        output += 'Data nähtävissä kuvaajana <a id=\"wslink\" type=\"' + data["type"] + '\" fmisid=\"' + data["fmisid"] + '\" latlon=\"' + latlon + '\" href="#" onclick=\"saa.Tuulikartta.expandGraph(' + data["fmisid"] + ',' + latlon + ',\'' + data["type"] + '\')">täällä</a>';

        return output;

    }




    // ---------------------------------------------------------
    // Expand div that contains graphs
    // ---------------------------------------------------------

    Tuulikartta.opengraphbox = function() {
        // check the div class and reverse it
        if (document.getElementById("graph-container").className === "collapsed") {
            document.getElementById("graph-container").className = "expanded";
        } else {
            document.getElementById("graph-container").className = "collapsed";
            // ajax loader animation
            document.getElementById("weather-chart").innerHTML = '';
            document.getElementById("weather-chart").innerHTML = '<div class="ajax-loader"></div>';
        }
    }




    // ---------------------------------------------------------
    // Expand div that contains graphs
    // ---------------------------------------------------------

    Tuulikartta.expandGraph = function(fmisid, lat, lon, type) {
        //document.getElementById("weather-chart").innerHTML = '';
        document.getElementById("graph-container").className = "expanded";
        Tuulikartta.constructWeatherGraph("graph-container");
        var latlon = lat + ',' + lon;
        Tuulikartta.getObservationGraph(latlon, fmisid, type);
    }




    // ---------------------------------------------------------
    // Get data for wind graph
    // ---------------------------------------------------------

    Tuulikartta.getObservationGraph = function(latlon, fmisid, type) {
        Tuulikartta.debug('Gettting data for graph... ');
        $.ajax({
            dataType: "json",
            url: 'php/weather-graph-ts.php',
            data: {
                latlon: latlon,
                fmisid: fmisid,
                type: type
            },
            error: function () {
                Tuulikartta.debug('An error has occurred');
            },
            success: function (data) {
                Tuulikartta.drawGraph(data);
            }
        });
    }




    // ---------------------------------------------------------
    // Construct weather graph frame
    // ---------------------------------------------------------

    Tuulikartta.constructWeatherGraph = function(container) {

        // remove old content
        document.getElementById("graph-box").innerHTML = "";

        var html = "";
        html = html + '<div id="graph-box">';
        html = html + '<div id="weather-chart">';
        html = html + '<div class="ajax-loader"></div>';
        html = html + '</div>';
        html = html + '<div id="weather-g"></div>';
        html = html + '</div>';

        $('#graph-box').html(html);
        document.getElementById("weather-chart").innerHTML = '<div class="ajax-loader"></div>';

    }




    // ---------------------------------------------------------
    // Draw graph
    // ---------------------------------------------------------

    Tuulikartta.drawGraph = function(data) {

        Highcharts.chart('weather-chart', {

            /*
            chart: {
                type: 'columnrange',
                //zoomType: 'x'
            },*/
            title: {
                text: null
            },
            rangeSelector: {
                selected: 2
            },
            subtitle: {
                text: 'Keskituulen ja maksimipuuskan vaihteluväli'
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    style: {
                        color: 'blac',
                        font: '12px Roboto, sans-serif'
                    }
                }
            },
            yAxis: {
                title: {
                    text: 'Tuulen nopeus [m/s]'
                },
                min: 0,
                labels: {
                    style: {
                        color: 'black',
                        font: '12px Roboto, sans-serif'
                    }
                }
            },
            tooltip: {
                crosshairs: true,
                shared: true,
                valueSuffix: ' m/s',
                labels: {
                    style: {
                        color: 'black',
                        font: '12px Roboto, sans-serif'
                    }
                }
            },
            exporting: {
                enabled: false
            },
            legend: {
                enabled: true
            },
            credits: {
                enabled: false
            },
            series: [{
                type: 'columnrange',
                name: 'Havaittu: keskituuli - maksimipuuska',
                data: data.obs.wind
            },
            {
                type: 'columnrange',         
                name: 'Ennustettu: keskituuli - maksimipuuska',
                data: data.for.wind,
                color: '#a6a6a6'
            }/*,
            {
                pointStart: data.obs.wind[0][0],
                pointInterval: 6e5,
                type: 'windbarb',
                name: 'Tuulen suunta',
                data: data.obs.dir
            },
            {
                pointStart: data.for.wind[0][0],
                pointInterval: 6e5,
                type: 'windbarb',
                name: 'Tuulen suunta',
                data: data.for.dir
            }*/],
            responsive: {
                rules: [{
                    condition: {
                        maxHeight: 150
                    },
                    chartOptions: {
                        legend: {
                            enabled: true
                        }
                    }
                }]
            }

        });
    }




    // ---------------------------------------------------------
    // Draw radar data on map
    // ---------------------------------------------------------

    Tuulikartta.updateRadarData = function(map) {

        //map.overlayMapTypes.clear();
        var layer = document.getElementById("select-radar-parameter").value;

        if (layer) {

            // get timestamp
            Tuulikartta.debug("Update radar data");

            $.getJSON("php/radartime.php?layer=" + layer, function (result) {
                var starttime = result['starttime'];
                var endtime = result['endtime'];

                var time = new Date(endtime).getTime() / 1000;
                var time = Tuulikartta.timeTotime(time);

                document.getElementById('available-radar').innerHTML = time;

                var customParams = [
                    "format=image/png",
                    "layers=fmi:observation:radar:PrecipitationRate5min",
                    "styles="
                ];

                // draw radar layer
                map.overlayMapTypes.clear();
                loadWMS(map, "https://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/wms?", customParams);
            });

        } else {
            map.overlayMapTypes.clear();
        }
    }




    // ---------------------------------------------------------
    // Cookie functions
    // https://quirksmode.org/js/cookies.html
    // ---------------------------------------------------------

    Tuulikartta.createCookie = function(name, value, days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else var expires = "";
        document.cookie = name + "=" + value + expires + "; path=/";
    }

    Tuulikartta.readCookie = function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    Tuulikartta.eraseCookie = function(name) {
        mMinClass.createCookie(name, "", -1);
    }





    // ---------------------------------------------------------
    // Update map icons and data with set interval
    // ---------------------------------------------------------

    setInterval(function () {

        Tuulikartta.debug('............................');
        Tuulikartta.debug('Update data and draw markers');
        Tuulikartta.debug('Time now: ' + (new Date()).toUTCString());
        Tuulikartta.callData();
        Tuulikartta.updateRadarData(saa.Tuulikartta.map);


    }, interval);

    // https://snazzymaps.com/style/58914/new-road-base-2016
    // https://snazzymaps.com/style/77/clean-cut
    var mapstyle = [
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{
            lightness: 100
        }, {
            visibility: "simplified"
        }]
    }, {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{
            "visibility": "on"
        }, {
            "color": "#C6E2FF",
        }]
    }, {
        "featureType": "poi",
        "elementType": "geometry.fill",
        "stylers": [{
            "color": "#C5E3BF"
        }]
    }, {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [{
            "color": "#D1D1B8"
        }]
    }];

}(saa.Tuulikartta = saa.Tuulikartta || {}));
