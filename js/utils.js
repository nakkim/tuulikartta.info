var hash = window.location.hash.split('#')
var latitude = localStorage.getItem('latitude') ? localStorage.getItem('latitude') : 65.69,
  longitude = localStorage.getItem('longitude') ? localStorage.getItem('longitude') : 25.36,
  zoomlevel = localStorage.getItem('zoomlevel') ? localStorage.getItem('zoomlevel') : 5,
  selectedLanguage = localStorage.getItem('language') ? localStorage.getItem('language') : 'fi',
  selectedParam = 'ws_10min',
  selectedTime = null

if (selectedLanguage === 'fi')
  $('#language-selector-value').html('EN')
if (selectedLanguage === 'en')
  $('#language-selector-value').html('FI')

$('#select-content-datasearch').html(translations[selectedLanguage]['dataSearch'])
$('#select-content-now').html(translations[selectedLanguage]['dataNow'])

/* get language from url parameter */
hash.forEach(function (element) {
  var param = element.split('=');
  if (param[0] === 'lang') {
    if (param[1] === 'en') {
      selectedLanguage = 'en'
      localStorage.setItem('language', 'en')
    } else if (param[1] === 'fi') {
      selectedLanguage = 'fi'
      localStorage.setItem('language', 'fi')
    } else {
      selectedLanguage = 'fi'
      localStorage.setItem('language', 'fi')
    }
  }
})

saa.Tuulikartta.buildObservationMenu()
saa.Tuulikartta.populateInfoContent()
// 'synopplot' intentionally left out here to disable it, since it's temporarily disabled for users
var values = ['ws_10min', 'wg_10min', 'ws_1d', 'wg_1d', 'ri_10min', 'rr_1h', 'rr_1d', 't2m', 'tmax', 'tmin', 'vis', 'wawa', 'n_man', 'smartsymbol', 'snow_aws', 'pressure', 'rh', 'dewpoint', 't2mdewpoint']

/* handle other url parameters */
hash.forEach(function (element) {
  var param = element.split('=');
  if (param[0] === 'latlon') {
    var lat = param[1].split(',')[0]
    var lon = param[1].split(',')[1]
    var zoom = param[1].split(',')[2]

    if (typeof (parseFloat(lat)) === 'number' && parseFloat(lat) >= -90 && parseFloat(lat) <= 90) latitude = lat
    if (typeof (parseFloat(lon)) === 'number' && parseFloat(lon) >= -180 && parseFloat(lat) <= 180) longitude = lon
    if (typeof (parseFloat(zoom)) === 'number' && parseFloat(zoom) >= 5 && parseFloat(zoom) <= 12) zoomlevel = zoom

  }
  if (param[0] === 'zoom') {
    var zoom = param[1]

    if (typeof (parseInt(zoom)) === 'number' && parseInt(zoom) >= 5 && parseInt(zoom) <= 12) zoomlevel = zoom
  }
  if (param[0] === 'parameter') {
    if (values.includes(param[1])) {
      selectedParam = param[1]
      document.getElementById('select-wind-parameter').value = selectedParam;
    }
  }
  if (param[0] === 'time') {
    if (moment.utc(param[1], 'YYYY-MM-DDTHH:mm:ssZ', true).isValid()) {
      selectedTime = param[1]
    }
  }
  if (param[0] === 'table') {
    saa.Tuulikartta.showObservationTable = param[1] === 'visible'
    localStorage.setItem('showObservationTable', saa.Tuulikartta.showObservationTable)
  }
  if (param[0] === 'velocity') {
    saa.Tuulikartta.showWindParticles = param[1] === 'visible'
    localStorage.setItem('showWindParticles', saa.Tuulikartta.showWindParticles)
  }
  if (param[0] === 'radar') {
    saa.Tuulikartta.showRadar = param[1] === 'visible'
    localStorage.setItem('showRadar', saa.Tuulikartta.showRadar)
  }
  if (param[0] === 'lightning') {
    saa.Tuulikartta.getLightningData = param[1] === 'visible'
    localStorage.setItem('showLightning', saa.Tuulikartta.getLightningData)
  }
  if (param[0] === 'settings') {
    saa.Tuulikartta.showSettingsSidebar = param[1] === 'visible'
    localStorage.setItem('showSettingsSidebar', saa.Tuulikartta.showSettingsSidebar)
  }
})

var span = document.getElementsByClassName("close")[0]
var modal = document.getElementById("modal-form")

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  saa.Tuulikartta.setObservationTableVisible(false)
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    saa.Tuulikartta.setObservationTableVisible(false)
  }
}

saa.Tuulikartta.handleUrlParams(latitude, longitude, zoomlevel, selectedParam, selectedTime)

saa.Tuulikartta.initMap();
saa.Tuulikartta.updateRadarData();
