<?php

/**
 * DataMiner class
 * @author Ville Ilkka
 */

class DataMiner{

    function __construct(){

    }

    /**
    *
    * Calculate time zone difference between UTC0 and local time in Helsinki 
    * @return time zone dirrerence as integer
    *
    */

    public function getTimezoneDifference() {

        $dateTimeZoneHelsinki = new DateTimeZone("Europe/Helsinki");
        $dateTimeZoneLondon = new DateTimeZone("Europe/London");

        $dateTimeHelsinki = new DateTime("now", $dateTimeZoneHelsinki);
        $dateTimeLondon = new DateTime("now", $dateTimeZoneLondon);
        
        $timeOffset = $dateTimeZoneHelsinki->getOffset($dateTimeLondon);

        $timeOffset = $timeOffset/3600;
        return $timeOffset;
        
    }

    /**
    *
    * Get latest road weather observations 
    * @return   data as php array
    *
    */

    public function roaddata($timestamp) {
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=road";
        $url .= "&keyword=tiesääasemat";
        $url .= "&precision=double";
        $url .= "&param=name%20as%20station,fmisid,utctime%20as%20time,lat,lon,visibility,vsaa%20as%20wawa,temperature,wg%20as%20wg_10min,ws%20as%20ws_10min,wd%20as%20wd_10min,pri%20as%20ri_10min,sum_t(pri:60m:60m)%20as%20ri_1h";
        $url .= "&missingtext=nan";
        $url .= "&maxlocations=10";

        if($timestamp == "now") {
            $url .= "&endtime=now";
        } else {
            $url .= "&starttime={$timestamp}&endtime={$timestamp}&timestep=10";
        }
        
        $data = file_get_contents($url) or die("Unable to get data from {$url}");
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        $observationData = [];
        foreach ( $data as $key => $observation ) {

            $tmp = $observation;

            date_default_timezone_set("UTC");
            $time = strtotime($observation["time"]);
            $tmp["time"] = date('Y-m-d\TH:i:s\Z',$time);

            $tmp["type"] = "road";
            
            $date = new DateTime($observation["time"]);
            $tmp["epoctime"] = intVal($date->format('U'));
            array_push($observationData,$tmp);

        }

        return $observationData;
    }

    /**
    *
    * Opendata synop observations
    * @return   data as php array
    *
    */

    public function opensynop($timestapm) {
        $starttime = date("Y-m-d\TH:i:s", time()-2*60*60-13*60);
        $endtime = date("Y-m-d\TH:i:s", time()-2*60*60-3*60);

        $settings = array();
        $settings["parameter"]      = "ri_10min,ws_10min,wg_10min,wd_10min,vis,wawa,temperature";
        $settings["storedQueryId"]  = "fmi::observations::weather::timevaluepair";
        $settings["bbox"]           = "17.91,58.71,32.61,70.59";//"24.0364,60.8705,24.8762,61.1229";
        $settings["timestep"]       = "10";
        $url = "";
        $url .= "http://opendata.fmi.fi/wfs?request=getFeature";
        $url .= "&storedquery_id={$settings["storedQueryId"]}";
        $url .= "&timestep={$settings["timestep"]}";
        $url .= "&parameters={$settings["parameter"]}";
        $url .= "&bbox={$settings["bbox"]},epsg::4326&";
        $url .= "&starttime=${starttime}&endtime=${endtime}";

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
                
                $value = (string)$measurement->MeasurementTVP->value;
                $time = (string)$measurement->MeasurementTVP->time;
                $epoctime = strtotime($time);

                // calculate 1h precipitation sum
                // if($x === 0) {
                //     if($value === "NaN"){
                //         $value = "0";
                //     }
                //     $presum = $presum + floatval($value);
                //     $tmp[$params[$x]] = $presum;
                // } else {
                //     $tmp[$params[$x]] = $value; 
                // }

                if($value == "NaN"){
                    $value = null;
                }
                $tmp[$params[$x]] = $value;
            
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
        return $result;
    }


       /**
    *
    * Opendata roadweather observations
    * @return   data as php array
    *
    */

