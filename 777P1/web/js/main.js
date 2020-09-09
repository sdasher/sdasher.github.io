//Global Variables

var accessToken = 'pk.eyJ1Ijoic2Rhc2hlciIsImEiOiJja2VwMzJidTkwb2Y0MnpwbmNzZzNwMXBtIn0.yISZa2w-PKhRAEaAyIl8ew';
var map = L.map('map', {minZoom: 6, maxZoom: 13, zoomControl: false}).setView([44.72, -90.29], 7);


L.control.zoom({position: 'topleft'}).addTo(map);


// Add tiles from Mapbox
var baseMap = L.tileLayer(
    'https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token=' + accessToken, {
        tileSize: 512,
        zoomOffset: -1,
        attribution: '© <a href="https://apps.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);


// Map Features
var wellPoints;
var censusTracts;
var nitrateHexes;
var residualTracts;
var stateMask;

// Choropleth Legends
var legend;
var wellLegend;

// Map Layers
var censusLayer;
var countiesLayer;
var hexLayer = L.geoJSON(null, null);
var residualLayer;
var wiscPolygon = [[-87.74855527770387, 44.96161636949989], [-88.1801942781434, 45.953516369884596], [-90.11165928015163, 46.34042937081887], [-90.86173028102763, 46.95247937132598], [-92.28727128244367, 46.65878637049468], [-92.80558428238868, 44.74616036940557], [-91.37335728111361, 43.947191368187134], [-90.63845628103252, 42.50936336672606], [-87.79738227836941, 42.489152367288], [-87.74855527770387, 44.96161636949989]];
var wellsLayer;
var welllegendControl = L.control({position: 'bottomleft'});
var legendControl = L.control({position: 'bottomleft'});



// DOM Elements
var exponentInput = document.getElementById("exponent");
var cellSizeInput = document.getElementById("cellSize");
var interpolateButton = document.getElementById("interpolate");
var calculateButton = document.getElementById("calculate");
var loader = document.getElementById("loader");
var regressionLoader = document.getElementById("regressionLoader");
var results = document.getElementById("results");
var slopeDisplay = document.getElementById("slope");
var interceptDisplay = document.getElementById("intercept");
var rSquaredDisplay = document.getElementById("rSquared");
var correlationDisplay = document.getElementById("correlation");
var errorLoader = document.getElementById("errorLoader");
var residualButton = document.getElementById("residualButton");
var interpolateTip = document.getElementById("hexesTip"),
    regressionHelp = document.getElementById("regressionHelp"),
    residualHelp = document.getElementById("residualHelp");
var interpolatePopup = document.getElementById("interpolatePopup"),
    regressionPopup = document.getElementById("regressionPopup"),
    residualPopup = document.getElementById("residualPopup");


loader.hidden = true;
regressionLoader.hidden = true;
errorLoader.hidden = true;
interpolateButton.disabled = true;
residualButton.disabled = true;

// User Inputs
var exponent = 1;
var cellSize = 10;

// Calculated Values
var statsArray=[];

addWells();
addCounties();
addCensusTracts();

// Update Layer Control Legend

var layerControl = L.control.layers(null, null, {position: 'topright'}).addTo(map);

//
// //     "Wells var overlays = {": wellsLayer,
//     "Census Tracts": censusLayer,
//     "Counties": countiesLayer,
// }


// Fetch Layers from geoJSON files
function addCounties() {
    $.ajax("web/data/counties.geojson", {
        dataType: "json",
        success: createCountyLayer
    });
};

function addCensusTracts() {
    $.ajax("web/data/tracts.geojson", {
        dataType: "json",
        success: createCensusLayer
    });
};

function addWells() {
    $.ajax("web/data/wells.geojson", {
        dataType: "json",
        success: createWellsLayer
    });
};

// function addStateMask() {
//     $.ajax("web/data/wisconsin.json", {
//         dataType: "json",
//         success: createStateMaskLayer
//     });
// };

// Create Layers from jQuery responses
function createCensusLayer(response, status, jqXHRobject) {
    censusTracts = response;
    censusLayer = L.geoJSON(censusTracts, {style: styleTract}).addTo(map);
    censusLayer.bringToBack(map);
    layerControl.addOverlay(censusLayer, "Census");
    addCensusLegend();

};

function createCountyLayer(response, status, jqXHRobject) {
    counties = response;
    countiesLayer = L.geoJSON(counties, {style: countyStyle}).addTo(map);
    countiesLayer.bringToBack(map);
    layerControl.addOverlay(countiesLayer, "Counties");
};

// function createStateMaskLayer(response, status, jqXHRobject) {
//     console.log("creating state mask");
//     stateMask = response;
//     console.log(stateMask);
//     stateMaskLayer.addData(response);
//     stateMaskLayer.bringToBack(map);
//     var coords = response[0].geometry.coordinates;
//     console.log(coords);
// };

function createWellsLayer(response, status, jqXHRobject) {
    console.log("creating well layer");
    wellPoints = response;
    var wellsLayer = L.geoJSON(wellPoints, {
            pointToLayer: function (feature, latlng) {
                return new L.CircleMarker(latlng, {
                    radius: 2,
                    fillOpacity: 1,
                    color: 'black',
                    fillColor: getWellColor(feature.properties.nitr_ran),
                    weight: 0,
                })
            }
        }
    ).addTo(map);
    wellsLayer.bringToFront(map)
    layerControl.addOverlay(wellsLayer, "Wells");
    addWellsLegend();


    // Make the interpolation button active
    interpolateButton.disabled = false;

    // createInterpolation(wellPoints);
};

//Interpolate from WellPoints to Hexes Using Turf
function createHexes(wellPoints) {
    hexLayer.clearLayers();
    var interpShape = document.querySelector('input[name="shape"]:checked').value;
    console.log(interpShape);
    var interpUnits = document.querySelector('input[name="units"]:checked').value;
    console.log(interpUnits);
    var options = {gridType: interpShape, property: 'nitr_ran', units: interpUnits, weight: exponent};
    nitrateHexes = turf.interpolate(wellPoints, cellSize, options);
    // var mask = turf.polygon([wiscPolygon]);
    // console.log(mask);
    // var masked = turf.mask(mask);
    hexLayer = L.geoJSON(nitrateHexes, {style: hexesStyle}).addTo(map);
    layerControl.addOverlay(hexLayer, "Interpolation");
    loader.hidden = true;
};

//Calculation Functions
function calculateStatistics() {
    console.log("Calculating Statistics");

    var tractCentroids = [];

    //For each census tract, find the centroid and add it to the tractCentroids array
    turf.featureEach(censusTracts, function (currentFeature, featureIndex) {
        var centroid = turf.centroid(currentFeature);
        centroid.properties = {canrate: currentFeature.properties.canrate};
        tractCentroids.push(centroid);
        //console.log(tractCentroids);
    });
//take all the cancer rates from the centroids, and make them a property on a copy of the the nitratehexes polygon layer (called "collected") that contains them.
    //"collected" is now a polygon hex layer with properties nitr_ran and canrate (may have more than one canrate per hex)
    var collected = turf.collect(nitrateHexes, turf.featureCollection(tractCentroids), 'canrate', 'canrate');

    var emptyBins = []
    var bins = []
    var nitrates=[]
    var cancers=[]

    //for each polygon in "collected", find the average of the canrates (ObsCancer)
    turf.featureEach(collected, function (currentFeature, featureindex) {
        if (currentFeature.properties.canrate.length > 0) {
            var sum = 0
            for (var i = 0; i < currentFeature.properties.canrate.length; i++) {
                sum += currentFeature.properties.canrate[i];
            }
            var obsCancer = sum / currentFeature.properties.canrate.length

         // add the pair [nitr_ran, ObsCancer] to an array called "bins"
            bins.push([currentFeature.properties.nitr_ran, obsCancer]);
            nitrates.push(currentFeature.properties.nitr_ran);
            cancers.push(obsCancer);
        } else {
            emptyBins.push(currentFeature);
        }
    });

    // console.log(bins);
    // console.log("Calculate Regression Finished");
    //use simple Statistics pkg to return object containing slope and intercept of regression line, the r-squared, and the correlationcoefficient
    var regObj= ss.linearRegression(bins);
    var regressionLine = ss.linearRegressionLine(regObj);
    console.log(regressionLine);
    var rsquared = ss.rSquared(bins, regressionLine);
    var correlation=ss.sampleCorrelation(nitrates, cancers);
    console.log("m", regObj.m, "b", regObj.b, "r2", rsquared, "corr", correlation);
    statsArray = [regObj.m, regObj.b, rsquared, correlation];
    console.log(statsArray);
    return statsArray;
};

function calculateResiduals() {
    residualTracts = censusTracts;
    var min = 0, max = 0;
    turf.featureEach(residualTracts, function (currentFeature, featureindex) {

        var obsCancer = Number(currentFeature.properties.canrate);
        var nitrate = Number(currentFeature.properties.nitrate);

        // y = mx+b
        var estCancer = Number((statsArray[0] * nitrate) + statsArray[1]).toFixed(2)

        var residualValue = obsCancer - estCancer;

        currentFeature.properties.residualValue = residualValue;
        //console.log(residualValue);
    });
    residualLayer = L.geoJSON(residualTracts, {style: styleResidual});
    layerControl.addOverlay(residualLayer, "Residuals");
};


//Layer Styles
function countyStyle(feature) {
    return {
        fill: false,
        stroke: "#003c30",
        color: "#003c30",
        weight: 0.5
    };
}

function styleTract(feature) {
    return {
        fillColor: getTractsColor(feature.properties.canrate),
        weight: 1,
        opacity: .6,
        color: '#bababa',
        dashArray: '3',
        fillOpacity: .6
    };
};

function hexesStyle(feature) {
    return {
        fillColor: getHexesColor(feature.properties.nitr_ran),
        weight: 0,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.75
    };
}


function styleResidual(feature) {
    return {
        fillColor: getResidualColor(feature.properties.residualValue),
        weight: 1,
        opacity: 1,
        color: 'gray',
        dashArray: '3',
        fillOpacity: 0.9
    };
};

function getHexesColor(d) {
    return d > 10 ? '#d73027' :
        d > 8 ? '#f46d43' :
            d > 6 ? '#fdae61' :
                d > 4 ? '#fee08b' :
                    d > 3 ? '#d9ef8b' :
                        d > 2 ? '#a6d96a' :
                            d > 1 ? '#66bd63' :
                                '#1a9850';
}


function getTractsColor(d) {
    return d > .8 ? '#b30000' :
        d > .6 ? '#e34a33' :
            d > .4 ? '#fc8d59' :
                d > .2 ? '#fdcc8a' :
                    '#fef0d9';
}


function getWellColor(d) {
    return d > 10 ? '#d73027' :
        d > 8 ? '#f46d43' :
            d > 6 ? '#fdae61' :
                d > 4 ? '#fee08b' :
                    d > 3 ? '#d9ef8b' :
                        d > 2 ? '#a6d96a' :
                            d > 1 ? '#66bd63' :
                                '#1a9850';
}

function getResidualColor(d) {
    return d > .4 ? '#d53e4f' :
        d > .3 ? '#f46d43' :
            d > .2 ? '#fdae61' :
                d > .1 ? '#fee08b' :
                    d > -.1 ? '#ffffbf' :
                        d > -.2 ? '#e6f598' :
                            d > -.3 ? '#abdda4' :
                                d > -.4 ? '#66c2a5' :
                                    '#3288bd';
}

// Add all the Buttons

exponentInput.addEventListener("change", function () {
    exponent = Number(exponentInput.value);
});

cellSizeInput.addEventListener("change", function () {
    cellSize = Number(cellSizeInput.value);
});

interpolateButton.addEventListener("click", function () {
    loader.hidden = false;
    $.ajax({
        success: function () {
            createHexes(wellPoints);
            hexLayer.addTo(map);
            addInterpolateLegend();
            loader.hidden = true;
            calculateButton.disabled = false;
        }
    });
});


calculateButton.addEventListener("click", function () {
    regressionLoader.hidden = false;
    $.ajax({
        success: function () {
            statsArray = calculateStatistics();
            console.log("RegEq", statsArray[0], statsArray[1]);
            regressionLoader.hidden = true;
            results.hidden = false;
            slopeDisplay.innerText = Number(statsArray[0]).toFixed(3);
            interceptDisplay.innerText = Number(statsArray[1]).toFixed(3);
            rSquaredDisplay.innerText = Number(statsArray[0]).toFixed(3);
            correlationDisplay.innerText = Number(statsArray[1]).toFixed(3);
            residualButton.disabled = false;
        }
    });
});

residualButton.addEventListener("click", function () {
    errorLoader.hidden = false;
    $.ajax({
        success: function () {
            calculateResiduals();
            residualLayer.addTo(map);
            addResidualLegend();
            errorLoader.hidden = true;
        }
    });

});

interpolateTip.addEventListener("mouseover", function () {
    interpolatePopup.classList.add("show");
});

interpolateTip.addEventListener("mouseout", function () {
    interpolatePopup.classList.remove("show");
});


regressionHelp.addEventListener("mouseover", function () {
    regressionPopup.classList.add("show");
});

regressionHelp.addEventListener("mouseout", function () {
    regressionPopup.classList.remove("show");
});

residualHelp.addEventListener("mouseover", function () {
    residualPopup.classList.add("show");
});

residualHelp.addEventListener("mouseout", function () {
    residualPopup.classList.remove("show");
});

map.on('click', function(e){
    var coord = e.latlng;
    var lat = coord.lat;
    var lng = coord.lng;
    console.log("You clicked the map at latitude: " + lat + " and longitude: " + lng);
});

// Add all Legends


function addCensusLegend() {
    legendControl.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, .2, .4, .6, .8],
            labels = ['<label>Cancer Rate</label>'];
        div.innerHTML += labels;
        div.innerHTML += '<br>';
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<span style="background:' + getTractsColor(grades[i] + .1) + '"></span> ';
        }

        // a line break
        div.innerHTML += '<br>';

        // second loop for text
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<label>' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + '</label>';
        }
        return div;
    };
        legendControl.addTo(map);
        legend = document.getElementsByClassName('legend')[0];
        console.log(legend);
    };

    function addWellsLegend() {
        welllegendControl.onAdd = function (map) {

            var div = L.DomUtil.create('div', 'well legend'),
                grades = [1, 2, 3, 4, 6, 8, 10],
                labels = ['<label>Obs Nitrate (ppm)</label>'];
            div.innerHTML += labels;
            div.innerHTML += '<br>';

            for (var i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<span style="background:' + getWellColor(grades[i] + .1) + '"></span> ';
            }

            // a line break
            div.innerHTML += '<br>';

            // second loop for text
            for (var i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<label>' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + '</label>';
            }
            return div;
        };

        welllegendControl.addTo(map);
        wellLegend = document.getElementsByClassName('legend')[1];
    };

    function addInterpolateLegend() {
            legend.innerHTML = "";

            var grades = [1, 2, 3, 4, 6, 8, 10],
                labels = ['<label>Est. Nitrate (ppm)</label>'],
                from, to;
            legend.innerHTML += labels;
            legend.innerHTML += '<br>';

            for (var i = 0; i < grades.length; i++) {
                legend.innerHTML +=
                    '<span style="background:' + getHexesColor(grades[i] + .1) + '"></span> ';
            }

            legend.innerHTML += '<br>';


            for (var i = 0; i < grades.length; i++) {
                legend.innerHTML +=
                    '<label>' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + '</label>';
            }

        };

    function addResidualLegend() {
        legend.innerHTML = "";


        var grades = [-.8, -.6, -.4, -.2, 0, .2, .4, .6, .8],
            labels = ['<label>Residual</label>'];
        legend.innerHTML += labels;
        legend.innerHTML += '<br>';
        for (var i = 0; i < grades.length; i++) {
            legend.innerHTML +=
                '<span style="background:' + getResidualColor(grades[i] + .1) + '"></span> ';
        }

        // a line break
        legend.innerHTML += '<br>';

        // second loop for text
        for (var i = 0; i < grades.length; i++) {
            legend.innerHTML +=
                '<label>' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + '</label>';
        }
    };





