'use strict';

var debugvalue = true;
var emptydata;
var emptymap;
var emptymarker = [];

var geoLocation;

// remember parameters from previous state
var latitude          = localStorage.getItem("latitude")           ? localStorage.getItem("latitude")    : 60.630556;
var longtitude        = localStorage.getItem("longtitude")         ? localStorage.getItem("longtitude")  : 24.859726;
var zoomlevel         = localStorage.getItem("zoomlevel")          ? localStorage.getItem("zoomlevel")  : 6;

var selectedparameter = localStorage.getItem("selectedparameter")  ? localStorage.getItem("longtitude")  : "ws_10min";

function debug(par){
    if(debugvalue === true){
        console.log(par);
    }
}


// http://ilmatieteenlaitos.fi/tuulet
var severity = ['white',   // 0       tyyntä
                '#e6f7ff', // 1-2     heikkoa
                '#e6f7ff', // 2-3
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

function timeTotime(epoctime){
    // convert epoc time to time stamp
    var d = new Date(0);
    d.setUTCSeconds(epoctime);
    var hours = d.getHours();
    var minutes = d.getMinutes();
    // add leading zeros
    if(parseInt(hours) < 10){
        hours = '0' + hours;
    }
    if(parseInt(minutes) < 10){
        minutes = '0' + minutes;
    }
    return d.getDate()  + "." + (d.getMonth()+1) + "." + d.getFullYear() + " " + hours + ":" + minutes;
}



/*
* function callData()
*       get observation data from getdata.php
*/

function callData(){
    debug('Gettting data... ');
    $.ajax({
	    dataType: "json",
	    //url: 'data.json',
	    url: 'php/getdata.php',
	    data: {},
	    error: function() {
            debug('An error has occurred');
        },
	    success: function(data) {
	        debug('Done');
	        // store the Map-instance in map variable
	        emptydata = data;
            draw(selectedparameter,emptymap,emptydata);
        }
    });
}

/*
*  trigger buttons
*/

$(function(){
	// select parameter 
    $('#wg').on('click', function(){
       //getSelectedParameter('wg_10min');
       draw('wg_10min',emptymap,emptydata);
    });
    $('#ws').on('click', function(){
        //getSelectedParameter('ws_10min');
        draw('ws_10min',emptymap,emptydata);
    });
    $('#close-gr').on('click', function(){
       opengraphbox();
    });
});

/*
function getSelectedParameter(value) {
    var value = value;
    draw(value,emptymap,emptydata)
}
*/

/*
* function draw(value,emptymap,emptydata)
*       draw selected parameter
*/

function draw(value,emptymap,emptydata){
    if(value === 'ws_10min'){
        drawWind(emptymap,emptydata,'ws_10min');
        selectedparameter = value;
    }
    if(value === 'wg_10min'){
        drawWind(emptymap,emptydata,'wg_10min');
        selectedparameter = value;
    }
}


/*
* function initMap()
*       initialize map
*/

function initMap() {
    debug('Initializing map... ');
    var lat  = parseFloat(latitude),
        lon  = parseFloat(longtitude),
        zoom = parseInt(zoomlevel);
    var centerpoint = {lat: lat, lng: lon};
    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: zoom,
        minZoom: 6,
        maxZoom: 10,
        styles: mapstyle,
        center: centerpoint,
        streetViewControl: false,
        mapTypeControl: false
    });
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
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
            }, function() {
                handleLocationError(true, map.getCenter());
	    });
        } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, map.getCenter());
	}

    debug('Done');
    emptymap = map;
    updateLocation(map);
    return map;
}

function handleLocationError(browserHasGeolocation, pos) {
    geoLocation = 'false';
    console.log('Error: The Geolocation service failed.');
}

function updateLocation(map) {
    google.maps.event.addListener(map, "bounds_changed", function(){
        var lat  = map.getCenter().lat();
        var lon  = map.getCenter().lng();
        var zoom = map.getZoom();
        localStorage.setItem("latitude",lat);
        localStorage.setItem("longitude",lon);
        localStorage.setItem("zoomlevel",zoom);
        //debug(lat+','+lon+','+zoom);
    });
}

