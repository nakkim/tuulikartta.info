<?php

// http://data.fmi.fi/fmi-apikey/d6985c41-bfc2-4afa-95a7-72cd2acb604c/wfs?request=getFeature&storedquery_id=livi::observations::road::default::timevaluepair&crs=EPSG::3067&timestep=10&fmisid=100002&fmisid=100004&parameters=rh,t2m
date_default_timezone_set('Europe/Helsinki');

$output = "";
$roadStations = file_get_contents('roadweatherstations.csv');
$lines = explode(PHP_EOL, $roadStations);
$roadStationArray = array();
foreach ($lines as $line) {
    $roadStationArray[] = str_getcsv($line);
}

foreach($roadStationArray as $array){
    $output .= "&fmisid=".$array[0];    
}
$output .= "&";

echo "<pre>";
print_r(getRoadData($output));
echo "</pre>";

function getRoadData($fmisid){
    
    $roadStations = file_get_contents('roadweatherstations.csv');
    $lines = explode(PHP_EOL, $roadStations);
    $roadStationArray = array();
    foreach ($lines as $line) {
        $roadStationArray[] = str_getcsv($line);
    }
    //print_r($roadStationArray);
    
    $settings = [];
    $settings['parameter']      = 'rh,t2m,windspeedms,vis,dewpoint';
    $settings['timestep']       = '5';
    //$settings['apikey']         = 'd6985c41-bfc2-4afa-95a7-72cd2acb604c';
    $settings['apikey']         = 'fd2a6bd5-0236-4524-bc08-2af7cbb803e2';
    $settings['storedQueryId']  = 'fmi::observations::weather::timevaluepair';
    
	
	$endtime = "2017-04-12T12:10:00";//date("Y-m-d\TH:i:s", time());
	$starttime = "2017-04-12T12:30:00";//date("Y-m-d\TH:i:s", time()-2*60*60);
	
    $url = "http://data.fmi.fi/fmi-apikey/".$settings['apikey']."/wfs?request=getFeature&storedquery_id=livi::observations::road::default::timevaluepair&crs=EPSG::3067&timestep=5".$fmisid."parameters=" . $settings['parameter'];
    //echo $url;
	$xmlData = file_get_contents($url);
    $resultString = simplexml_load_string($xmlData);
	
    //$data = $resultString->children('wfs', true)->member->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
    if(!$resultString){
        print "oops, something went wrong";
    } else {
        $data = $resultString->children('wfs', true);
        
        $params = explode(',', $settings['parameter']);
        $dataArray = [];
        $dataArrayValues = [];

        //print count($data->member);

        $s=0;
        foreach($data->member as $key => $parameterValue){
            $i = 0;
            
            if($s > count($params)-1){
                $s = 0;
            }
            
            
            $dataValues = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->result->children('wml2', true)->MeasurementTimeseries;
            foreach($dataValues->point as $key => $datavalue){

                $stationinfo = $parameterValue ->children('omso', true)->PointTimeSeriesObservation->children('om', true)->featureOfInterest->children('sams', true)->SF_SpatialSamplingFeature->children('sams', true)->shape->children('gml', true)->Point->children('gml', true)->name;
               
                $dataArrayValues[$i]['station']   =  (string)$stationinfo;
                $dataArrayValues[$i]['stationType']   =  'road';
                $dataArrayValues[$i]['time']      =  strtotime($datavalue->MeasurementTVP->time);
                $dataArrayValues[$i]['timestamp'] =  (string)$datavalue->MeasurementTVP->time;
                for($x=0; $x<$s; $x++){
                    $dataArrayValues[$i][$params[$x]]  = (string)$datavalue->MeasurementTVP->value;
                }
                
                $i++;
                //print $s ." " . $i ."\n" ;
                        
            }
            $s++;   
            array_push($dataArray,$dataArrayValues);
                
        }

        $finalvalues = [];
        foreach($dataArray as $key => $dataStep){
            // remove all but last
            $finalvalues[$key] = $dataStep[count($dataStep)-1];
        }

        $totallyfinalvalues = [];
        $i=0;
        foreach($finalvalues as $key => $data){
            $i=$i+1;
            if($i === 5){
                array_push($totallyfinalvalues,$data);
                $i=0;
            }
        }
    
        // add latlon values to stationdata array
        // print_r($totallyfinalvalues);
        $returnValues = [];
        foreach($roadStationArray as $key => $station){
            foreach($totallyfinalvalues as $key2 => $obs){
                if($obs['station'] === $station['1']){
                    $obs['lat'] = $station[3];
                    $obs['lon'] = $station[2];
                    array_push($returnValues,$obs);
                    
                }
            }
            
        }     
        print_r($returnValues);
        
    }
}

