<?php
require_once("dataMiner.php");
header('Content-Type: application/json');

$latlon      = filter_input(INPUT_GET, 'latlon', FILTER_SANITIZE_STRING);
$fmisid      = filter_input(INPUT_GET, 'fmisid', FILTER_SANITIZE_STRING);
$type        = filter_input(INPUT_GET, 'type', FILTER_SANITIZE_STRING);
$timestamp   = filter_input(INPUT_GET, 'timestap', FILTER_SANITIZE_STRING);

$dataMiner = new DataMiner();
$data = [];

if ($type == 'road') {
    $obs = $dataMiner->roadObservation($fmisid);
    // $for = $dataMiner->HarmonieForecast($latlon);
    //$data = $dataMiner->combineData($obs, $for);
}
if ($type == 'synop') {
    $obs = $dataMiner->synopObservation($fmisid,$timestamp);
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
        $dir  = "";
        $temp = "";
        $rr1h = "";
        
        $i = 0;
        foreach($dataArray as $array) {
            $temp .= "[".$array["epoch"].",".$array["t2m"]."],";
            $rr1h .= "[".$array["epoch"].",".$array["rr1h"]."],";
            $wind .= "[".$array["epoch"].",".$array["ws"].",".$array["wg"]."],";
            if ($i % 3 == 0) {
                if (floatval($array["ws"]) >= 1.0) {
                    $dir  .= "[".$array["epoch"].",".$array["ws"].",".$array["wd"]."],";
                } else {
                    $dir  .= "[".$array["epoch"].",null,".$array["wd"]."],";
                }

            } else {
                $dir  .= "[".$array["epoch"].",null,null],";
            }
            $i++;
        }

        // remove last comma and add closing bracket
        
        $wind = substr($wind, 0, -1);
        $dir  = substr($dir, 0, -1);
        $temp = substr($temp, 0, -1);
        $rr1h = substr($rr1h, 0, -1);
    
        $formattedData .= "\"{$key}\":{\"wind\":[".$wind."],\"dir\":[".$dir."],\"rr1h\":[".$rr1h."],\"temp\":[".$temp."]},";
        
    }
    $formattedData = substr($formattedData, 0, -1);
    $formattedData .= "}";
    return $formattedData;
    
}