function getbbox(map) {
    google.maps.event.addListener(map, "bounds_changed", function() {
        // send the new bounds back
        var bbox = map.getBounds();
        var minlat = bbox['b']['b'],
        maxlat = bbox['b']['f'],
        minlon = bbox['f']['b'],
        maxlon = bbox['f']['f'];
        debug(minlat);
    });
}


/*
* function drawWind(map,data)
* draw wind data
*/

function drawWind(map,data,param){

    // remove old markers
    for (var i = 0; i < emptymarker.length; i++ ) {
        emptymarker[i].setMap(null);
    }
    emptymarker.length = 0;

    var sizeofdata = parseInt(Object.keys(data).length);
    var valid = 0;
    for(i=0; i<sizeofdata; i++){
        var location = {lat: parseFloat(data[i]['lat']), lng: parseFloat(data[i]['lon'])};
        var time = timeTotime(data[i]['epoctime']);
		var latlon = data[i]["lat"] + ',' + data[i]["lon"];

        if(data[i]['ws_10min'] !== 'NaN' && data[i]['wd_10min'] !== 'NaN' && data[i]['wg_10min'] !== 'NaN') {
            valid++;
            if(param == 'ws_10min') {
                var text = data[i]['ws_10min'];
                var color = severity[Math.floor(data[i]['ws_10min'])];
            }
            if(param == 'wg_10min') {
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
                    rotation: ((parseFloat(data[i]['wd_10min']) + 180) % 360 ),
                },
                position: location,
                map: map
            });
            emptymarker.push(marker);

            var stationInfo       = '<b>Havaintoasema: </b> '+ data[i]['station'] + '<br>';
            var latestObservation = '<b>Viimeisin havainto: </b>' +  time  + '<br>';
            var meanWind          = '<b>Keskituuli: </b> ' + data[i]['ws_10min'] + ' m/s <br>';
            var gustWind          = '<b>Puuska: </b> ' + data[i]['wg_10min'] + ' m/s <br>'; 
            var degWind           = '<b>tuulen suunta</b> ' + data[i]['wd_10min'] + '&deg; <br>';
            var dataGraph         = 'Data nähtävissä kuvaajana <a id=\"wslink\" type=\"'+data[i]["type"]+'\" fmisid=\"' + data[i]["fmisid"] + '\" latlon=\"' + latlon + '\" href="#" onclick=\"expandGraph(ws,'+data[i]["fmisid"]+','+latlon+',\''+data[i]["type"]+'\')">täällä</a>';

            marker.info = new google.maps.InfoWindow({
                //content: '<b>Havaintoasema: </b> '+ data[i]['station'] + ' <br> <b>Viimeisin havainto: </b>' +  time  + '<br> <b>keskituuli:</b> ' + data[i]['ws_10min'] + ' m/s <br> <b>puuska:</b> ' + data[i]['wg_10min'] + ' m/s <br> <b>tuulen suunta</b> ' + data[i]['wd_10min'] + '&deg; <br> Data nähtävissä kuvaajana <a id="wslink" type="'+data[i]["type"]+'" fmisid="' + data[i]["fmisid"] + '" latlon="' + latlon + '" href="#" onclick="expandGraph(ws,'+data[i]["fmisid"]+','+latlon+',\''+data[i]["type"]+'\')">täällä</a>'
                content: stationInfo + latestObservation + meanWind + gustWind + degWind + dataGraph
            });
            google.maps.event.addListener(marker, 'click', function() {
                // this = marker
                var marker_map = this.getMap();
                this.info.open(marker_map,this);
                // this.info.open(marker_map, this);
                // Note: If you call open() without passing a marker, the InfoWindow will use the position specified upon construction through the InfoWindowOptions object literal.
            });
			google.maps.event.addListener(marker, 'click', function() {
			    // getObservationGraph(latlon,data[i]["fmisid"],data[i]["type"]);
			});
        }
    }
    debug("parameters drawn "+valid+"/"+parseInt(Object.keys(data).length));
}

