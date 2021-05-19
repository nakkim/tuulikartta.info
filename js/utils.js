(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-105001415-1', 'auto');
ga('send', 'pageview');

var hash = window.location.hash.split('#')
var latitude = localStorage.getItem('latitude') ? localStorage.getItem('latitude') : 65.69,
    longitude = localStorage.getItem('longitude') ? localStorage.getItem('longitude') : 25.36,
    zoomlevel = localStorage.getItem('zoomlevel') ? localStorage.getItem('zoomlevel') : 5,
    selectedLanguage = localStorage.getItem('language') ? localStorage.getItem('language') : 'fi',
    selectedParam = 'ws_10min'

if(selectedLanguage === 'fi')
$('#language-selector-value').html('EN')
if(selectedLanguage === 'en')
$('#language-selector-value').html('FI')

if(selectedLanguage === 'fi') {
  window.cookieconsent.initialise({
    palette: {
      popup: {
        background: "white",
        text: "black",
      },
      button: {
        background: "#3f8abf",
        message: "OK"
      }
    },
    theme: "classic",
    content: {
      message: translations[selectedLanguage]['cookieConsent'],
      dismiss: translations[selectedLanguage]['consent'],
      link: 'Lisätietoja',
      href: 'https://tuulikartta.info/tietoa-sivustosta/'
    }
  });
} else {
  window.cookieconsent.initialise({
    palette: {
      popup: {
        background: "white",
        text: "black",
      },
      button: {
        background: "#3f8abf",
        message: "OK"
      }
    },
    showLink: false,
    theme: "classic",
    content: {
      message: "This website uses cookies (Google Analytics and local storage) to ensure you get the best experience on this website.",
      dismiss: translations[selectedLanguage]['consent'],
    }
  });
}

$('#select-content-datasearch').html(translations[selectedLanguage]['dataSearch'])
$('#select-content-now').html(translations[selectedLanguage]['dataNow'])

/* get language from url parameter */
hash.forEach(function(element) {
    var param = element.split('=');
    if(param[0] === 'lang') {
        if(param[1] === 'en') {
            selectedLanguage = 'en'
            localStorage.setItem('language', 'en')
        } else if(param[1] === 'fi') {
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
var values = ['ws_10min','wg_10min','ws_1d','wg_1d','ri_10min','rr_1h','rr_1d','t2m','tmax','tmin','vis','wawa','n_man','snow_aws','pressure','rh', 'dewpoint', 't2mtdew']

/* handle other url parameters */
hash.forEach(function(element) { 
    var param = element.split('=');
    if(param[0] === 'latlon') {
        var lat = param[1].split(',')[0]
        var lon = param[1].split(',')[1]
        var zoom = param[1].split(',')[2]

        if(typeof(parseFloat(lat)) === 'number' && parseFloat(lat) >= -90 && parseFloat(lat) <= 90) latitude = lat
        if(typeof(parseFloat(lon)) === 'number' && parseFloat(lon) >= -180 && parseFloat(lat) <= 180) longitude = lon
        if(typeof(parseFloat(zoom)) === 'number' && parseFloat(zoom) >= 5 && parseFloat(zoom) <= 12) zoomlevel = zoom

    }
    if(param[0] === 'zoom') {
        var zoom = param[1]

        if(typeof(parseInt(zoom)) === 'number' && parseInt(zoom) >= 5 && parseInt(zoom) <= 12) zoomlevel = zoom
    }
    if(param[0] === 'parameter') {
        if(values.includes(param[1])) {
            selectedParam = param[1]
            document.getElementById('select-wind-parameter').value = selectedParam;
        }
    }
})
saa.Tuulikartta.handleUrlParams(latitude,longitude,zoomlevel,selectedParam)

saa.Tuulikartta.initMap();
saa.Tuulikartta.updateRadarData();
