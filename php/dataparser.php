<?php
header('Content-type: text/javascript');
// read data from cetcapabilities

// Only these WMS services may be queried.
$allowedServices = array(
  '//openwms.fmi.fi/geoserver/Radar/wms',
);

$serviceURL = filter_input(INPUT_GET, 'server', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$layerName = filter_input(INPUT_GET, 'name'  , FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if (!in_array($serviceURL, $allowedServices, true)) {
  http_response_code(400);
  print json_encode(array('error' => 'Unknown service'));
  exit;
}

$dataValues = array();
$url = "https:{$serviceURL}?service=WMS&version=1.3.0&request=GetCapabilities";
// GetCapabilities is about 0.5 MB, stop reading after 10 MB
$context = stream_context_create(array('http' => array('timeout' => 10)));
$xmlData = file_get_contents($url, false, $context, 0, 10 * 1024 * 1024);

$resultString = $xmlData === false ? false : simplexml_load_string($xmlData, 'SimpleXMLElement', LIBXML_NONET);
if ($resultString === false) {
  http_response_code(502);
  print json_encode(array('error' => 'Service not available'));
  exit;
}
$data = $resultString->Capability->Layer->Layer;

$results = array();

foreach($data as $layer) {
  $dataArray = array();
  $dataArray["title"] = (string)$layer->Title;
  $dataArray["name"] = (string)$layer->Name;
  $dataArray["abstract"] = (string)$layer->Abstract;
  $dataArray["crs"] = (string)$layer->CRS;
  $dataArray["dimension"] = (string)$layer->Dimension;

  if(($dataArray["name"]) === $layerName) {
    array_push($results, $dataArray);
  }

}

if($results[0]["name"] === "meteosat:msg_eview_3995") {
  $altResult = [];
  $altResult = $results[0];
  $dimensions = explode(",",$altResult["dimension"]);
  $output = $dimensions[0]."/".end($dimensions)."/PT15M";
  $altResult["dimension"] = $output;
  print json_encode($altResult,true);
} else {
  print json_encode($results[0],true);
}