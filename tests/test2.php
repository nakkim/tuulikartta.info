<?php 


$file = fopen("tiesaaasemat.csv", "r");
$roadstations = [];
while(! feof($file)){
    array_push($roadstations, fgetcsv($file));
}
fclose($file);

$i = 0;
$index = 1;
$updatedstation = [];
foreach($roadstations as $key => $station){
    $fmisid = $station[0];
    $coordinates = getCoordinates($fmisid,$index);
    $coordinates2 = explode(",", $coordinates);
    $station['lat'] = $coordinates2[0];
    $station['lon'] = $coordinates2[1];
    
    array_push($updatedstation,$station);
    
    if(count($station)*1/3 < $i){ 
        $index = 2;
    }
    if(count($station)*2/3 < $i){ 
        $index = 3;
    }
    $i = $i+1;
}


$file = fopen("road.csv","w");
foreach ($updatedstation as $key => $station){
    if(count(3)){
        fputcsv($file, $station);
    } else {
        fputcsv($file, ["",""]);
    }
    
}
fclose($file);


function getCoordinates($fmisid,$index){
    
    /*
    Latitude of natural origin: 0°
    Longitude of natural origin: 27°E
    Scale factor at natural origin: 0.9996
    False easting: 500000m
    False northing: 0m
    Latitude: 1 deg = 110.574 km
    Longitude: 1 deg = 111.320*cos(latitude) km

    60.2280806,24.596199
    60.4050979,24.578567
    */
    
    $apikey = "d6985c41-bfc2-4afa-95a7-72cd2acb604c";
    if($index === 2){
        $apikey = "c1121e1c-dcf6-4c86-a5ef-0817920cd457";
    } 
    if($index === 3){
        $apikey = "c39c0583-4eba-42e2-b5a9-feaba106c2d7";
    }
     
    $url = "http://data.fmi.fi/fmi-apikey/". $apikey ."/wfs?request=getFeature&storedquery_id=livi::observations::road::default::timevaluepair&crs=EPSG::3067&timestep=10&fmisid=". $fmisid ."&parameters=windspeedms&starttime=201704041200";
    $data = file_get_contents($url);
    $value = GetBetween("<gml:pos>","</gml:pos>",$data);

    $gml_values = explode(" ", $value);

    $gml_values[0] = $gml_values[0] - 500000;
    $gml_values[1] = $gml_values[1];

    $lat = ($gml_values[1] / 110574);
    $lon = 27 + $gml_values[0] / (111320  * cos(0.0174532925*$lat));

    $return = "$lat,$lon";

    return $return;
    
}

function GetBetween($var1,$var2,$pool){
        $temp1 = strpos($pool,$var1)+strlen($var1);
        $result = substr($pool,$temp1,strlen($pool));
        $dd=strpos($result,$var2);
        if($dd == 0){
            $dd = strlen($result);
        }

        return substr($result,0,$dd);
    }

