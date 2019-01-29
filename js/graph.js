/*
* Tuulikartta.info weatherGraph class
* Copyright (C) 2017 Ville Ilkka
*/

var saa = saa || {};

(function(weatherGraph, undefined)
{


    // ---------------------------------------------------------
    // Expand div that contains graphs
    // ---------------------------------------------------------

    weatherGraph.opengraphbox = function() {
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
    // Get timezone dirrerence in minutes to UTC0
    // ---------------------------------------------------------

    weatherGraph.getTimeZoneDirrerence = function() {
        var x = new Date();
        return x.getTimezoneOffset();
    }




    // ---------------------------------------------------------
    // Expand div that contains graphs
    // ---------------------------------------------------------

    weatherGraph.expandGraph = function(fmisid, lat, lon, type) {
        //document.getElementById("weather-chart").innerHTML = '';
        document.getElementById("graph-container").className = "expanded";
        weatherGraph.constructWeatherGraph("graph-container");
        var latlon = lat + ',' + lon;
        weatherGraph.getObservationGraph(latlon, fmisid, type);
    }




    // ---------------------------------------------------------
    // Get data for wind graph
    // ---------------------------------------------------------

    weatherGraph.getObservationGraph = function(fmisid,type) {
        saa.Tuulikartta.debug('Getting data for graph... ');
        $.ajax({
            dataType: "json",
            url: 'php/weather-graph-ts.php',
            data: {
                fmisid: fmisid,
                type: type
            },
            error: function () {
                saa.Tuulikartta.debug('An error has occurred');
            },
            success: function (data) {
                saa.Tuulikartta.debug('Draw graph')
                weatherGraph.drawGraph(data,fmisid);
            }
        });
    }




    // ---------------------------------------------------------
    // Construct weather graph frame
    // ---------------------------------------------------------

    weatherGraph.constructWeatherGraph = function(container) {

        // remove old content
        document.getElementById("graph-box").innerHTML = "";

        var html = "";
        html = html + '<div id="graph-box">';
        html = html + '<div id="weather-chart">';
        html = html + '<div class="ajax-loader"></div>';
        html = html + '</div>';

        $('#graph-box').html(html);
        document.getElementById("weather-chart").innerHTML = '<div class="ajax-loader"></div>';

    }

    
    weatherGraph.formatTimeLabel = function(value) {

        // add leading zero if needed
        if(value < 10) {
            value = "0"+value;
        }
        return value;
    }

    weatherGraph.resolveWeekDay = function(value) {

        var weekday = ["Sunnuntai", "Maaanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"];
        var n = weekday[value];
        return n;
    }
    

    // ---------------------------------------------------------
    // Draw graph
    // ---------------------------------------------------------

    weatherGraph.drawGraph = function(data,fmisid) {

        Highcharts.chart(`weather-chart-${fmisid}`, {

            chart: {
                spacingTop: 0,
                spacingRight: 0,
                spacingBottom: 0,
                spacingLeft: 0,
                plotBorderWidth: 0,
                marginLeft: 40,
                marginRight: 10,
                marginBottom: 30,
                height: '300px'
            },
            title: {
                text: null
            },
            time: {
                timezoneOffset: weatherGraph.getTimeZoneDirrerence()
            },
            rangeSelector: {
                selected: 1
            },
            subtitle: {
                text: 'Keskituulen ja maksimipuuskan vaihteluväli [m/s]',
                style: {
                    color: 'black',
                    font: '12px Roboto, sans-serif'
                }
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    formatter: function () {
                        var date    = new Date(this.value),
                            hours   = weatherGraph.formatTimeLabel(date.getHours()),
                            minutes = weatherGraph.formatTimeLabel(date.getMinutes()),
                            day     = weatherGraph.resolveWeekDay(date.getDay());

                        if( hours !== "00" ) {
                            return hours + ":" + minutes;
                        }
                        else {
                            // if 12 AM return day name
                            //return day + ", " + hours + ":" + minutes;
                            return day;
                        }
                    }
                },
                style: {
                    color: 'black',
                    font: '12px Roboto, sans-serif'
                }
            },
            yAxis: {
                // title: {
                //     text: 'Tuulen nopeus [m/s]'
                // },
                title: {
                    text: null
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
                type: 'columnrange',
                name: 'Keskituuli - maksimipuuska',
                data: data.obs.wind
            }]
            // {
            //     type: 'columnrange',
            //     name: 'Ennustettu: keskituuli - maksimipuuska',
            //     data: data.for.wind,
            //     color: '#a6a6a6'
            // }]
            ,
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


}(saa.weatherGraph = saa.weatherGraph || {}));