    public function openroad($timestapm) {
        $starttime = date("Y-m-d\TH:i:s", time()-2*60*60-13*60);
        $endtime = date("Y-m-d\TH:i:s", time()-2*60*60-3*60);

        $settings = array();
        $settings["parameter"]      = "pri,ws,wg,wd,vis,prst1,ta";
        $settings["storedQueryId"]  = "livi::observations::road::finland::timevaluepair";
        $settings["bbox"]           = "17.91,58.71,32.61,70.59";
        $settings["timestep"]       = "1";
        $settings["latlons"]        = "60.4425392,21.0728703,60.2054710,19.5665092,60.4687004,22.3745403,60.4978485,22.2843704,61.1102600,22.6530209,60.8252411,21.5790100,62.1162300,22.2454491,60.3207016,24.9975796,60.4644318,24.9460106,60.2708282,24.7702103,60.2849312,25.0160999,60.1661186,24.8908997,60.0605888,24.0758991,60.1689682,24.8231201,60.1138115,24.4009991,60.1529694,24.6675396,60.1640816,24.8524609,60.1728401,23.1474495,60.8186798,25.0487194,60.5051689,25.5382595,63.5208817,24.6692505,61.9697990,24.6131496,61.5882187,27.6226196,61.4911613,28.2546005,63.7673988,24.2450809,63.6556587,24.0092697,62.4489288,23.6260700,62.9693108,23.0496693,62.7712288,23.5278893,62.0210419,24.0167599,62.7435112,22.6267605,62.4809990,22.2810001,62.6859398,22.4859409,62.7954216,22.7787399,62.4962883,21.8054905,63.3346214,23.5154495,63.6393204,22.8201809,63.1705818,23.8195801,62.7033806,26.4636192,62.0541992,29.6112003,63.1875992,30.1470299,62.7971115,30.1000996,63.4748116,29.6236706,62.5830307,30.7028408,63.8240814,29.4573994,63.1574097,28.0561600,64.0849304,29.1048107,63.2322006,26.9488392,65.6903687,26.6764793,65.0336304,27.7016602,66.1083832,26.3215599,67.2001190,24.9268494,66.0929718,28.4162006,66.6760101,26.6454201,66.6446304,24.8468895,64.3094482,24.9116192,64.6056824,25.2097893,63.6066818,27.8006592,63.9115410,26.7294292,63.9892311,26.5522003,64.4334793,29.3345108,60.8809700,28.6512108,60.2228012,25.1723309,60.2225685,24.8184299,60.1848488,24.8075809,60.2265282,24.8251896,60.3807297,23.5755901,60.3897591,24.0326996,60.3813095,23.7488804,60.4164200,22.7666702,60.3720093,23.6641102,60.3771210,22.9482098,60.3121986,24.2364998,60.3858795,23.9050407,60.3692818,23.4118500,60.3830795,23.2323799,60.3549118,24.5380096,61.1629601,24.0570793,60.3645897,25.2615204,60.3645897,25.2615204,60.6207504,25.8632107,60.3675919,22.3586006,60.1698990,21.7959900,60.3204994,22.3435593,60.0431099,22.4852009,60.4591484,21.9837608,60.6254501,21.7431507,60.7649994,27.9801903,61.1366997,28.0885696,61.7993584,28.3184700,62.3455391,30.8502598,62.9300117,31.2779598,63.2836418,30.5323391,63.5235901,29.9955196,62.9272118,26.3890896,62.8696213,21.3945694,62.6107407,21.2234497,63.2066803,21.4732704,63.8055496,22.7826996,65.0343323,24.7761192,64.9746170,25.4885101,65.8339462,28.0866508,65.8078537,24.4577503,67.0430679,27.2142200,67.0163269,29.0120792,65.8001099,30.0924301,70.0884094,27.9412403,60.2822418,25.0799694,60.6916695,23.1294498,60.4986305,22.4251709,60.8262787,24.0000000,60.5428085,22.6227207,61.5015907,23.4251900,61.4668503,22.3472099,61.1373711,22.1772194,61.0096016,25.2219296,61.1594887,24.6818104,61.3679085,23.1171894,60.9782600,25.6116199,60.9111595,26.1859303,61.3111191,24.2910595,61.4975395,23.8979397,61.5077019,23.6995392,62.5732498,25.6520100,62.1592407,26.3187008,61.0384407,28.3635292,61.3079185,27.3934002,63.6008987,23.4641895,63.0004196,24.6972694,61.8845787,26.9587307,63.1673889,24.5222893,62.7783089,25.0985603,61.1688805,27.7457409,63.4251785,23.9242706,61.8793106,28.8541908,61.8290100,29.2175198,61.8683281,28.8994293,61.9401894,28.5279598,61.8778801,28.8467102,60.6249619,26.9214802,60.4636116,26.9176693,61.2814713,27.1646404,61.0742798,27.0590591,63.0197487,23.6787605,63.0373192,24.2478104,62.9725914,22.6398201,62.5923386,23.4676094,61.6917114,24.6638699,62.9897118,22.3156395,62.8514595,22.7820206,62.2716217,25.3937092,62.6117401,23.8999195,63.2890396,22.7990208,62.9399185,23.0381699,62.5876389,22.7530403,62.7089119,22.8241692,63.1388016,22.8683605,60.4351501,22.9691391,60.4172897,23.1063194,60.4073982,23.2112293,60.4452591,22.5507202,60.4240189,22.4023304,60.3127098,24.0019493,60.2619095,24.5037098,60.3804893,23.4778996,60.4466591,22.3047009,60.3762398,23.7257500,60.3734589,23.3568592,60.2881088,24.1586895,60.3886719,23.2919197,60.2280502,24.5964108,60.4236984,22.6830196,60.2932816,24.3191605,60.4458313,22.5348206,60.3285484,23.9364204,60.4283600,22.8402309,60.3911705,23.5713005,65.0523529,25.5986404,65.8261185,28.8158798,65.4493408,27.6232204,65.2755814,26.8473091,65.5923309,28.3005104,65.1893311,26.1914196,68.4718704,22.4120102,68.5198517,22.0233402,69.0166779,20.8742504,68.6753693,21.5928402,66.5107803,23.7901192,65.9667587,24.0589409,67.9558029,23.6844196,67.9111023,23.6328201,67.9558029,23.6843204,68.2874298,23.0796604,68.8065491,21.2521095,67.0032501,24.0488396,67.5317535,23.6288395,64.5336075,27.2411404,64.9863815,25.5462093,64.8841095,25.8404503,64.7811737,26.2674198,61.8009109,22.2839298,62.2455292,24.5620594,62.5240593,28.4641495,62.3745689,28.1545105,62.2908096,27.3985996,62.5335808,28.9199696,62.2407608,23.8025303,61.2205887,25.3544998,61.6319313,25.2953491,60.4588203,24.5277805,59.8564186,23.0219193,60.5805397,24.8324604,60.0806885,23.7260303,60.6171684,25.0923195,60.3277092,24.2752991,59.9798508,23.3994198,60.2037010,24.0193691,60.6305084,27.2162895,60.7773895,27.3500099,63.6142998,26.8433208,63.8133202,25.2371998,64.0029068,24.7441807,63.9012108,23.8863392,64.1139679,26.9617805,65.8356400,24.2624798,65.8253708,24.4083099,61.1067314,22.8496609,60.9442291,23.3241291,61.5313301,21.6317692,60.5393105,24.2273407,60.6387482,23.8924999,61.2085495,22.4478493,60.9641685,24.4791203,61.7885017,22.9958305,62.7872391,22.2817593,62.3910103,22.7985706,61.1399994,24.0664101,60.4964104,24.8520298,60.3264313,24.8260098,63.0013618,21.8988400,62.1157799,23.0094509,61.4084091,23.7650394,61.2553215,23.8360901,61.4526405,23.6360207,60.2293892,24.9050407,60.7060509,24.7373505,63.0709305,21.6966000,61.5770988,23.4754601,64.8157272,25.4862404,61.6654396,26.0344601,65.1744690,25.4250202,64.3952103,25.7975407,65.4124374,25.3849201,65.7894135,24.5321693,66.2523270,25.3388100,60.2515907,25.0645103,61.7225113,26.0837193,64.0064392,25.7556496,60.4263992,25.1237507,62.8776894,25.8101406,65.0045090,25.5075302,65.5472717,25.2417698,65.0782166,25.4400101,60.9064293,25.6086998,60.7359009,25.4480209,64.8644409,25.5184994,62.8069992,25.8074207,66.5475082,25.8459206,60.5555801,25.1870594,65.4123688,25.3854008,65.4123688,25.3854008,61.4038506,26.0458393,65.0199127,25.5079002,65.0205917,25.5060806,64.9473495,25.5320492,66.0008621,24.6897697,62.6938705,25.7671700,69.4448318,27.2405300,67.9899597,26.8883400,64.2815781,25.8757401,62.3639297,25.6999893,63.7114182,25.9175396,66.5066833,25.7307892,65.7249298,24.5735302,63.4229317,25.6412296,68.4565582,27.4251194,66.5381165,25.7850304,65.6840973,24.6245193,65.6690598,24.9307003,64.6573029,25.6159706,62.4200096,25.6937809,62.0329399,26.0485897,61.0886612,25.9033508,63.2243996,25.6633091,67.0694122,26.5454006,63.9956894,27.4053802,63.6661301,27.2853203,65.7213211,29.1515598,67.1922989,27.4373798,66.3052597,28.8988609,62.8411789,27.6068707,61.3994293,26.3863792,63.3095398,27.4513397,62.3829193,27.8084602,64.2889862,27.9471493,61.6776619,27.2494106,64.1626968,27.5245399,61.8186913,27.6283398,62.5896187,27.6049595,65.1467590,28.9395008,66.0134430,29.1446095,62.0593414,27.8099899,62.9188690,27.6777802,64.5764084,28.4036407,64.3157501,28.0386105,62.8851509,27.6367302,63.0628891,27.6650791,62.9640388,27.6969700,66.5523376,28.1060104,65.4257965,29.0379009,64.7867126,28.8435993,62.9468498,27.6712303,61.4499397,26.6992798,60.7852287,26.4927692,61.2390404,28.8669796,62.6142197,29.7808609,63.2166290,29.3020592,61.0367699,28.1262608,61.7973099,29.7311802,60.6993790,26.3029804,64.1422806,27.9970207,61.9743690,29.8678398,60.6165085,26.1801300,61.0718117,28.3099995,62.6447487,29.7835293,63.6286011,28.9108105,61.6483917,29.5864391,62.6114693,29.7862606,61.4192581,29.3408203,60.9341507,27.6598492,62.4008102,30.0901699,62.2384109,30.1040306,60.8866310,26.8587494,60.8866310,26.8587494,60.8866310,26.8587494,60.5923996,27.1663799,60.5955315,27.2553501,60.5694389,27.0881500,60.2620316,25.1663303,60.5448494,26.9863491,60.4908981,25.9100304,60.5637703,27.3956203,60.4954987,26.4402905,60.4597588,26.1849804,60.4956284,26.8062992,60.3789902,25.5937595,60.5001297,26.7016792,60.3147888,25.4098301,60.2814293,25.3249893,60.5009918,26.8825493,60.5941086,27.8424606,60.5867882,27.7248402,60.6058502,27.7567596,60.5964584,27.4754505,61.6498108,21.7596397,61.2783089,21.6938305,64.0420532,23.6388092,60.9555016,21.5942993,64.3372269,23.9585991,63.8608894,23.2741909,62.0677986,21.5308208,63.6709213,22.9144096,61.9436111,21.6244907,62.2664604,21.4795494,64.7848206,25.3584194,60.5491486,22.1240101,60.7379799,21.9264793,62.4782295,21.4386692,63.2563095,22.2823296,64.6863098,24.5615807,62.7479401,21.6414909,64.4474869,24.2107506,61.1571693,21.5844307,64.7170029,24.9509792,62.9514008,21.7623501,63.4621010,22.5885906,63.1396599,21.7618809,63.1591492,22.0087795,60.6156387,22.5106297,62.3045998,26.4725304,62.3774986,26.5904903,61.8252907,25.0626106,61.9137192,25.3284092,62.9581795,27.8617191,62.2461815,25.7687702,62.6325188,29.3408794,62.1797104,25.6815205,61.9993706,25.5004101,62.9711113,27.8300095,61.1141396,23.6385803,61.7087593,24.4759007,62.2461700,26.1401291,62.6622009,29.1488209,60.7821693,22.8795891,61.6450996,24.2192993,61.7314491,24.7091999,61.5497894,24.0717201,62.5853386,27.0492096,62.8678284,28.3443909,62.9315681,28.0428104,62.1787109,30.5256100,62.7276497,27.5538197,62.6304893,29.6042500,60.2413902,25.1532307,60.2323418,25.1613293,60.4985695,24.0873394,61.4773788,23.7742805,63.0902214,30.3598709,66.1211090,29.5847092,64.6500397,29.1957207,67.5639114,24.1783199";
    
        $url = "";
        $url .= "http://opendata.fmi.fi/wfs?request=getFeature";
        $url .= "&storedquery_id={$settings["storedQueryId"]}";
        $url .= "&timestep={$settings["timestep"]}";
        $url .= "&parameters={$settings["parameter"]}";
        //$url .= "&bbox={$settings["bbox"]},epsg::4326&";
        $url .= "&latlons={$settings["latlons"]}";
        $url .= "&starttime=${starttime}&endtime=${endtime}";

        $xmlData = file_get_contents($url);
        $resultString = simplexml_load_string($xmlData);

        $result = array();
        $tmp = array();

        $data = $resultString->children("wfs", true);
        $params = explode(",", $settings["parameter"]);

        $x = 0;

        foreach ($data->member as $key => $locations) {

            $presum = 0;
            
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
            
            $index = 0;
            foreach ($blop->point as $key => $measurement) {
                
                $value = (string)$measurement->MeasurementTVP->value;
                $time = (string)$measurement->MeasurementTVP->time;
                $epoctime = strtotime($time);

                // calculate 1h precipitation sum
                // if($x === 0) {
                //     if($value === "NaN"){$value = "0";}
                //     $presum = $presum + floatval($value);
                //     $tmp[$params[$x]] = $presum;
                // } else {
                //     $tmp[$params[$x]] = $value;
                // }

                if($value == "NaN"){
                    $value = null;
                }
                $tmp[$params[$x]] = $value;

            
                $tmp["station"] = $station;

                $tmp["lat"] = floatval($latlon[0]);
                $tmp["lon"] = floatval($latlon[1]);
                $tmp["time"] = $time;
                $tmp["epoctime"] = intval($epoctime);
                $tmp["type"] = "road";
                
                $index = $index+1;

            }
            if ($x < count($params)-1) {
                $x = $x+1;
            } else {
                array_push($result,$tmp);
                $x = 0;
            }
        }

        $tmp = array();
        foreach ($result as $data) {
            $tmp1 = array();
            $tmp1 = $data;            
            $tmp1["rr_10min"] = $data["pri"];
            $tmp1["temperature"] = $data["ta"];
            $tmp1["ws_10min"] = $data["ws"];
            $tmp1["wg_10min"] = $data["wg"];
            $tmp1["wd_10min"] = $data["wd"];
            $tmp1["wawa"] = $data["prst1"];
            unset($tmp1["ws"]);
            unset($tmp1["wg"]);
            unset($tmp1["wd"]);
            unset($tmp1["ta"]);
            unset($tmp1["prst1"]);
            unset($tmp1["pri"]);
            array_push($tmp,$tmp1);
        }
        $result = $tmp;
        return $result;
    }