/*
function openinfobox(){
    // check the div class and reverse it
    if(document.getElementById("info-container").className === "collapsed") {
        document.getElementById("info-container").className = "expanded";
    } else {
        document.getElementById("info-container").className = "collapsed";
    }
}
*/

function opengraphbox(){
    // check the div class and reverse it
    if(document.getElementById("graph-container").className === "collapsed") {
        document.getElementById("graph-container").className = "expanded";
    } else {
        document.getElementById("graph-container").className = "collapsed";
    }
}

function expandGraph(param,fmisid,lat,lon,type){
	document.getElementById('graph-container').className = "expanded";
	var latlon = lat + ',' + lon;
	// var type = document.getElementById('wslink').getAttribute("type");

	getObservationGraph(latlon,fmisid,type);
}

function getObservationGraph(latlon,fmisid,type){
    debug('Gettting data for graph... ');
    $.ajax({
        dataType: "json",
        url: 'php/graph.php',
        data: {
            latlon: latlon,
            fmisid: fmisid,
            type: type
        },
        error: function() {
            debug('An error has occurred');
        },
        success: function(data) {
            drawGraph(data);
        }
    });
}

function drawGraph(data) {
    var forecastArray = new Array(),
        observationArray = new Array;
    var labelArray = new Array();
    for (var i = 0; i < Object.keys(data).length; i++ ) {
        if(data[i]['type'] == 'for'){
            observationArray.push('nan');
            forecastArray.push(parseFloat(data[i]['windspeedms']));
        } else {
            //observationArray.push(parseFloat(data[i]['ws_10min']));
            observationArray.push(parseFloat(data[i]['windspeedms']));
            forecastArray.push('nan');
        }
        var d = new Date(data[i]['time']);
        var h = ('0'+d.getHours()).slice(-2)
        var m = ('0'+d.getMinutes()).slice(-2);
        labelArray.push(h+":"+m);
    }
	/* remove old div */
    /* http://stackoverflow.com/questions/24815851/how-do-clear-a-chart-from-a-canvas-so-that-hover-events-cannot-be-triggered */
    var content = document.getElementById('graph-box');
    content.innerHTML = '&nbsp;';
    $('#graph-box').append('<canvas id="weather-chart"><canvas>');
	// draw graph
	var ctx = document.getElementById('weather-chart').getContext('2d');
    var chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: {
            labels: labelArray,
            datasets: [
			{
                label: "synop-havainnot",
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderColor: 'rgb(0, 102, 204)',
                data: observationArray,
                pointStyle: 'rectRot',
                borderWidth: '1'
            },
			{
                label: "Harmonie-ennustemalli",
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderColor: 'rgb(255, 99, 132)',
                data: forecastArray,
                pointStyle: 'rectRot',
                borderWidth: '1'
            }],
        },

        // Configuration options go here
        options: {
			responsive: true,
	        maintainAspectRatio: false,
			title: {
				display: true,
				text: 'Keskituuli, synop-havainnot ja Hirlam-malli'
			},
            responsive: true,
            legend: {
                labels: {
                    usePointStyle: true
                }
            },
            scales: {
                xAxes: [{
                    labelString: 'Kellonaika',
                    afterTickToLabelConversion: function(data){
                        var xLabels = data.ticks;
                        xLabels.forEach(function (labels, i) {
                            if (i % 2 == 1){
                                xLabels[i] = '';
                            }
                        });
                    },
                    ticks: {
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: ' '
                    }
                }]
            }
        }
    });
}

setInterval(function(){
    debug('............................');
    debug('Update data and draw markers');
    debug('Time now: ' + (new Date()).toUTCString());
    callData();
    //draw(selectedparameter,emptymap,emptydata);

}, 1*60000);

// https://snazzymaps.com/style/77/clean-cut
var mapstyle = [{featureType:"road",elementType:"geometry",stylers:[{lightness:100},{visibility:"simplified"}]},{"featureType":"water","elementType":"geometry","stylers":[{"visibility":"on"},{"color":"#C6E2FF",}]},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"color":"#C5E3BF"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#D1D1B8"}]}];
