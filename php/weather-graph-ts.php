<?php
require_once("dataMiner.php");

$latlon = filter_input(INPUT_GET, 'latlon', FILTER_SANITIZE_STRING);
$fmisid = filter_input(INPUT_GET, 'fmisid', FILTER_SANITIZE_STRING);
$type   = filter_input(INPUT_GET, 'type', FILTER_SANITIZE_STRING);

$dataMiner = new DataMiner();
$data = [];

if ($type == 'road') {
    $obs = $dataMiner->roadObservation($fmisid);
    // $for = $dataMiner->HarmonieForecast($latlon);
    //$data = $dataMiner->combineData($obs, $for);
}
if ($type == 'synop') {
    $obs = $dataMiner->synopObservation($fmisid);
    // $for = $dataMiner->HarmonieForecast($latlon);
    //$data = $dataMiner->combineData($obs, $for);
}

$combinedData = [];
$combinedData["obs"] = $obs;
$combinedData["for"] = [];

print formatWindData($combinedData);




/**
 *
 * Format data as a javascript array
 * @param    data as php aarray
 * @return   data as javascript array string
 *
 */


function formatWindData($data) {
    $formattedData = "{";
    foreach($data as $key => $dataArray){
        $wind = "";
        $dir = "";
        
        foreach($dataArray as $array) {
            
            $wind .= "[".$array["epoch"].",".$array["ws"].",".$array["wg"]."],";
            $dir  .= "[".$array["ws"].",".$array["wd"]."],";
        }

        // remove last comma and add closing bracket
        
        $wind = substr($wind, 0, -1);
        $dir  = substr($dir, 0, -1);
    
        $formattedData .= "\"{$key}\":{\"wind\":[".$wind."],\"dir\":[".$dir."]},";
        
    }
    $formattedData = substr($formattedData, 0, -1);
    $formattedData .= "}";
    return $formattedData;
    
}