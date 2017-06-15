'use strict';

var debugvalue = true;		
var emptydata = "";				
var emptymap = "";
var emptymarker = [];
var selectedparameter = "ws_10min";	

function debug(par){
    if(debugvalue === true){
        console.log(par);
    }
}			


// http://ilmatieteenlaitos.fi/tuulet
var severity = ['white',    // 0      tyyntä
				'#e6f7ff',  // 1-2    heikkoa
				'#cceeff',  // 2-3  
				'#ccffff',  // 3-4  
				'#99ffcc',  // 4-5    kohtalaista
				'#99ff66',  // 5-6  
				'#ccff33',  // 6-7  
				'#ffffcc',  // 7-8    navakkaa
				'#ffff99',  // 8-9  
				'#ffff99',  // 9-10 
				'#ffff66',  // 10-11 
				'#ffff66',  // 11-12 
				'#ffff00',  // 12-13 
				'#ffff00',  // 13-14 
				'#ffcccc',  // 14-15  kovaa
				'#ffcccc',  // 15-16
		        '#ffcc66',  // 16-17
				'#ffcc66',  // 17-18
				'#ff9900',  // 18-19
				'#ff9900',  // 18-19
				'#ff6600',  // 19-20
				'#ff6600',  // 21-21
				'#ff00ff',  // 21-22  myrskyä
				'#ff3399',  // 22-23
				'#cc00cc',  // 23-24
				'#9900cc',  // 24-25
				'#6600cc',  // 25-26  kovaa myrskyä
				'#333399',  // 26-27
				'#000099',  // 27-28
				'#000066',  // 28-29  ankaraa myrskyä
				'#00004d',  // 29-30   
				'#000033',  // 30-31
				'#00001a',  // 31-32
				'#000000',  // 32-    hirmumyrskyä
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
* 	get observation data from getdata.php
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


function getSelectedParameter(value) {
    var value = value;  
    draw(value,emptymap,emptydata)
}


/*
* function draw(value,emptymap,emptydata)
* 	draw selected parameter
*/

function draw(value,emptymap,emptydata){
     
    if(value === 'ws_10min'){
        drawWind(emptymap,emptydata);
        selectedparameter = value;
    }
    
    if(value === 'wg_10min'){
        drawWindGust(emptymap,emptydata);
        selectedparameter = value;
    }
    
}


/*
* function initMap()
* 	initialize map 
*/

function initMap() {
    debug('Initializing map... ');
    var centerpoint = {lat: 64.2685, lng: 25.8668};
    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        minZoom: 6,
        maxZoom: 10,
        styles: mapstyle,
        center: centerpoint,
        streetViewControl: false,
        mapTypeControl: false
    });
    debug('Done');
    emptymap = map;
	// event listener fo bbox values
	
    return map;	
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
* 	draw wind data 
*/

function drawWind(map,data){

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
        
        if(data[i]['ws_10min'] !== 'NaN' && data[i]['wd_10min'] !== 'NaN') {
            

			valid++;
			var marker = new google.maps.Marker({
				clickable: true,
				label: {
					text: data[i]['ws_10min'],
					color: 'black',
					fontSize: '20px'
				},
				icon: {
					animation: google.maps.Animation.DROP,
					path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
					scale: 6,
					fillColor: severity[Math.floor(data[i]['ws_10min'])],
					fillOpacity: 0.7,
					strokeColor: 'black',
					strokeWeight: 1,
					rotation: ((parseFloat(data[i]['wd_10min']) + 180) % 360 )
				},
				position: location,
				map: map
			});
			emptymarker.push(marker);
			
			marker.info = new google.maps.InfoWindow({
				content: '<b>Havaintoasema: </b> '+ data[i]['station'] + ' <br> <b>Viimeisin havainto: </b> <br>' +  time  + '<br>' + data[i]['ws_10min'] + ' m/s,  ' + data[i]['wd_10min'] + '&deg;'
			});
			google.maps.event.addListener(marker, 'click', function() {  
				// this = marker
				var marker_map = this.getMap();
				this.info.open(marker_map,this);
				// this.info.open(marker_map, this);
				// Note: If you call open() without passing a marker, the InfoWindow will use the position specified upon construction through the InfoWindowOptions object literal.
			});

        }			
    }
    debug("parameters drawn "+valid+"/"+parseInt(Object.keys(data).length));
}


/*
* function drawWindGust(map,data)
* 	draw wind data 
*/


function drawWindGust(map,data){
    
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
 
        //if(parseFloat(data[i]['lat']) > minlat && parseFloat(data[i]['lat']) < maxlat && parseFloat(data[i]['lon']) > minlon && parseFloat(data[i]['lon']) < maxlon ) {
            
            if(data[i]['wg_10min'] !== 'NaN' && data[i]['wd_10min'] !== 'NaN') {
                
                valid++;
                var marker = new google.maps.Marker({
                    clickable: true,
                    label: {
                        text: data[i]['wg_10min'],
                        color: 'black',
                        fontSize: '20px'
                    },
                    icon: {
                        animation: google.maps.Animation.DROP,
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 6,
                        fillColor: severity[Math.floor(data[i]['wg_10min'])],
                        fillOpacity: 0.7,
                        strokeColor: 'black',
                        strokeWeight: 1,
                        rotation: ((parseFloat(data[i]['wd_10min']) + 180) % 360 )
                    },
                    position: location,
                    map: map
                });
                emptymarker.push(marker);
                
                marker.info = new google.maps.InfoWindow({
                    content: '<b>Havaintoasema: </b> '+ data[i]['station'] + ' <br> <b>Viimeisin havainto: </b> <br>' +  time  + '<br>' + data[i]['wg_10min'] + ' m/s,  ' + data[i]['wd_10min'] + '&deg;'
                });
                google.maps.event.addListener(marker, 'click', function() {  
                    // this = marker
                    var marker_map = this.getMap();
                    this.info.open(marker_map,this);
                    // this.info.open(marker_map, this);
                    // Note: If you call open() without passing a marker, the InfoWindow will use the position specified upon construction through the InfoWindowOptions object literal.
                });
                
            }

        //}			
    }
    debug("parameters drawn "+valid+"/"+parseInt(Object.keys(data).length));

}




setInterval(function(){
    debug('............................');
    debug('Update data and draw markers');
    callData();
    draw(selectedparameter,emptymap,emptydata);

}, 2*60000);

// https://snazzymaps.com/style/77/clean-cut
var mapstyle = [{featureType:"road",elementType:"geometry",stylers:[{lightness:100},{visibility:"simplified"}]},{"featureType":"water","elementType":"geometry","stylers":[{"visibility":"on"},{"color":"#C6E2FF",}]},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"color":"#C5E3BF"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#D1D1B8"}]}];