

'use strict';

var debugvalue = false;
var emptydata;
var emptymap;
var emptymarker = [];

var geoLocation;

// remember parameters from previous state
var latitude          = localStorage.getItem("latitude")           ? localStorage.getItem("latitude")    : 60.630556;
var longtitude        = localStorage.getItem("longtitude")         ? localStorage.getItem("longtitude")  : 24.859726;
var zoomlevel         = localStorage.getItem("zoomlevel")          ? localStorage.getItem("zoomlevel")   : 8;

var selectedparameter = localStorage.getItem("selectedparameter")  ? localStorage.getItem("longtitude")  : "ws_10min";
//var toggleDataSelect  = localStorage.getItem("toggleDataSelect")   ? localStorage.getItem("toggleDataSelect")  : "closed";
var toggleDataSelect  = "closed";


function debug(par){
    if(debugvalue === true){
        console.log(par);
    }
}


// http://ilmatieteenlaitos.fi/tuulet
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


/*
* TODO: add function description
*/

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
* get observation data from getdata.php
*/

function callData(){
    debug('Getting data... ');
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
*  Trigger buttons
*/

$(function(){

    $("#select-wind-parameter").change(function() {
	if($(this).val() == "meanwind"){
	    var text = "Havaintoaseman keskituulella tarkoitetaan tyypillisesti ";
	        text += "10 minuutin mittaisen havaintojakson keskituulta.";
	    document.getElementById("param-text").innerHTML = text;
	    draw('ws_10min',emptymap,emptydata);
	}
	if($(this).val() == "gustwind"){
	    var text = "Puuska kuvaa 3 sekunnin mittaisten mittausjaksojen 10 minuutin maksimiarvoa.";
	    document.getElementById("param-text").innerHTML = text;
	    draw('wg_10min',emptymap,emptydata);
	}
    });
    
    $('#close-gr').on('click', function(){
       opengraphbox();
    });

    // toggle data-content-select box
    $("#toggle-data-content-select").click(function(){
        $("#data-content-select").slideToggle(200);
        if(toggleDataSelect == "open"){
            var content = '<i class="fa fa-arrow-circle-up" aria-hidden="true"></i>   Havaintovalikko';
            document.getElementById("toggle-data-content-select").innerHTML = content;
            toggleDataSelect = "closed";
            //localStorage.setItem("toggleDataSelect","closed");
            toggleDataSelect = 'closed';
        } else {
            var content = '<i class="fa fa-arrow-circle-down" aria-hidden="true"></i>   Havaintovalikko';
            document.getElementById("toggle-data-content-select").innerHTML = content;
            //localStorage.setItem("toggleDataSelect","open");
            toggleDataSelect = 'open';
        }
    });

    $("#data-content-select").accordion({heightStyle: 'content'});

});


/*
* Trigger selected parameter and draw values to map
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
* initialize Google Map and set geolocation 
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
    //addRadarData(map)
    return map;
}


/*
*  catch location error message
*/

function handleLocationError(browserHasGeolocation, pos) {
    geoLocation = 'false';
    console.log('Error: The Geolocation service failed.');
}


/*
* Get and set user location to local storage
*/

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


/*
* draw wind data
*/

function drawWind(map,data,param){

    // remove all old markers
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
            if(data[i]['type'] === 'synop') {
                var stationType = '<b>Aseman tyyppi:</b> Synop-asema <br>';
            } else {
                var stationType = '<b>Aseman tyyppi:</b> Tiesääasema <br>';
            }
            var stationInfo       = '<b>Havaintoasema: </b>'+ data[i]['station'] + '<br>';
            var latestObservation = '<b>Viimeisin havainto: </b>' +  time  + '<br>';
            var meanWind          = '<b>Keskituuli: </b>' + data[i]['ws_10min'] + ' m/s <br>';
            var gustWind          = '<b>Puuska: </b>' + data[i]['wg_10min'] + ' m/s <br>'; 
            var degWind           = '<b>Tuulen suunta: </b>' + data[i]['wd_10min'] + '&deg; <br>';
            var dataGraph         = 'Data nähtävissä kuvaajana <a id=\"wslink\" type=\"'+data[i]["type"]+'\" fmisid=\"' + data[i]["fmisid"] + '\" latlon=\"' + latlon + '\" href="#" onclick=\"expandGraph('+data[i]["fmisid"]+','+latlon+',\''+data[i]["type"]+'\')">täällä</a>';

            marker.info = new google.maps.InfoWindow({
                content: stationInfo + stationType + latestObservation + meanWind + gustWind + degWind + dataGraph
            });
            google.maps.event.addListener(marker, 'click', function() {
                // this = marker
                var marker_map = this.getMap();
                this.info.open(marker_map,this);
                // Note: If you call open() without passing a marker, the InfoWindow will use
		// the position specified upon construction through the InfoWindowOptions object literal.
            });
            google.maps.event.addListener(marker, 'click', function() {
            // getObservationGraph(latlon,data[i]["fmisid"],data[i]["type"]);
            });
        }
    }
    // document.getElementById("available-observations").innerHTML = valid+"/"+parseInt(Object.keys(data).length);
    var time = data[0]['time'].split('T')
    var timestring = data[0]['time'];
    var timeobj = new Date(timestring).getTime();
    var timestring = timeTotime(timeobj/1000);
    //var timestring = timeobj.getDate()+'.'+timeobj.getMonth()+'.'+timeobj.getFullYear()+' '+timeobj.getHours()+':'+timeobj.getMinutes()+':'+timeobj.getSeconds();
    document.getElementById("available-observation-time").innerHTML = timestring
    debug("parameters drawn "+valid+"/"+parseInt(Object.keys(data).length));
}


