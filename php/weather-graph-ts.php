<?php

$latlon = filter_input(INPUT_GET, 'latlon', FILTER_SANITIZE_STRING);
$fmisid = filter_input(INPUT_GET, 'fmisid', FILTER_SANITIZE_STRING);
$type   = filter_input(INPUT_GET, 'type', FILTER_SANITIZE_STRING);

if ($type == 'road') {
    $obs = roadObservation($fmisid);
    $for = HarmonieForecast($latlon);
    print combineData($obs, $for); 
}
if ($type == 'synop') {
    $obs = synopObservation($fmisid);
    $for = HarmonieForecast($latlon);
    print combineData($obs, $for); 
}



/**
 *
 * Get road observation data from timeseries
 * @param    station fmisid 
 * @return   data as json string
 *
 */

function roadObservation($fmisid) {
    
    $url = "";
    $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
    $url .= "&format=json";
    $url .= "&producer=road";
    $url .= "&fmisid={$fmisid}";
    $url .= "&precision=double";
    $url .= "&param=name,time,wg,ws,wd";
    $url .= "&missingtext=-";
    $url .= "&starttime=-12h";
    $url .= "&maxlocations=1";
    
    $data = file_get_contents($url) or die('Unable to get data from {$url}');
    $data = json_decode($data, true);

    /* add datatype, station and epoch time information to each observation */
    $observationData = [];
    foreach ( $data as $key => $observation ) {

        $tmp = $observation;
        $tmp["datatype"] = "observation";
        $tmp["station"] = "road";
        $date = new DateTime($observation["time"]);
        $tmp["epoch"] = 1000*intVal($date->format('U'));
        array_push($observationData,$tmp); 

    }
    return $observationData;
}



/**
 *
 * Get synop observation data from timeseries
 * @param    station fmisid 
 * @return   data as json string
 *
 */

function synopObservation($fmisid) {
    
    $url = "";
    $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
    $url .= "&format=json";
    $url .= "&producer=fmi";
    $url .= "&fmisid={$fmisid}";
    $url .= "&precision=double";
    $url .= "&param=name,time,ws_10min,wg_10min,wd_10min";
    $url .= "&missingtext=-";
    $url .= "&starttime=-12h";
    $url .= "&maxlocations=1";

    $data = file_get_contents($url) or die('Unable to get data from {$url}');
    $data = json_decode($data, true);

    /* add datatype, station and epoch time information to each observation */
    /* parameter names must also be changed */
    $observationData = [];
    foreach ( $data as $key => $observation ) {

        $tmp = $observation;
        $tmp["datatype"] = "observation";
        $tmp["station"] = "synop";
        $tmp["ws"] = $observation['ws_10min'];
        $tmp["wg"] = $observation['wg_10min'];
        $tmp["wd"] = $observation['wd_10min'];
        unset($tmp["ws_10min"]);
        unset($tmp["wg_10min"]);
        unset($tmp["wd_10min"]);
        $date = new DateTime($observation["time"]);
        $tmp["epoch"] = 1000*intVal($date->format('U'));
        array_push($observationData,$tmp); 

    }
    return $observationData;
}



/**
 *
 * Get Harmonie forecast data from timeseries
 * @param    lat,lon coordinates 
 * @return   data as json string
 *
 */

function HarmonieForecast($latlon) {

    $date = new DateTime();
    $starttime = ($date->format('Y-m-d\TH:i:m'));
    
    $url = "";
    $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
    $url .= "&format=json";
    $url .= "&producer=harmonie_skandinavia_pinta";
    $url .= "&latlon={$latlon}";
    $url .= "&precision=double";
    $url .= "&param=name,time,windspeedms,winddirection,windgust";
    $url .= "&missingtext=-";
    $url .= "&timestep=10";
    $url .= "&starttime={$starttime}";
    $url .= "&endtimetime=6h";
    $url .= "&maxlocations=1";

    $data = file_get_contents($url) or die('Unable to get data from {$url}');
    $data = json_decode($data, true);

    /* add datatype, station and epoch time information to each observation */
    /* parameter names must also be changed */
    $forecastData = [];
    foreach ( $data as $key => $forecast ) {

        $tmp = $forecast;
        $tmp["datatype"] = "forecast";
        $tmp["ws"] = $forecast['windspeedms'];
        $tmp["wg"] = $forecast['windgust'];
        $tmp["wd"] = $forecast['winddirection'];
        unset($tmp["windspeedms"]);
        unset($tmp["windgust"]);
        unset($tmp["winddirection"]);
        $date = new DateTime($forecast["time"]);
        $tmp["epoch"] = 1000*intVal($date->format('U'));
        array_push($forecastData,$tmp); 

    }
    return $forecastData;
}




/**
 *
 * Combine array datasets as one array
 * @return   data as json string
 *
 */

function combineData($observation, $forecast) {

    $data = [];
    foreach ( $observation as $dataArray ) {
        array_push($data,$dataArray);
    }
    foreach ( $forecast as $dataArray ) {
        array_push($data,$dataArray);
    }

    return json_encode($data);
}