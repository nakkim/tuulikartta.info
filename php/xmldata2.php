<?php
date_default_timezone_set('GMT');
$starttime = date("Y-m-d\TH:i:s\Z", time()-(date('Z')/3600)*60*60-60*60);
$endtime = date("Y-m-d\TH:i:s\Z", time()-(date('Z')/3600)*60*60);

$settings = array();
$settings["parameter"]      = "ri_10min,ws_10min,wg_10min,wd_10min,vis,wawa,temperature";
$settings["storedQueryId"]  = "fmi::observations::weather::multipointcoverage";
$settings["bbox"]           = "16.58,58.81,34.8,70.61";
// $settings["bbox"]           = "23.76,59.97,25.46,60.52";

$url = "";
$url .= "http://opendata.fmi.fi/wfs?request=getFeature";
$url .= "&storedquery_id={$settings["storedQueryId"]}";
$url .= "&parameters={$settings["parameter"]}";
$url .= "&bbox={$settings["bbox"]},epsg::4326&";
$url .= "&starttime=${starttime}&endtime=${endtime}";

print $url."\n";

$xmlData = file_get_contents($url);
$resultString = simplexml_load_string($xmlData);

$result = array();
$tmp = array();

$data = $resultString->children("wfs", true);
$params = explode(",", $settings["parameter"]);

$result1 = [];
$result2 = [];
foreach ($data->member as $key => $locations) {            
    
    // station names and fmisid's
    $stations = $locations
            -> children("omso", true)->GridSeriesObservation
            -> children("om", true)->featureOfInterest
            -> children("sams", true)->SF_SpatialSamplingFeature
            -> children("sam", true)->sampledFeature
            -> children("target", true)->LocationCollection->member;

    foreach ($stations as $station) {
        $tmp = [];
        $name = $station -> children ("target", true)->Location
                         -> children ("gml", true)->name;
        $fmisid = $station -> children ("target", true)->Location
                         -> children ("gml", true)->identifier;

        $tmp["station"] = (string)$name;
        $tmp["fmisid"] = (string)$fmisid;
        array_push($result1,$tmp);
    }

    // station names and coordinates
    $stations = $locations
            -> children("omso", true)->GridSeriesObservation
            -> children("om", true)->featureOfInterest
            -> children("sams", true)->SF_SpatialSamplingFeature
            -> children("sams", true)->shape
            -> children("gml", true)->MultiPoint;

    foreach ($stations->pointMember as $station) {
        $tmp = [];
        $name = $station -> children ("gml", true)->Point
                         -> children ("gml", true)->name;
        $pos = $station  -> children ("gml", true)->Point
                         -> children ("gml", true)->pos;

        $tmp["station"] = (string)$name;
        $tmp["pos"] = (string)$pos;
        array_push($result2,$tmp);
    }
    
    // merge station arrays
    $stations = [];
    foreach($result1 as $key => $station) {
        $stations[$key] = array_merge($result1[$key],$result2[$key]);
    }

    // station coordinates and timestamps
    $latlons = $locations
            -> children("omso", true)->GridSeriesObservation
            -> children("om", true)->result
            -> children("gmlcov", true)->MultiPointCoverage
            -> children("gml", true)->domainSet
            -> children("gmlcov", true)->SimpleMultiPoint
            -> children("gmlcov", true)->positions;

    $latlons = explode("                ",(string)$latlons);
    $numberOfStations = count($latlons);
    $i = 0;
    $timestamps = [];
    foreach ($latlons as $latlon) {
        $tmp = [];
        if($i>0 && $i<($numberOfStations-1)) {
            $latlon = explode(" ",(string)$latlon);
            $tmp["lat"] = $latlon[0];
            $tmp["lon"] = $latlon[1];
            $epoch = str_replace("\n", "", $latlon[3]);
            $tmp["epochtime"] = $epoch;

            // convert UNIX timestamp to time
            $tmp["time"] = date("Y-m-d\TH:i:s\Z", intval($latlon[3]));
            array_push($timestamps,$tmp);
        }
        $i++;
    }

    // combine station arrays as one
    $i = 0;
    $result = [];
    foreach($timestamps as $measurement) {
        $posstring = $measurement["lat"]." ".$measurement["lon"]. " ";
        if($posstring == $stations[$i]["pos"]) {
            array_push($result,array_merge($stations[$i],$measurement));
        } else {
            $i++;
            array_push($result,array_merge($stations[$i],$measurement));
        }
    }

    // actual observations
    $parameters = explode(",",$settings["parameter"]);
    $observations = $locations
            -> children("omso", true)->GridSeriesObservation
            -> children("om", true)->result
            -> children("gmlcov", true)->MultiPointCoverage
            -> children("gml", true)->rangeSet
            -> children("gml", true)->DataBlock
            -> children("gml", true)->doubleOrNilReasonTupleList;
    
    $observations = explode("                ",(string)$observations);

    $tmp = [];
    foreach($observations as $key => $observation) {
        if($key > 0 and $key < (count($observations)-1))
        $tmp[$key] = explode(" ",$observation);
    }

    $observations = [];
    foreach($tmp as $observation) {
        for($x=0; $x<count($parameters); $x++) {

            $tmp2[$parameters[$x]] = $observation[$x];
        }
        array_push($observations,$tmp2);
    }

    // merge station data and observation arrays
    $final = [];
    foreach($observations as $key => $observation) {
        array_push($final,array_merge($result[$key],$observations[$key]));
    }

}
print_r($final);