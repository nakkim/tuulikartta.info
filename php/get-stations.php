<?php

/* 
 *  get station data from file
 */

$file = fopen("stations.csv", "r");
$stations = [];
while(! feof($file)){
    array_push($stations, fgetcsv($file));
}
fclose($file);




// modify array names and set key names
$fixedStations = [];
$stationNames = [];
foreach($stations as $key => $station){
    
    array_push($stationNames, $key);
    $station['title'] = $station[0];
    $station['fmisid'] = $station[1];
    $station['lpnn'] = $station[2];
    $station['wmo'] = $station[3];
    $station['lat'] = $station[4];
    $station['lon'] = $station[5];
    $station['korkeus'] = $station[6];
    $station['group'] = $station[7];
    $station['since'] = $station[8];
    unset($station[0]);
    unset($station[1]);
    unset($station[2]);
    unset($station[3]);
    unset($station[4]);
    unset($station[5]);
    unset($station[6]);
    unset($station[7]);
    unset($station[8]);
    
    //$station['title'] = substr($station['title'], 0, -1);
    $station['lat'] = str_replace(',','.',$station['lat']);
    $station['lon'] = str_replace(',','.',$station['lon']);
    
    $key = $station['title'];
    $fixedStations[$key] = $station;
}

$stations = [];
$i = 0;
$index = 1;
foreach($fixedStations as $key => $station){
    if(count($fixedStations) / 2 < $i){
        $index = 2;
    } 
    $data = getData($station['fmisid'],$index);
	//print '<pre>';
	//print_r($data);
	//print '</pre>';
	$value = $data[count($data)-1]['timestamp'];
    $time = $data[count($data)-1]['time'];
    $value1 = $data[count($data)-1]['ws_10min'];
    $value2 = $data[count($data)-1]['wd_10min'];
    $value3 = $data[count($data)-1]['vis'];
    $value4 = $data[count($data)-1]['t2m'];
	$value5 = $data[count($data)-1]['wg_10min'];
    
    $station['epoctime'] = $time;
    $station['time'] = $value;
    $station['ws_10min'] = $value1;
    $station['wd_10min'] = $value2;
    $station['vis'] = $value3;
    $station['t2m'] = $value4;
	$station['wg_10min'] = $value5;
    array_push($stations, $station);
    $i = $i + 1;    
}


if(!$stations) {
    echo "Someting went wrong :I";
} else {
    $numberofstations = count($stations);
    echo date('d.m.Y H:i:s') . "<br>"; 
    echo "Found observation data from $numberofstations stations </br>";
    echo "Create data.json... </br>";
    writeToFile($stations);
    echo "Done";

}


//print_r($stations);




/* functions */

function writeToFile($array){
    $fp = fopen('data.json','w');
    fwrite($fp, json_encode($array));
    
}


function getData($fmisid,$index){
    
    $settings = [];
    $settings['fmisid']         = $fmisid;
    $settings['parameter']      = 'ws_10min,wd_10min,wg_10min,vis,t2m';
    $settings['timestep']       = '10';

    $settings['apikey']         = 'd6985c41-bfc2-4afa-95a7-72cd2acb604c';
    if($index > 1) {
        $settings['apikey']     = 'cac771a4-bec5-4a26-9285-833525011569';
    }
 
    $settings['storedQueryId']  = 'fmi::observations::weather::timevaluepair';
    $settings['starttime']      = date("YmdHi", mktime(date("H") - 3, 0, 0, date("m"), date("d"), date("Y")));
    
    $url = 'http://data.fmi.fi/fmi-apikey/' . $settings['apikey'] . '/wfs?request=getFeature&storedquery_id=' . $settings['storedQueryId'].'&crs=EPSG::3067&timestep=' . $settings['timestep'] . '&fmisid=' . $settings['fmisid'] . '&parameters=' . $settings['parameter'] . '&starttime=' . $settings['starttime'];
    //echo $url;
	$xmlData = file_get_contents($url);
    $resultString = simplexml_load_string($xmlData);
    //$data = $resultString->children('wfs', true)->member->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
    $data = $resultString->children('wfs', true);
    
    $params = explode(',', $settings['parameter']);
    $dataArray = [];
    $s=0;
    
    foreach($data->member as $key => $parameterValue){
        $i = 0;
        $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
        foreach($dataValues->point as $key => $datavalue){
            $dataArray[$i]['time']      = strtotime($datavalue->MeasurementTVP->time);
            $dataArray[$i]['timestamp'] = (string)$datavalue->MeasurementTVP->time;
            $dataArray[$i][$params[$s]]  = (string)$datavalue->MeasurementTVP->value;
            $i++;
        }
        $s++;
        
    }
     
    return $dataArray;
}



function getRoadData($fmisid){
    $settings = [];
    $settings['fmisid']         = $fmisid;
    $settings['parameter']      = 'windspeedms';
    $settings['timestep']       = '10';

    $settings['apikey']         = 'd6985c41-bfc2-4afa-95a7-72cd2acb604c';
    $settings['storedQueryId']  = 'livi::observations::road::default::timevaluepair';
    $settings['starttime']      = date("YmdHi", mktime(date("H") - 5, 0, 0, date("m"), date("d"), date("Y")));
    
    $url = 'http://data.fmi.fi/fmi-apikey/' . $settings['apikey'] . '/wfs?request=getFeature&storedquery_id=' . $settings['storedQueryId'].'&crs=EPSG::3067&timestep=' . $settings['timestep'] . '&fmisid=' . $settings['fmisid'] . '&parameters=' . $settings['parameter'] . '&starttime=' . $settings['starttime'];
    //echo $url;
	$xmlData = file_get_contents($url);
    $resultString = simplexml_load_string($xmlData);
    //$data = $resultString->children('wfs', true)->member->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
    $data = $resultString->children('wfs', true);
    
    $params = explode(',', $settings['parameter']);
    $dataArray = [];
    $s=0;
    
    foreach($data->member as $key => $parameterValue){
        $i = 0;
        $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
        foreach($dataValues->point as $key => $datavalue){
            $dataArray[$i]['time']      = strtotime($datavalue->MeasurementTVP->time);
            $dataArray[$i]['timestamp'] = (string)$datavalue->MeasurementTVP->time;
            $dataArray[$i][$params[$s]]  = (string)$datavalue->MeasurementTVP->value;
            $i++;
        }
        $s++;
        
    }
     
    return $dataArray;
}




// output values
// $data = json_encode($fixedStations,JSON_UNESCAPED_UNICODE);
// echo $data;