    /**
    *
    * Get latest synop observations 
    * @return   data as php array
    *
    */

    public function synopdata($timestamp) {
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=fmi";
        $url .= "&keyword=synop_fi";
        $url .= "&precision=double";
        $url .= "&param=name%20as%20station,fmisid,utctime%20as%20time,lat,lon,visibility,wawa,temperature,wg_10min,ws_10min,wd_10min,ri_10min,sum_t(ri_10min:1h:0)%20as%20ri_1h";
        $url .= "&missingvtext=nan";
        $url .= "&maxlocations=1";

        if($timestamp == "now") {
            $url .= "&endtime=now";
        } else {
            $url .= "&starttime=${timestamp}&endtime=${timestamp}&timestep=10";
        }

        $data = file_get_contents($url) or die("Unable to get data from {$url}");
        $data = json_decode($data, true);


        /* add datatype, station and epoch time information to each observation */
        $observationData = [];
        foreach ( $data as $key => $observation ) {

            $tmp = $observation;

            date_default_timezone_set("UTC");
            $time = strtotime($observation["time"]);
            $tmp["time"] = date('Y-m-d\TH:i:s\Z',$time);

            $tmp["type"] = "synop";

            $date = new DateTime($observation["time"]);
            $tmp["epoctime"] = intVal($date->format('U'));
            array_push($observationData,$tmp);

        }

        return $observationData;
    }