/*
* Expand div that contains graphs
*/

function opengraphbox(){
    // check the div class and reverse it
    if(document.getElementById("graph-container").className === "collapsed") {
        document.getElementById("graph-container").className = "expanded";
    } else {
        document.getElementById("graph-container").className = "collapsed";
    }
}


/*
* Expand div that contains graphs
*/

function expandGraph(fmisid,lat,lon,type){
    document.getElementById('graph-container').className = "expanded";
    var latlon = lat + ',' + lon;
    // var type = document.getElementById('wslink').getAttribute("type");
    getObservationGraph(latlon,fmisid,type);
}


/*
* Get data for graph
*/


function getObservationGraph(latlon,fmisid,type){
    debug('Gettting data for graph... ');
    $.ajax({
        dataType: "json",
        url: 'php/parser-graph.php',
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


/*
* Draw graph
*/

function drawGraph(data) {

    var i,k;
    var obsArray = [];
    var forArray = [];
    var bobsArray = [];
    var bforArray = [];
    for (i = 0; i < Object.keys(data).length; i++) {
        var tmp1 = [];
        var tmp2 = [];
        var tmpb1 = [];
        var tmpb2 = [];
        
        if(data[i]['datatype'] == 'observation') {
            if(data[i]['station'] == 'synop') {
                tmp1.push(data[i]['epoch']);
                tmp1.push(data[i]['ws_10min']);
                tmp1.push(data[i]['wg_10min']);
                
                tmpb1.push(data[i]['ws_10min']);
                tmpb1.push(data[i]['wd_10min']);
            } else {
                tmp1.push(data[i]['epoch']);
                tmp1.push(data[i]['ws']);
                tmp1.push(data[i]['wg']);
                
                tmpb1.push(data[i]['ws']);
                tmpb1.push(data[i]['wd']);
            }
        } else {
            tmp2.push(data[i]['epoch']);
            tmp2.push(data[i]['WindSpeedMS']);
            tmp2.push(data[i]['WindGust']);
            
            tmpb2.push(data[i]['WindSpeedMS']);
            tmpb2.push(data[i]['WindDirection']);
        }
        if(tmp1.length>0){obsArray.push(tmp1)}
        if(tmp2.length>0){forArray.push(tmp2)}
        if(tmpb1.length>0){bobsArray.push(tmpb1)}
        if(tmpb2.length>0){bforArray.push(tmpb2)}
        
    }
    
    Highcharts.chart('weather-chart', {

        chart: {
            type: 'columnrange',
            zoomType: 'x'
        },

        title: {
            text: 'Keskituuli ja maksimipuuska'
        },

        xAxis: {
            type: 'datetime',
            labels: {
                style: {
                    color: 'black',
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
            enabled: false
        },
        
        credits: {
            enabled: false
        },

        series: [{
            name: 'Havaittu: keskituuli - maksimipuuska',
            data: obsArray
        },
        {
            name: 'Ennustettu: keskituuli - maksimipuuska',
            data: forArray
        }]

    });
}


/*
* Draw radar data on map
*/

function addRadarData(map) {
    map.overlayMapTypes.clear();
    debug("Update radar data")
    var latlng = new google.maps.LatLng(60, 25);
    var customParams = [

	"service=WMS",
	"version=1.3.0",
	"request=GetMap",
	"format=image/png",
	"width=1024",
	"height=2048",
	"FORMAT=image/png8",
	"layers=Radar:suomi_dbz_eureffin",
	"style=raster",
    ];

    loadWMS(map, "https://wms.fmi.fi/fmi-apikey/d6985c41-bfc2-4afa-95a7-72cd2acb604c/geoserver/Radar/wms?", customParams)
}


/*
* Update map icons and data
*/

var count = 0;
var now = new Date().getTime();
var countDownDate = now + 60*1000;

var timer = setInterval(function(){

    debug('............................');
    debug('Update data and draw markers');
    debug('Time now: ' + (new Date()).toUTCString());
    //clearInterval(timer);
    //setInterval(timer);
    callData();    
    //addRadarData(emptymap) 
    count = 0;
	

    
}, 60000);

// https://snazzymaps.com/style/77/clean-cut
var mapstyle = [{featureType:"road",elementType:"geometry",stylers:[{lightness:100},{visibility:"simplified"}]},{"featureType":"water","elementType":"geometry","stylers":[{"visibility":"on"},{"color":"#C6E2FF",}]},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"color":"#C5E3BF"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#D1D1B8"}]}];
