<?php

$latlon = filter_input(INPUT_GET, 'latlon', FILTER_SANITIZE_STRING);

$dataMiner = new DataMiner();
print HarmonieForecast($latlon);








/**
 *
 * Format data as a javascript array
 * @param    data as php aarray 
 * @return   data as javascript array string
 *
 */

function formatData($data) {

    $formattedData = "";

    $temp = "";
    $symb = "";
    $text = "";
    $dark = "";
    $prec = "";

    foreach($data as $array) {

        $temp .= "[".$array["epochtime"].",".$array["temperature"]."],";
        $symb .= "[".$array["epochtime"].",".$array["weathersymbol3"]."],";
        $text .= "[".$array["epochtime"].",".$array["smartsymboltext"]."],";
        $dark .= "[".$array["epochtime"].",".$array["dark"]."],";
        $prec .= "[".$array["epochtime"].",".$array["precipitation1h"]."],";
    }

    // remove last comma and add closing bracket

    $temp = substr($temp, 0, -1);
    $symb = substr($symb, 0, -1);
    $text = substr($text, 0, -1);
    $dark = substr($dark, 0, -1);
    $prec = substr($prec, 0, -1);

    $formattedData = "{\"temperature\":[".$temp."],\"weathersymbol3\":[".$symb."],\"dark\":[".$dark."],\"precipitation1h\":[".$prec."]}";

    //return $formattedData;
    return "[[5, 2], [6, 3], [8, 2]]";
}