    /**
    *
    * Get road observation data from timeseries
    * @param    station fmisid 
    * @return   data as an array
    *
    */

    public function roadObservation($fmisid) {
        
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=road";
        $url .= "&fmisid={$fmisid}";
        $url .= "&precision=double";
        $url .= "&param=name,time,wg,ws,wd";
        $url .= "&missingtext=-";
        $url .= "&starttime=-12h";
        $url .= "&maxlocations=1";
        
        $data = file_get_contents($url) or die('Unable to get data from {$url}');
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        $observationData = [];
        foreach ( $data as $key => $observation ) {

            $tmp = $observation;
            $tmp["datatype"] = "observation";
            $tmp["station"] = "road";
            $date = new DateTime($observation["time"]);
            $tmp["epoch"] = 1000*intVal($date->format('U'));
            array_push($observationData,$tmp); 

        }
        return $observationData;
    }

    /**
    *
    * Get synop observation data from timeseries
    * @param    station fmisid 
    * @return   data as an array
    *
    */

    public function synopObservation($fmisid) {
        
        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=fmi";
        $url .= "&fmisid={$fmisid}";
        $url .= "&precision=double";
        $url .= "&param=name,time,ws_10min,wg_10min,wd_10min";
        $url .= "&missingtext=-";
        $url .= "&starttime=-12h";
        $url .= "&maxlocations=1";

        $data = file_get_contents($url) or die('Unable to get data from {$url}');
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        /* parameter names must also be changed */
        $observationData = [];
        foreach ( $data as $key => $observation ) {

            $tmp = $observation;
            $tmp["datatype"] = "observation";
            $tmp["station"] = "synop";
            $tmp["ws"] = $observation['ws_10min'];
            $tmp["wg"] = $observation['wg_10min'];
            $tmp["wd"] = $observation['wd_10min'];
            unset($tmp["ws_10min"]);
            unset($tmp["wg_10min"]);
            unset($tmp["wd_10min"]);
            $date = new DateTime($observation["time"]);
            $tmp["epoch"] = 1000*intVal($date->format('U'));
            array_push($observationData,$tmp); 

        }
        return $observationData;
    }

