<?php

date_default_timezone_set('Europe/London');

/* set parameters */
$settings = array();
$settings['latlon']         = filter_input(INPUT_GET, 'latlon', FILTER_SANITIZE_STRING);
$settings['fmisid']         = filter_input(INPUT_GET, 'fmisid', FILTER_SANITIZE_STRING);
$settings['type']           = filter_input(INPUT_GET, 'type', FILTER_SANITIZE_STRING);

$settings['datatype']       = 'forecast';
$settings['parameter']      = 'windspeedms';
$settings['timestep']       = '20';
$settings['apikey']         = '41ff0b06-3f5a-40fa-ba9d-aadda1e5dfb2';
$settings['storedQueryId']  = 'fmi::forecast::harmonie::surface::point::timevaluepair';

/* get forecast data from detData function */
$dataArrayForecast = getData($settings);

/* reset some of the parameters to match synop data */
$settings['datatype']       = 'observation';
$settings['parameter']      = 'ws_10min';
$settings['timestep']       = '20';
$settings['apikey']         = '41ff0b06-3f5a-40fa-ba9d-aadda1e5dfb2';
$settings['storedQueryId']  = 'fmi::observations::weather::timevaluepair';
if($settings['type'] === 'road'){
    $settings['storedQueryId'] = 'livi::observations::road::default::timevaluepair';
    $settings['parameter']     = 'windspeedms';
}
/* get synop observation data */
$dataArrayObservations = getData($settings);

/* combine data arrays as one */
$finalValues = array();
foreach($dataArrayObservations as $key => $array){
    array_push($finalValues,$array);
}
foreach($dataArrayForecast as $key => $array){
    array_push($finalValues,$array);
}

//print '<pre>';
//print_r($finalValues);
//print '</pre>';
print json_encode($finalValues);






// functions
function getData($settings){

    $tz = 'utc';
    $timestamp = time();
    $dt = new DateTime("now", new DateTimeZone($tz)); //first argument "must" be a string
    $dt->setTimestamp($timestamp); //adjust the object to correct timestamp

    if($settings["datatype"] == forecast) {
       $starttime = $dt->format('Y-m-d\TH:i:s');
       $endtime = $dt->add(new DateInterval('PT10H30S'));
       $endtime = $endtime->format('Y-m-d\TH:i:s');

       $url =  "http://data.fmi.fi/fmi-apikey/{$settings['apikey']}";
       $url .= "/wfs?request=getFeature&storedquery_id={$settings['storedQueryId']}";
       $url .= "&timestep={$settings['timestep']}";
       $url .= "&parameters={$settings['parameter']}";
       $url .= "&endtime={$endtime}";
       $url .= "&starttime={$starttime}";
       $url .= "&latlon={$settings['latlon']}";
    } else {
       $endtime = $dt->format('Y-m-d\TH:i:s');
       $starttime = $dt->sub(new DateInterval('PT10H30S'));
       $starttime = $starttime->format('Y-m-d\TH:i:s');

       $url  = "http://data.fmi.fi/fmi-apikey/{$settings['apikey']}";
       $url .= "/wfs?request=getFeature&storedquery_id={$settings['storedQueryId']}"; 
       $url .= "&timestep={$settings['timestep']}";
       $url .= "&parameters={$settings['parameter']}";
       $url .= "&endtime={$endtime}";
       $url .= "&starttime={$starttime}";
       $url .= "&fmisid={$settings['fmisid']}";
    }

    if($settings['parameter'] === "ws_10min") {
        $settings['parameter'] = "windspeedms";
    }

    $xmlData = file_get_contents($url);
    $resultString = simplexml_load_string($xmlData);
    $valuesArray = array();
    $finalValues = array();
    $dataArray = array();
    $x = 0;
    if(!$resultString){
       print $url;
        print "Something went wrong, no data to return";
    } else {
        $data = $resultString->children('wfs', true);
        foreach($data->member as $key => $parameterValue){

            $params = explode(',', $settings['parameter']);
            $valuesArray["station"] =(string)$parameterValue                -> children('omso', true)  ->
                                             PointTimeSeriesObservation     -> children('om', true)    ->
                                             featureOfInterest              -> children('sams', true)  ->
                                             SF_SpatialSamplingFeature      -> children('sam', true)   ->
                                             sampledFeature                 -> children('target', true)->
                                                                            children('target', true)->
                                                                            children('target', true)->
                                                                            children('gml', true)->name[0];

            $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
            foreach($dataValues->point as $key => $datavalue){

                $time = (string)$datavalue->MeasurementTVP->time;
                $epoctime = strtotime($time);
                $value = (string)$datavalue->MeasurementTVP->value;

                $valuesArray["epoctime"] = $epoctime;
                $valuesArray["time"] = $time;
                if($settings["datatype"] == forecast) {
                    $valuesArray["type"] = "for";
                } else if($settings["datatype"] === observation) {
                    $valuesArray["type"] = "obs";
                }
                $dt = new DateTime($time);  // convert timestamp to PHP DateTime
                $hour = $dt->format('H:i');
                $valuesArray["hour"] = $hour;

                if($x>=count($params)-1){
                    $valuesArray[$params[$x]] = $value;
                    array_push($dataArray,$valuesArray);
                    $x = 0;
                } else {
                    $valuesArray[$params[$x]] = $value;
                    $x++;
                }
            }
            array_push($finalValues,$dataArray);
        }
    }
    return $finalValues[0];
}
