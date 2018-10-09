/*
* Tuulikartta.info main class
* Copyright (C) 2017 Ville Ilkka
*/

var saa = saa || {};

(function(Tuulikartta, undefined)
{

    'use strict';

    saa.Tuulikartta.data = [];
    saa.Tuulikartta.debugvalue = false;
    saa.Tuulikartta.markerGroup = L.layerGroup();
    var emptymarker = [];

    // observation update interval in ms
    var interval = 60000;

    // geolocation
    var geoLocation;

    // Set parameters to localstorage to remember previous state
    var latitude    = localStorage.getItem("latitude")   ? localStorage.getItem("latitude")   : 60.630556;
    var longtitude  = localStorage.getItem("longtitude") ? localStorage.getItem("longtitude") : 24.859726;
    var zoomlevel   = localStorage.getItem("zoomlevel")  ? localStorage.getItem("zoomlevel")  : 8;

    var selectedparameter = localStorage.getItem("selectedparameter") ? localStorage.getItem("longtitude") : "ws_10min";
    var toggleDataSelect = "close";

    Tuulikartta.debug = function(par) {
        if (Tuulikartta.debugvalue === true) {
            console.log(par);
        }
    }

    // ---------------------------------------------------------
    // Convert epoch time to properly formatted time string
    // ---------------------------------------------------------

    Tuulikartta.timeTotime = function(epoctime) {
        // convert epoc time to time stamp
        // console.log(epoctime);
        var d = new Date(epoctime*1000);
        //console.log(d);
        //d.setUTCSeconds(epoctime);
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
                Tuulikartta.drawWind($("#select-wind-parameter").val());
                selectedparameter = $("#select-wind-parameter").val();
            }
        });
    }

    // ---------------------------------------------------------
    //  Trigger buttons
    // ---------------------------------------------------------

    $(function bunttonFunctionalities() {

        //select wind parameter
        $("#select-wind-parameter").change(function () {
            Tuulikartta.drawWind($(this).val());
        });

        // close graph box
        $('#close-gr').on('click', function () {
            saa.weatherGraph.opengraphbox();
        });

        // select observations dialog
        var obsValues = !!Tuulikartta.readCookie('observation_values_hidden');
        $("#data-content-select").dialog({
            //position: { my: 'bottom+90', at: 'rleft+182' },
            position: {
                of: $("body"),
                my: 'left top+60',
                at: 'left+54 top'
            },
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

        // ---------------------------------------------------------
        // Get and save user location to localstorage
        // ---------------------------------------------------------

        saa.Tuulikartta.map.on('move', function() {
            var lat = saa.Tuulikartta.map.getCenter().lat;
            var lon = saa.Tuulikartta.map.getCenter().lng;
            var zoom = saa.Tuulikartta.map.getZoom();
            localStorage.setItem("latitude", lat);
            localStorage.setItem("longitude", lon);
            localStorage.setItem("zoomlevel", zoom);
        });

    });

    // ---------------------------------------------------------
    // initialize Leaflet map and set geolocation
    // ---------------------------------------------------------

    Tuulikartta.initMap = function() {

        var endDate = new Date();
        var minutes = Math.floor(endDate.getUTCMinutes()/5)*5;
        endDate.setUTCMinutes(minutes, 0, 0);
        var startDate = endDate - 3600*1000;

        var lat = parseFloat(latitude),
            lon = parseFloat(longtitude),
            zoom = parseInt(zoomlevel);

        var map = L.map('map', {
            zoom: zoom,
            minZoom: 5,
            maxZoom: 12,
            fullscreenControl: true,
            timeDimension: false,
            timeDimensionControl: false,
            scrollWheelZoom: true,
            center: [lat,lon],
            timeDimensionControlOptions: {
                autoPlay: false,
                speedSlider: false,
                playerOptions: {
                    buffer: 10,
                    transitionTime: 2000,
                    loop: true,
                }
            }
        });

        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">Tuulikartta.info</a> contributors'
        }).addTo(map);
        
        saa.Tuulikartta.map = map;
        Tuulikartta.initWMS();

        map.locate({setView: false, maxZoom: 18});
        map.on('locationfound', onLocationFound);
        map.on('locationerror', onLocationError);

    }

    function onLocationFound(e) {
        var radius = e.accuracy / 2;

        var icon = L.icon({
            iconUrl: '../symbols/blue-pushpin.png',
            iconSize:     [32, 32],  // size of the icon
            iconAnchor:   [10, 32],  // point of the icon which will correspond to marker's location
            popupAnchor:  [0, 0],    // point from which the popup should open relative to the iconAnchor
        });

        L.marker(e.latlng, {icon: icon}).addTo(saa.Tuulikartta.map);
        // L.circle(e.latlng, radius).addTo(saa.Tuulikartta.map);
        Tuulikartta.map.setView(e.latlng, 9, { animation: true });
    }

    function onLocationError(e) {
        Tuulikartta.debug(e.message);
        console.log('Error: The Geolocation service failed.');
    }

    Tuulikartta.initWMS = function() {

        var time = new Date();
        time.setHours(time.getHours() + Math.round(time.getMinutes()/60));
        time.setMinutes(0);
        time.setSeconds(0);
        time.setMilliseconds(0);

        time = time.toISOString();

        var dataWMS = "https://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/wms";
        var geosrvWMS = "http://wms.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/geoserver/Weather/wms";        

        var radar5min = L.tileLayer.wms(dataWMS, {
            layers: 'fmi:observation:radar:PrecipitationRate5min',
            format: 'image/png',
            tileSize: 2048,
            transparent: true,
            opacity: 0.7,
            version: '1.3.0',
            crs: L.CRS.EPSG3857,
            //preventCache: Date.now()
        });

        var flash5min = L.tileLayer.wms(dataWMS, {
            layers: 'fmi:observation:flashicon',
            format: 'image/png',
            tileSize: 2048,
            transparent: true,
            opacity: 0.8,
            version: '1.3.0',
            crs: L.CRS.EPSG3857,
            interval_start: 5,
            timestep: 5
            //preventCache: Date.now()
        });

        var cloudiness = L.tileLayer.wms(geosrvWMS, {
            layers: 'cloudiness-forecast',
            format: 'image/png',
            tileSize: 1024,
            transparent: true,
            opacity: 1.0,
            version: '1.3.0',
            crs: L.CRS.EPSG3857,
            time: time
        });
        
        var overlayMaps = {
            //"Kokonaispilvisyys": cloudiness,
            "Tutka - 5min sadekertymä": radar5min,
            "5min salamahavainnot": flash5min
        };
        
        saa.Tuulikartta.map.on("overlayadd", function(eventLayer) {
            if (eventLayer.name == "Tutka - 5min sadekertymä") {
                saa.Tuulikartta.activeLayer = radar5min;
                Tuulikartta.updateRadarTime();
            }
        })
        
        L.control.layers(false, overlayMaps).addTo(saa.Tuulikartta.map);
    }

    // ---------------------------------------------------------
    //  catch location error message
    // ---------------------------------------------------------

    Tuulikartta.handleLocationError = function(browserHasGeolocation, pos) {
        geoLocation = 'false';
        console.log('Error: The Geolocation service failed.');
    }

    // ---------------------------------------------------------
    // Resolve wind speed and icon and  draw wind data
    // ---------------------------------------------------------

    Tuulikartta.resolveWindSpeed = function(windspeed) {
        windspeed = parseFloat(windspeed)
        if (windspeed < 1)
            return "calm"
        else if (windspeed >= 1 && windspeed < 2)
            return "light"
        else if (windspeed >= 2 && windspeed < 7)
            return "moderate"
        else if (windspeed >= 7 && windspeed < 14)
            return "brisk"
        else if (windspeed >= 14 && windspeed < 21)
            return "hard"
        else if (windspeed >= 21 && windspeed < 25)
            return "storm"
        else if (windspeed >= 25 && windspeed < 28)
            return "severestorm"
        else if (windspeed >= 28 && windspeed < 32)
            return "extremestorm"
        else if (windspeed >= 32)
            return "hurricane"
        else
            return "calm"
    }

    Tuulikartta.resolveTemperature = function(temperature) {
        temperature = parseFloat(temperature);
        if (temperature < -30) return "#8a79f7";
        if (temperature >= -30 && temperature < -28) return "#8a79f7";
        if (temperature >= -28 && temperature < -26) return "#6e70e7";
        if (temperature >= -26 && temperature < -24) return "#5268d8";
        if (temperature >= -24 && temperature < -22) return "#3760c9";
        if (temperature >= -22 && temperature < -20) return "#1b58ba";
        if (temperature >= -20 && temperature < -18) return "#0050ab";
        if (temperature >= -18 && temperature < -16) return "#196bbe";
        if (temperature >= -16 && temperature < -14) return "#3286d1";
        if (temperature >= -14 && temperature < -12) return "#4ba1e4";
        if (temperature >= -12 && temperature < -10) return "#65dbf7";
        if (temperature >= -10 && temperature < -8) return "#77c8f8";
        if (temperature >= -8 && temperature < -6) return "#8ad3f9";
        if (temperature >= -6 && temperature < -4) return "#9cdefb";
        if (temperature >= -4 && temperature < -2) return "#afe9fc";
        if (temperature >= -2 && temperature < -1) return "#c1f4fd";
        if (temperature >= -1 && temperature < 0) return "#d4ffff";
        if (temperature >= 0 && temperature < 1) return "#05b38a";
        if (temperature >= 1 && temperature < 2) return "#02d495";
        if (temperature >= 2 && temperature < 4) return "#8aedbb";
        if (temperature >= 4 && temperature < 6) return "#ccffd0";
        if (temperature >= 6 && temperature < 8) return "#ebfccf";
        if (temperature >= 8 && temperature < 10) return "#ebff7a";
        if (temperature >= 10 && temperature < 12) return "#ffea80";
        if (temperature >= 12 && temperature < 14) return "#f7d423";
        if (temperature >= 14 && temperature < 16) return "#f5b400";
        if (temperature >= 16 && temperature < 18) return "#f29500";
        if (temperature >= 18 && temperature < 20) return "#f07400";
        if (temperature >= 20 && temperature < 22) return "#ff5324";
        if (temperature >= 22 && temperature < 24) return "#f71707";
        if (temperature >= 24 && temperature < 26) return "#db0a07";
        if (temperature >= 26 && temperature < 28) return "#bd0404";
        if (temperature >= 28 && temperature < 30) return "#000000";
        if (temperature > 30) return "#000000";
        return '#8aedbb';
    }
    
    Tuulikartta.resolveWindDirection = function(winddirection) {
        var winddir = parseFloat(winddirection);
        return (winddir+180)%360;
    }

    Tuulikartta.createLabelIcon = function(labelClass,labelText){
        return L.divIcon({
            iconSize: null,
            className: labelClass,
            iconAnchor: [10, 7],
            html: labelText
        })
    }

    Tuulikartta.drawWind = function(param) {

        // remove all old markers
        saa.Tuulikartta.markerGroup.clearLayers();

        var sizeofdata = parseInt(Object.keys(saa.Tuulikartta.data).length);
        saa.Tuulikartta.markerGroup.addTo(saa.Tuulikartta.map);
        var valid = 0;

        for (var i = 0; i < sizeofdata; i++) {
            var location = { lat: parseFloat(saa.Tuulikartta.data[i]['lat']), lng: parseFloat(saa.Tuulikartta.data[i]['lon']) };
            var time = Tuulikartta.timeTotime(saa.Tuulikartta.data[i]['epoctime']);
            var latlon = saa.Tuulikartta.data[i]["lat"] + ',' + saa.Tuulikartta.data[i]["lon"];

            if(param == "ws_10min" || param == "wg_10min") {

                if (saa.Tuulikartta.data[i]['ws_10min'] !== null && saa.Tuulikartta.data[i]['wd_10min'] !== null 
                        && saa.Tuulikartta.data[i]['wg_10min'] !== null) {

                    valid++;

                    if(saa.Tuulikartta.data[i][param] < 10) { var iconAnchor = [30, 28] }
                    if(saa.Tuulikartta.data[i][param] >= 10) { var iconAnchor = [25, 28] }

                    var icon = L.icon({
                        iconUrl: '../symbols/wind/'+saa.Tuulikartta.resolveWindSpeed(saa.Tuulikartta.data[i][param])+'.svg',
                        iconSize:     [60, 60],    // size of the icon
                        iconAnchor:   iconAnchor,  // point of the icon which will correspond to marker's location
                        popupAnchor:  [0, 0],      // point from which the popup should open relative to the iconAnchor
                    });

                    var marker = L.marker([saa.Tuulikartta.data[i]['lat'],saa.Tuulikartta.data[i]['lon']],
                        {
                            icon: icon,
                            rotationAngle: Tuulikartta.resolveWindDirection(saa.Tuulikartta.data[i]['wd_10min']),
                            rotationOrigin: 'center center'
                        }).addTo(saa.Tuulikartta.markerGroup);

                    marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]));

                    L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'],saa.Tuulikartta.data[i]['lon']),
                        {
                            interactive: false,
                            keyboard: false,
                            icon:Tuulikartta.createLabelIcon("textLabelclass", parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
                        }).addTo(saa.Tuulikartta.markerGroup);
                }
            }

            if (param == "ri_10min") {

                if (saa.Tuulikartta.data[i]['ri_10min'] !== null && parseFloat(saa.Tuulikartta.data[i]['ri_10min']) > 0) {
                    valid++;
                    L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'],saa.Tuulikartta.data[i]['lon']),
                        {
                            interactive: false,
                            keyboard: false,
                            icon:Tuulikartta.createLabelIcon("textLabelclass", parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
                        }).addTo(saa.Tuulikartta.markerGroup);
                }

            }

            if (param == "r_1h") {

                if (saa.Tuulikartta.data[i]['r_1h'] !== null) {
                    valid++;
                    L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'],saa.Tuulikartta.data[i]['lon']),
                        {
                            interactive: false,
                            keyboard: false,
                            icon:Tuulikartta.createLabelIcon("textLabelclass", parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
                        }).addTo(saa.Tuulikartta.markerGroup);
                }

            }

            if (param == "temperature") {

                var fillColor = Tuulikartta.resolveTemperature(saa.Tuulikartta.data[i][param]);
                var hex = fillColor.substr(1);
                hex = 'hex'+hex;

                var svgicon = "";
                var svgicon = svgicon + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 50 50" enable-background="new 0 0 50 50" xml:space="preserve">';
                    svgicon = svgicon +   '<g><path d="M20.4,48.8c6.7,1.3,12.5-3.8,12.5-10.3c0-3.4-1.7-6.5-4.3-8.4V7.2c0-3.4-2.7-6.2-6.2-6.2c-3.4,0-6.2,2.8-6.2,6.2v22.9   c-3.1,2.3-4.9,6.2-4,10.6C13,44.7,16.3,48,20.4,48.8z M17.5,32l0.9-0.7v-24c0-2.2,1.8-3.9,3.9-3.9c2.2,0,4,1.8,4,3.9v24l0.9,0.7   c2.1,1.5,3.3,4,3.3,6.6c0,2.2-0.9,4.3-2.4,5.8c-1.6,1.5-3.6,2.4-5.8,2.4c-4.1,0-7.3-2.9-8-6.5C13.8,37,15,33.8,17.5,32z"></path>';
                    svgicon = svgicon +     '<path d="M22.4,44.4c1.6,0,3.1-0.6,4.2-1.7c1.1-1.1,1.7-2.6,1.7-4.2c0-4-3.4-5.3-4.3-6.1V15.5h-3.3v16.9c-0.7,0.8-5.1,2.4-4.1,7.3   C17.1,42.3,19.4,44.4,22.4,44.4z" stroke="black" fill="'+fillColor+'"></path>';
                    svgicon = svgicon +     '<path d="M36.9,7.8h-5.7v2.3h5.7c0.6,0,1.1-0.5,1.1-1.1C38.1,8.3,37.6,7.8,36.9,7.8z"></path>';
                    svgicon = svgicon +     '<path d="M35.8,15c0-0.6-0.5-1.1-1.1-1.1h-3.4v2.3h3.4C35.3,16.1,35.8,15.6,35.8,15z"></path>';
                    svgicon = svgicon +     '<path d="M38.1,21c0-0.6-0.5-1.1-1.1-1.1h-5.7v2.3h5.7C37.6,22.2,38.1,21.6,38.1,21z"></path>';
                    svgicon = svgicon +   '</g>';
                    svgicon = svgicon + '</svg>';

                var icon = encodeURI("data:image/svg+xml," + svgicon).replace('#','%23');

                if (saa.Tuulikartta.data[i]['temperature'] !== null) {

                    var icon = L.icon({
                        // iconUrl: '../symbols/temperature.svg',
                        iconUrl: icon,
                        iconSize:     [30, 30],
                        iconAnchor:   [40, 10],
                        popupAnchor:  [0, 0]
                    });

                    var marker = L.marker([saa.Tuulikartta.data[i]['lat'],saa.Tuulikartta.data[i]['lon']],
                        {
                            icon: icon,
                        }).addTo(saa.Tuulikartta.markerGroup);

                    marker.bindPopup(saa.Tuulikartta.populateInfoWindow(saa.Tuulikartta.data[i]));

                    var cssClass = '';
                    if(saa.Tuulikartta.data[i][param] < 0) {
                        cssClass = 'textLabelclassNeg';
                    } else {
                        cssClass = 'textLabelclassPos';
                    }

                    L.marker(new L.LatLng(saa.Tuulikartta.data[i]['lat'],saa.Tuulikartta.data[i]['lon']),
                        {
                            interactive: false,
                            keyboard: false,
                            icon:Tuulikartta.createLabelIcon(hex, parseFloat(saa.Tuulikartta.data[i][param]).toFixed(1))
                        }).addTo(saa.Tuulikartta.markerGroup);
                }

            }

        }

        for (var i = 0; i < sizeofdata; i++) {
            if(saa.Tuulikartta.data[i]['type'] === 'synop') {
                var timestring = saa.Tuulikartta.data[i]['time'];
                var timeobj = new Date(timestring);
                var timestring = Tuulikartta.timeTotime(timeobj / 1000);
                document.getElementById("available-observation-time").innerHTML = timestring;
                break;
            }
        }
        
    }

    // ---------------------------------------------------------
    // populate infowindow with observations
    // ---------------------------------------------------------

    Tuulikartta.populateInfoWindow = function(data) {

        var location = { lat: parseFloat(data['lat']), lng: parseFloat(data['lon']) };
        var time = Tuulikartta.timeTotime(data['epoctime']);
        var latlon = data["lat"] + ',' + data["lon"];

        var wind = data['ws_10min'] + ' m/s',
            gust = data['wg_10min'] + ' m/s',
            dir  = data['wd_10min'] + '&deg;',
            temp = data['temperature'] + '&degC'

        if(wind === 'null m/s') wind = "-";
        if(gust === 'null m/s') gust = "-";
        if(dir  === 'null&deg;') dir  = "-";
        if(temp === 'null&degC') temp = "-";
        
        if (data['type'] === 'synop') {
            var stationType = '<b>Aseman tyyppi:</b> Synop-asema <br>';
        } else {
            var stationType = '<b>Aseman tyyppi:</b> Tiesääasema <br>';
        }

        if(data['wg_10min'] === null) {

        }
        
        var output = "";
        output += '<b>Havaintoasema: </b>' + data['station'] + '<br>';
        output += stationType;
        output += '<b>Viimeisin havainto: </b>' + time + '<br>';
        output += '<b>Keskituuli: </b>' + wind + ' <br>';
        output += '<b>Puuska: </b>' + gust + ' <br>';
        output += '<b>Tuulen suunta: </b>' + dir + ' <br>';
        output += '<b>Lämpötila: </b>' + temp + ' <br>';
        output += 'Data nähtävissä kuvaajana <a id=\"wslink\" type=\"' + data["type"] + '\" fmisid=\"' + data["fmisid"] + '\" latlon=\"' + latlon + '\" href="#" onclick=\"saa.weatherGraph.expandGraph(' + data["fmisid"] + ',' + latlon + ',\'' + data["type"] + '\')">täällä</a>';

        return output;

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
            //map.overlayMapTypes.clear();
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


    Tuulikartta.updateRadarTime = function() {
        $.getJSON("php/radartime.php?layer=fmi:observation:radar:PrecipitationRate5min", function (result) {
            var starttime = result['starttime'];
            var endtime = result['endtime'];

            var time = new Date(endtime).getTime() / 1000;
            var time = Tuulikartta.timeTotime(time);

            document.getElementById('available-radar').innerHTML = time; 
        })
    }
    
    // ---------------------------------------------------------
    // Update map icons and data with set interval
    // ---------------------------------------------------------

    setInterval(function () {
        Tuulikartta.debug('............................');
        Tuulikartta.debug('Update data and draw markers');
        Tuulikartta.debug('Time now: ' + (new Date()).toUTCString());
        Tuulikartta.callData();
        Tuulikartta.updateRadarTime();
        saa.Tuulikartta.map.eachLayer(function(layer) {
            if( layer instanceof L.TileLayer && 'wmsParams' in layer) {
                layer.wmsParams.preventCache = Date.now();
                layer.setParams({});
                console.log(layer);;
            }
        });
    }, interval);

}(saa.Tuulikartta = saa.Tuulikartta || {}));
