<?php

$settings = array();
$settings['parameter']      = 'ws_10min,wg_10min,wd_10min';
$settings['timestep']       = '10';
$settings['apikey']         = 'd6985c41-bfc2-4afa-95a7-72cd2acb604c';
$settings['storedQueryId']  = 'fmi::observations::weather::timevaluepair';
$settings['bbox']           = '17.91,58.71,32.61,70.59';

$starttime = date("Y-m-d\TH:i:s", time()-3*60*60-15*60);
$endtime = date("Y-m-d\TH:i:s", time()-3*60*60-5*60);

$url = "http://data.fmi.fi/fmi-apikey/{$settings['apikey']}/wfs?request=getFeature&storedquery_id={$settings['storedQueryId']}&timestep={$settings['timestep']}&parameters={$settings['parameter']}&endtime={$endtime}&starttime={$starttime}&bbox={$settings['bbox']},epsg::4326&";

//$url = "http://data.fmi.fi/fmi-apikey/fd2a6bd5-0236-4524-bc08-2af7cbb803e2/wfs?request=getFeature&storedquery_id=fmi::observations::weather::timevaluepair&timestep=10&parameters=ws_10min,wg_10min,wd_10min&endtime=2017-05-19T08:38:49&starttime=2017-05-19T08:28:49&bbox=17.91,58.71,32.61,70.59,epsg::4326&";

$xmlData = file_get_contents($url);
$resultString = simplexml_load_string($xmlData);

$valuesArray = array();
$dataArray = array();
$x = 0; 
if(!$resultString){
    print "Something went wrong, no data to return";
} else {
    
    $data = $resultString->children('wfs', true);

    $params = explode(',', $settings['parameter']);
    //print count($data->member);


    
    foreach($data->member as $key => $parameterValue){
 
        $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
        foreach($dataValues->point as $key => $datavalue){

            $time = (string)$datavalue->MeasurementTVP->time;
            $epoctime = strtotime($time);
            $value = (string)$datavalue->MeasurementTVP->value;
            
            $valuesArray["station"] = (string)$parameterValue->children('omso', true)->PointTimeSeriesObservation->children('om', true)->featureOfInterest->children('sams', true)->SF_SpatialSamplingFeature->children('sams', true)->shape->children('gml', true)->Point->children('gml', true)->name;
            $latlon = (string)$parameterValue->children('omso', true)->PointTimeSeriesObservation->children('om', true)->featureOfInterest->children('sams', true)->SF_SpatialSamplingFeature->children('sams', true)->shape->children('gml', true)->Point->children('gml', true)->pos;
            $latlont = explode(' ',$latlon);
            
            $valuesArray["lat"] = $latlont[0];
            $valuesArray["lon"] = $latlont[1];
            
            $valuesArray["time"] = $time;
            $valuesArray["epoctime"] = $epoctime;

            if($x>=count($params)-1){
                $valuesArray[$params[$x]] = $value;
                array_push($dataArray,$valuesArray);
                $x = 0;
            } else {
                $valuesArray[$params[$x]] = $value;
                $x++;
            }
        }
    }
            
}

print json_encode($dataArray);
//print '<pre>';
//print_r($dataArray);
//print '</pre>';