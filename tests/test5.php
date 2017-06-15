<?php


echo "<pre>";
print_r(getSynopData());
echo "</pre>";

function getSynopData(){

    $settings = [];
    $settings['parameter']      = 'rh,t2m,windspeedms,vis,dewpoint';
    $settings['timestep']       = '5';
    $settings['apikey']         = 'fd2a6bd5-0236-4524-bc08-2af7cbb803e2';
    $settings['storedQueryId']  = 'fmi::observations::weather::timevaluepair';
    
	
	$endtime = "2017-04-12T12:10:00";
	$starttime = "2017-04-12T12:30:00";//date("Y-m-d\TH:i:s", time()-2*60*60);
	
    $url = "http://data.fmi.fi/fmi-apikey/".$settings['apikey']."/wfs?request=getFeature&storedquery_id=livi::observations::road::default::timevaluepair&timestep=10&parameters=" . $settings['parameter'] . "&bbox=18.89,59.89,30.81,60.92,epsg::4326&";
    // echo $url;
	$xmlData = file_get_contents($url);
    $resultString = simplexml_load_string($xmlData);
	
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
        print_r($totallyfinalvalues);
    }
}

?>