    /**
    *
    * Get Harmonie forecast data from timeseries
    * @param    lat,lon coordinates 
    * @return   data as an array
    *
    */

    public function HarmonieForecast($latlon) {

        $date = new DateTime();
        $starttime = ($date->format('Y-m-d\TH:i:m'));
        $endtime = $date->add(new DateInterval('PT12H'));
        $endtime = ($endtime->format('Y-m-d\TH:i:m'));

        $url = "";
        $url .= "http://data.fmi.fi/fmi-apikey/f01a92b7-c23a-47b0-95d7-cbcb4a60898b/timeseries?";
        $url .= "&format=json";
        $url .= "&producer=harmonie_skandinavia_pinta";
        $url .= "&latlon={$latlon}";
        $url .= "&precision=double";
        $url .= "&param=name,time,windspeedms,winddirection,windgust";
        $url .= "&missingtext=-";
        $url .= "&timestep=10";
        $url .= "&starttime={$starttime}";
        $url .= "&endtime={$endtime}";
        $url .= "&maxlocations=1";

        $data = file_get_contents($url) or die("Unable to get data from {$url}");
        $data = json_decode($data, true);

        /* add datatype, station and epoch time information to each observation */
        /* parameter names must also be changed */
        $forecastData = [];
        foreach ( $data as $key => $forecast ) {

            $tmp = $forecast;
            $tmp["datatype"] = "forecast";
            $tmp["ws"] = $forecast['windspeedms'];
            $tmp["wg"] = $forecast['windgust'];
            $tmp["wd"] = $forecast['winddirection'];
            unset($tmp["windspeedms"]);
            unset($tmp["windgust"]);
            unset($tmp["winddirection"]);
            $date = new DateTime($forecast["time"]);
            $tmp["epoch"] = 1000*intVal($date->format('U'));
            array_push($forecastData,$tmp);

        }
        return $forecastData;
    }

    /**
    *
    * Combine array datasets as one array
    * @return   data as json string
    *
    */

    public function combineData($observation, $forecast) {

        $data = [];
        foreach ( $observation as $dataArray ) {
            array_push($data,$dataArray);
        }
        foreach ( $forecast as $dataArray ) {
            array_push($data,$dataArray);
        }

        // return json_encode($data);
        return $data;
        
    }

    // end of class

}


?>
