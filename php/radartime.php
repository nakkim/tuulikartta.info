<?php



// get radar layer timestamp from Getcapabilities

// selected radar layer
$radarLayer = filter_input(INPUT_GET, 'layer', FILTER_SANITIZE_STRING);
$radarLayer = "kesalahti_hclass";

$url = 'https://wms.fmi.fi/fmi-apikey/d6985c41-bfc2-4afa-95a7-72cd2acb604c/geoserver/Radar/wms?request=getcapabilities';

$xmlData = file_get_contents($url) or die('Unable to connect to ${url}');
$sxe     = simplexml_load_string($xmlData);

$layers  = $sxe -> Capability -> Layer -> children();

foreach($layers as $layer) {

    if(null !== $layer -> Name) {

        // remove whitespaces
        $layername = str_replace(' ', '', $layer -> Name);
        
        if($layername === $radarLayer) {            
            $name = $layername;
            $time = ((string)$layer -> Dimension);
        }
    }
}

$time = explode('/',$time);

$result['starttime'] = $time[0];
$result['endtime']  = $time[1];
$result['timestep'] = $time[2];
$result['name'] = $name;

print json_encode($result);

