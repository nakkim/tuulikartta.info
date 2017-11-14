<?php
date_default_timezone_set('Europe/Helsinki');

$synopdata = synopdata();
$roaddata = roaddata();

foreach($roaddata as &$val){
    $val['ws_10min'] = $val['windspeedms'];
    $val['wd_10min'] = $val['winddirection'];
    $val['wg_10min'] = $val['WG'];
    unset($val['windspeedms']);
    unset($val['winddirection']);
    unset($val['WG']);
}

foreach($roaddata as $key => $data) {
	array_push($synopdata,$data);
}

print json_encode($synopdata);





// functions

function roaddata() {
    $settings = array();
    $settings['parameter']      = 'windspeedms,winddirection,WG';
    $settings['timestep']       = '10';
    $settings['apikey']         = 'd6985c41-bfc2-4afa-95a7-72cd2acb604c';
    $settings['storedQueryId']  = 'livi::observations::road::default::timevaluepair';
    $settings['bbox']           = '17.91,58.71,32.61,70.59';

    $starttime = date("Y-m-d\TH:i:s", time()-2*60*60-14*60);
    $endtime = date("Y-m-d\TH:i:s", time()-2*60*60-4*60);

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

        foreach($data->member as $key => $parameterValue){
            $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
            foreach($dataValues->point as $key => $datavalue){

                $time = (string)$datavalue->MeasurementTVP->time;
                $epoctime = strtotime($time);
                $value = (string)$datavalue->MeasurementTVP->value;
                $valuesArray["fmisid"] = (string)$parameterValue        -> children('omso', true)  ->
                                         PointTimeSeriesObservation     -> children('om', true)    ->
                                         featureOfInterest              -> children('sams', true)  ->
                                         SF_SpatialSamplingFeature      -> children('sam', true)   ->
                                         sampledFeature                 -> children('target', true)->
                                                                           children('target', true)->
                                                                           children('target', true)->
                                                                           children('gml', true)   ->identifier;

                $valuesArray["station"] = (string)$parameterValue     -> children('omso', true) ->
                                           PointTimeSeriesObservation -> children('om', true)   ->
                                           featureOfInterest          -> children('sams', true) ->
                                           SF_SpatialSamplingFeature  -> children('sams', true) -> 
                                           shape                      -> children('gml', true)  ->
                                           Point                      -> children('gml', true)  -> name;

                $latlon = (string)$parameterValue->children('omso', true)->PointTimeSeriesObservation->children('om', true)->featureOfInterest->children('sams', true)->SF_SpatialSamplingFeature->children('sams', true)->shape->children('gml', true)->Point->children('gml', true)->pos;
                $latlont = explode(' ',$latlon);

                $valuesArray["lat"] = $latlont[0];
                $valuesArray["lon"] = $latlont[1];

                $valuesArray["time"] = $time;
                $valuesArray["epoctime"] = $epoctime;
                $valuesArray["type"] = 'road';

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
    return $dataArray;
}


function synopdata() {
    $settings = array();
    $settings['parameter']      = 'ws_10min,wg_10min,wd_10min';
    $settings['timestep']       = '10';
    $settings['apikey']         = 'd6985c41-bfc2-4afa-95a7-72cd2acb604c';
    $settings['storedQueryId']  = 'fmi::observations::weather::timevaluepair';
    $settings['bbox']           = '17.91,58.71,32.61,70.59';

    $starttime = date("Y-m-d\TH:i:s", time()-2*60*60-14*60);
    $endtime = date("Y-m-d\TH:i:s", time()-2*60*60-4*60);
/*
    $tz = new DateTimeZone("Europe/London");

    $endtime = (new DateTime("2 minutes ago",$tz))->format("Y-m-d\TH:i:s");
    $starttime = (new DateTime("12 minutes ago",$tz))->format("Y-m-d\TH:i:s");
*/
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

        foreach($data->member as $key => $parameterValue){
            $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
            foreach($dataValues->point as $key => $datavalue){

                $time = (string)$datavalue->MeasurementTVP->time;
                $epoctime = strtotime($time);
                $value = (string)$datavalue->MeasurementTVP->value;
                $valuesArray["fmisid"] = (string)$parameterValue        -> children('omso', true)  ->
                                         PointTimeSeriesObservation     -> children('om', true)    ->
                                         featureOfInterest              -> children('sams', true)  ->
                                         SF_SpatialSamplingFeature      -> children('sam', true)   ->
                                         sampledFeature                 -> children('target', true)->
                                                                           children('target', true)->
                                                                           children('target', true)->
                                                                           children('gml', true)   ->identifier;

                $valuesArray["station"] = (string)$parameterValue     -> children('omso', true) ->
                                           PointTimeSeriesObservation -> children('om', true)   ->
                                           featureOfInterest          -> children('sams', true) ->
                                           SF_SpatialSamplingFeature  -> children('sams', true) ->
                                           shape                      -> children('gml', true)  ->
                                           Point                      -> children('gml', true)  -> name;

                $latlon = (string)$parameterValue->children('omso', true)->PointTimeSeriesObservation->children('om', true)->featureOfInterest->children('sams', true)->SF_SpatialSamplingFeature->children('sams', true)->shape->children('gml', true)->Point->children('gml', true)->pos;
                $latlont = explode(' ',$latlon);

                $valuesArray["lat"] = $latlont[0];
                $valuesArray["lon"] = $latlont[1];
                $valuesArray["type"] = "synop";
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
    return $dataArray;

}
