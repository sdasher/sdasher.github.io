//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function() {

  //pseudo-global variables
  var attrArray = ["EPI", "HLT", "AIR","H2O","HMT","ECO","BDH","FRT","FSH","CCE","APE","WRS","AGR","HAD","PME","PMW","USD","UWD","PBD","MPA","TBN","TBG","SPI","PAR","SHI","TCL","FSS","MTR","DCT","DPT","DMT","DNT","DBT","DST","DXT","WWT","SNM"]; //list of attributes
  // var attrArray = ["varA", "varB", "varC", "varD", "varE"]; //list of attributes
  var expressed = attrArray[0]; //initial attribute

  //chart frame dimensions
  var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

  //create a scale to size bars proportionally to frame and for axis
  var yScale = d3.scaleLinear()
    .range([463, 0])
    .domain([0, 100]);

  //begin script when window loads
  window.onload = setMap();
    getModal();

  function setMap() {
    //map frame dimensions
    var width = window.innerWidth * 0.5,
      height = 460;

    //create new svg container for the map
    var map = d3.select("body")
      .append("svg")
      .attr("class", "map")
      .attr("width", width)
      .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoMercator()
    .translate([width / 2, height / 2])
.scale((width - 1) / 2 / Math.PI);

    var path = d3.geoPath()
      .projection(projection);

      const zoom = d3.zoom()
       .scaleExtent([1, 8])
       .on('zoom', zoomed);

       const svg = d3.select('body').append('svg')
       .attr('width', width)
       .attr('height', height);

     const g = svg.append('g');

     svg.call(zoom);


    //use queue to parallelize asynchronous data loading
    d3.queue()
      .defer(d3.csv, "data/unitsDatasafe.csv") //load attributes from csv
      // .defer(d3.json, "data/EuropeCountries.topojson") //load background spatial data
      .defer(d3.json, "data/world3code.topojson") //load choropleth spatial data
      .await(callback);

    //Example 1.4 line 10
    function callback(error, csvData, world) {
      setGraticule(map, path);
      createDropdown(csvData);

      //translate europe TopoJSON

     // europeCountries = topojson.feature(europe, worldeurope.objects.EuropeCountries),
        var  allCountries = topojson.feature(world, world.objects.world3code).features;

      //add Europe countries to map
      var countries = map.append("path")
        .datum(allCountries)
        .attr("class", "countries")
        .attr("d", path);
      //join csv data to GeoJSON enumeration units
      allCountries = joinData(allCountries, csvData);
      var colorScale = makeColorScale(csvData);
      console.log(colorScale);
      //add enumeration units to the map
      setEnumerationUnits(allCountries, map, path, colorScale);
      setChart(csvData, colorScale);

    }; //END of setMap
  };
  //function to create coordinated bar chart
  function setChart(csvData, colorScale) {


    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
      .attr("class", "chartBackground")
      .attr("width", chartInnerWidth)
      .attr("height", chartInnerHeight)
      .attr("transform", translate);



    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.ADM0_A3;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
       .on("mouseout", dehighlight)
       .on("mousemove", moveLabel);
        //below Example 2.2 line 31...add style descriptor to each rect
   var desc = bars.append("desc")
       .text('{"stroke": "none", "stroke-width": "0px"}');

    //create a text element for the chart title
    var chartTitle = chart.append("text")
      .attr("x", 40)
      .attr("y", 40)
      .attr("class", "chartTitle")
      .text(expressed+" by country");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
      .scale(yScale)


    //place axis
    var axis = chart.append("g")
      .attr("class", "axis")
      .attr("transform", translate)
      .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
      .attr("class", "chartFrame")
      .attr("width", chartInnerWidth)
      .attr("height", chartInnerHeight)
      .attr("transform", translate);

    //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);
  }; //END of setChart()

  //function to create color scale generator
  function makeColorScale(data) {
    var colorClasses = [
      "#edf8e9",
      "#bae4b3",
      "#74c476",
      "#31a354",
      "#006d2c"
    ];
    //create color scale generator
    var colorScale = d3.scaleQuantile()
      .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
      d3.min(data, function(d) {
        return parseFloat(d[expressed]);
      }),
      d3.max(data, function(d) {
        return parseFloat(d[expressed]);
      })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax);

    return colorScale;
  }; //END of makeColorScale

  function setGraticule(map, path) {
    //create graticule generator
    var graticule = d3.geoGraticule()
      .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude


    //create graticule background
    var gratBackground = map.append("path")
      .datum(graticule.outline()) //bind graticule background
      .attr("class", "gratBackground") //assign class for styling
      .attr("d", path) //project graticule
    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
      .data(graticule.lines()) //bind graticule lines to each element to be created
      .enter() //create an element for each datum
      .append("path") //append each element to the svg as a path element
      .attr("class", "gratLines") //assign class for styling
      .attr("d", path); //project graticule lines
  };

  function joinData(allCountries, csvData) {
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i = 0; i < csvData.length; i++) {
      var csvRegion = csvData[i]; //the current region
      var csvKey = csvRegion.ADM0_A3; //the CSV primary key

      //loop through geojson regions to find correct region
      for (var a = 0; a < allCountries.length; a++) {

        var geojsonProps = allCountries[a].properties; //the current region geojson properties
        var geojsonKey = geojsonProps.ADM0_A3; //the geojson primary key

        //where primary keys match, transfer csv data to geojson properties object
        if (geojsonKey == csvKey) {

          //assign all attributes and values
          attrArray.forEach(function(attr) {
            var val = parseFloat(csvRegion[attr]); //get csv attribute value
            geojsonProps[attr] = val; //assign attribute and value to geojson properties
          });
        };
      };
    }; //END for loop

    return allCountries;
  };

  function setEnumerationUnits(allCountries, map, path, colorScale) {
    //add France regions to map

    var regions = map.selectAll(".regions")
      .data(allCountries)
      .enter()
      .append("path")
      .attr("class", function(d) {
        return "regions " + d.properties.ADM0_A3;
      })
      .attr("d", path)
      .style("fill", function(d) {
        return choropleth(d.properties, colorScale);
      })
      .on("mouseover", function(d){
         highlight(d.properties);
     })
     .on("mouseout", function(d){
         dehighlight(d.properties);
     })
     .on("mousemove", moveLabel);

        //below Example 2.2 line 16...add style descriptor to each path
 var desc = regions.append("desc")
     .text('{"stroke": "#000", "stroke-width": "0.5px"}');
  }; //END of setEnumerationUnits()

  //function to test for data value and return color
  function choropleth(props, colorScale) {
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)) {
      return colorScale(val);
    } else {
      return "#CCC";
    };
  }; //END of choropleth();

  //function to create a dropdown menu for attribute selection
  function createDropdown(csvData) {
    //add select element
    var dropdown = d3.select("body")
      .append("select")
      .attr("class", "dropdown")
      .on("change", function() {
        changeAttribute(this.value, csvData)
      });

    //add initial option
    var titleOption = dropdown.append("option")
      .attr("class", "titleOption")
      .attr("disabled", "true")
      .text("Select Attribute");


    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
      .data(attrArray)
      .enter()
      .append("option")
      .attr("value", function(d) {
        return d
      })
      .text(function(d) {
        return d
      });
  }; //END of createDropdown

  //dropdown change listener handler
  function changeAttribute(attribute, csvData) {
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var regions = d3.selectAll(".regions")
      .transition()
      .duration(1000)
      .style("fill", function(d) {
        return choropleth(d.properties, colorScale)
      });

    var bars = d3.selectAll(".bar")
      //re-sort bars
      .sort(function(a, b) {
        return a[expressed] - b[expressed];
      })
      .transition() //add animation
      .delay(function(d, i) {
        return i * 20
      })
      .duration(100);

    updateChart(bars, csvData.length, colorScale);
  }; //end of changeAttribute

  //function to position, size, and color bars in chart
  function updateChart(bars, n, colorScale) {
    //position bars
    bars.attr("x", function(d, i) {
        return i * (chartInnerWidth / n) + leftPadding;
      })
      //size/resize bars
      .attr("height", function(d, i) {
        return 463 - yScale(parseFloat(d[expressed]));
      })
      .attr("y", function(d, i) {
        return yScale(parseFloat(d[expressed])) + topBottomPadding;
      })
      //color/recolor bars
      .style("fill", function(d) {
        return choropleth(d, colorScale);
      });

    var chartTitle = d3.select(".chartTitle")
      .text( expressed + " by country");
  }; //END of updateChart()
  function highlight(props) {
    //change stroke
    var selected = d3.selectAll("." + props.ADM0_A3)
      .style("stroke", "orange")
      .style("stroke-width", "1");

      setLabel(props);
  }; //END of highlight()

  //function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.ADM0_A3)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

            d3.select(".infolabel")
                   .remove();
        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    }; //END of getStyle()
}; //END of dehighlight()

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.ADM0_A3 + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.ADMIN);
};//END of setLabel()
//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
}; //END of moveLabel();

function getModal(){// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("abbrBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
} //END of getModal

function zoomed() {
    g
      .selectAll('path') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);
  } //END of zoomed()
})(); //last line of main.js
