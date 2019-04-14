<?php
$starttime = date("Y-m-d\TH:i:s\Z", time()-(date('Z')/3600)*60*60-60*60);
$endtime = date("Y-m-d\TH:i:s\Z", time()-(date('Z')/3600)*60*60);

$settings = array();
$settings["parameter"]      = "ri_10min,ws_10min,wg_10min,wd_10min,vis,wawa,temperature";
$settings["storedQueryId"]  = "fmi::observations::weather::timevaluepair";
$settings["bbox"]           = "17.91,58.71,32.61,70.59";

$url = "";
$url .= "http://opendata.fmi.fi/wfs?request=getFeature";
$url .= "&storedquery_id={$settings["storedQueryId"]}";
$url .= "&parameters={$settings["parameter"]}";
$url .= "&bbox={$settings["bbox"]},epsg::4326&";
$url .= "&starttime=${starttime}&endtime=${endtime}";

print $url;

$xmlData = file_get_contents($url);
$resultString = simplexml_load_string($xmlData);

$result = array();
$tmp = array();

$data = $resultString->children("wfs", true);
$params = explode(",", $settings["parameter"]);

$x = 0;
foreach ($data->member as $key => $locations) {            
    $station = (string)$locations
            -> children("omso", true)->PointTimeSeriesObservation
            -> children("om", true)->featureOfInterest
            -> children("sams", true)->SF_SpatialSamplingFeature
            -> children("sams", true)->shape
            -> children("gml", true)->Point
            -> children("gml", true)->name;

    $blop = $locations
        ->children("omso", true)->PointTimeSeriesObservation
        ->children("om", true)->result
        ->children("wml2", true)->MeasurementTimeseries;

    $latlon = (string)$locations
            ->children("omso", true)->PointTimeSeriesObservation
            ->children("om", true)->featureOfInterest
            ->children("sams", true)->SF_SpatialSamplingFeature
            ->children("sams", true)->shape
            ->children("gml", true)->Point
            ->children("gml", true)->pos;
    $latlon = explode(" ",$latlon);

    $presum = 0;            
    $index = 0;
    foreach ($blop->point as $key => $measurement) {
        
        $value = (float)$measurement->MeasurementTVP->value;
        $time = (string)$measurement->MeasurementTVP->time;
        $epoctime = strtotime($time);

        $tmp[$params[$x]] = $value;

        if($value == "NaN"){
            $value = null;
        }
    
        $tmp["station"] = $station;
        $tmp["lat"] = floatval($latlon[0]);
        $tmp["lon"] = floatval($latlon[1]);
        $tmp["time"] = $time;
        $tmp["epoctime"] = intval($epoctime);
        $tmp["type"] = "synop";
        
        $index = $index+1;

    }
    if ($x < count($params)-1) {
        $x = $x+1;
    } else {
        array_push($result,$tmp);
        $x = 0;
    }
}
print_r($result);