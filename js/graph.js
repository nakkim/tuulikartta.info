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

    weatherGraph.getObservationGraph = function(fmisid,type,timestamp) {
        saa.Tuulikartta.debug('Getting data for graph... ');
        $('#graph-box-loader').html("<span align=center>"+translations[selectedLanguage]['loadObservations']+"... <img src='symbols/default.gif' style='width:20px;'></img></span>");

        $.ajax({
            dataType: "json",
            url: 'php/weather-graph-ts.php',
            data: {
                fmisid: fmisid,
                type: type,
                timestamp: timestamp
            },
            error: function () {
                saa.Tuulikartta.debug('An error has occurred');
            },
            success: function (data) {
                saa.Tuulikartta.debug('Draw graph')
                $('#graph-box-loader').html('');
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
        if(selectedLanguage === 'en')
        var weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thorsday", "Friday", "Saturday"];
        else
        var weekday = ["Sunnuntai", "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"];

        var n = weekday[value];
        return n;
    }
    

    // ---------------------------------------------------------
    // Draw graph
    // ---------------------------------------------------------

    weatherGraph.drawGraph = function(data,fmisid) {
        var chart1 = Highcharts.chart(`weather-chart-${fmisid}`, {

            chart: {
                spacingTop: 0,
                spacingRight: 0,
                spacingBottom: 0,
                spacingLeft: 0,
                plotBorderWidth: 0,
                marginLeft: 40,
                marginRight: 10,
                marginBottom: 65,
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
                text: translations[selectedLanguage]['windTitle'],
                style: {
                    color: 'black',
                    font: '12px Roboto, sans-serif'
                }
            },
            xAxis: [{
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
                },
                offset: 35,
                minorTickInterval: 'auto',
                minorTickColor: '#f2f2f2'
            }],
            yAxis: {
                title: {
                    align: 'high',
                    offset: 0,
                    text: 'm/s',
                    rotation: 0,
                    y: -14,
                    x: -10
                },
                min: 0,
                // startOnTick: false,
                // endOnTick: false,
                labels: {
                    style: {
                        color: 'black',
                        font: '12px Roboto, sans-serif'
                    }
                },
                tickInterval: 2,
                labels: {
                    style: {
                        color: 'black',
                        font: '12px Roboto, sans-serif'
                    }
                },
                minorTickInterval: 2,
                minorTickColor: '#f2f2f2'
            },
            tooltip: {
                crosshairs: true,
                shared: true,
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
                name: translations[selectedLanguage]['ws_10min']+' - '+translations[selectedLanguage]['wg_10min'],
                data: data.obs.wind,
                xAxis: 0,
                tooltip: {
                    valueSuffix: ' m/s'
                }
            },
            {
                type: 'windbarb',
                data: data.obs.dir,
                name: translations[selectedLanguage]['wd_10min'],
                // enableMouseTracking: false,
                tooltip: {
                    valueSuffix: ' °'
                }
            }],
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


        var chart2 = Highcharts.chart(`weather-chart-${fmisid}_alt`, {

            chart: {
                spacingTop: 0,
                // spacingRight: 0,
                spacingBottom: 0,
                spacingLeft: 0,
                // plotBorderWidth: 0,
                marginLeft: 40,
                // marginRight: 10,
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
                text: translations[selectedLanguage]['weatherTitle'],
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
                },
                minorTickInterval: 'auto',
                minorTickColor: '#f2f2f2'
            },
            yAxis: [
                {
                    title: {
                        align: 'high',
                        offset: 0,
                        text: '°C',
                        rotation: 0,
                        y: -14,
                        x: -10
                    },
                    tickInterval: 2,
                    labels: {
                        style: {
                            color: 'black',
                            font: '12px Roboto, sans-serif'
                        }
                    },
                    minorTickInterval: 'auto',
                    minorTickColor: '#f2f2f2',
                    plotLines: [{
                        color: '#7f7e7e',
                        value: 0,
                        width: 2    
                    }]
                },
                {
                    title: {
                        align: 'high',
                        offset: 0,
                        text: 'mm',
                        rotation: 0,
                        y: -14,
                        x: -10
                    },
                    opposite: true,
                    tickInterval: 2,
                    labels: {
                        style: {
                            color: 'black',
                            font: '12px Roboto, sans-serif'
                        }
                    },
                    min: 0
                }
            ],
            tooltip: {
                crosshairs: true,
                shared: true,
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
            series: [
            {
                type: 'spline',
                name: translations[selectedLanguage]['t2m'],
                color: '#FF0000',
                negativeColor: '#0088FF',
                data: data.obs.temp,
                zIndex: 10,
                tooltip: {
                    valueSuffix: ' °C'
                },
                yAxis: 0
            },
            {
                type: 'column',
                name: translations[selectedLanguage]['rr_1h'],
                zIndex: 9,
                data: data.obs.rr1h,
                tooltip: {
                    valueSuffix: ' mm'
                },
                yAxis: 1,
                pointWidth: 20,
                dataLabels: {
                    enabled: true
                }
            },
            {
                type: 'column',
                name: translations[selectedLanguage]['rr_1h_calc'],
                zIndex: 2,
                color: '#89CFF0',
                data: data.obs.rr1h_calc,
                tooltip: {
                    valueSuffix: ' mm'
                },
                yAxis: 1,
                pointWidth: 1,
                dataLabels: {
                    enabled: false
                }
            }],
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
        // saa.Tuulikartta.graphIds = {chart1,chart2}
    }


}(saa.weatherGraph = saa.weatherGraph || {}));
