<?php

$file = fopen("roadweatherstations.csv", "r");
$roadstations = [];
while(! feof($file)){
    array_push($roadstations, fgetcsv($file));
}
fclose($file);

/*
$i = 0;
$index = 1;
$updatedstation = [];
foreach($roadstations as $key => $station){
    $fmisid = $station[0];
	
	$data = getRoadData($fmisid,$index);
    $station['lat'] = $station[3];
	$station['lon'] = $station[2];
	$station['title'] = $station[1];
    $station['fmisid'] = $station[0];
    unset($station[0]);
    unset($station[1]);
    unset($station[2]);
    unset($station[3]);

	echo "<pre>";
	print_r($data);
	echo "</pre>";
	
	
	foreach($data[count($data)-1] as $value){
		array_push($station, $value);
	}
	
	echo "<pre>";
	print_r($station);
	echo "</pre>";
	
	$station['epoctime'] = $station[4];
	$station['timestamp'] = $station[5];
    $station['windspeems'] = $station[6];
    unset($station[4]);
    unset($station[5]);
    unset($station[6]);
	
	
	//echo "<pre>";
	//print_r($station);
	//echo "</pre>";
    array_push($updatedstation,$station);
	
    if(count($station)*1/3 < $i){ 
        $index = 2;
    }
    if(count($station)*2/3 < $i){ 
        $index = 3;
    }
    $i = $i+1;
}


echo "<pre>";
print_r($updatedstation);
echo "</pre>";
*/

echo "<pre>";
print_r(getRoadData(100002,1));
echo "</pre>";

function getRoadData($fmisid1,$index){
    $settings = [];
    $settings['fmisid']         = $fmisid1;
    $settings['parameter']      = 'windspeedms';
    $settings['timestep']       = '10';

    $apikey = "d6985c41-bfc2-4afa-95a7-72cd2acb604c";
    if($index === 2){
        $apikey = "c1121e1c-dcf6-4c86-a5ef-0817920cd457";
    } 
    if($index === 3){
        $apikey = "c39c0583-4eba-42e2-b5a9-feaba106c2d7";
    }
    $settings['storedQueryId']  = 'livi::observations::road::default::timevaluepair';
    $settings['starttime']      = date("YmdHi", mktime(date("H") - 5, 0, 0, date("m"), date("d"), date("Y")));
    
    $url = 'http://data.fmi.fi/fmi-apikey/' . $apikey . '/wfs?request=getFeature&storedquery_id=' . $settings['storedQueryId'] . '&crs=EPSG::3067&timestep=' . $settings['timestep'] . '&fmisid=' . $fmisid1 . '&parameters=' . $settings['parameter'] . '&starttime=' . $settings['starttime'];
    echo $url;
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