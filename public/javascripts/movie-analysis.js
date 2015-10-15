//-----------------------------------------------------------------------------
// Copyright (c) 2015, IBM Corp.
// All rights reserved.
//
// Distributed under the terms of the BSD Simplified License.
//
// The full license is in the LICENSE file, distributed with this software.
//
// You may not use this file except in compliance with the License.
//------------------------------------------------------------------------------

var stateTweetData = [];
var stateBoxOffieData = [];
var gTweet;
var gBoxOffice; 

// DOM Ready =============================================================
initialize();

$(document).ready(function () {
  $('.scroll-top').hide();
  //Check to see if the window is top if not then display button
  $(window).scroll(function () {
  if ($(this).scrollTop() > 200) {
    $('.scroll-top').fadeIn();
  } else {
    $('.scroll-top').fadeOut();
  }
});
 
//Click event to scroll to top
$('.scroll-top').click(function () {
  $('html, body').animate({ scrollTop: 0 }, 800);
  return false;
  });
});

$('input[name="date-range-tweets-per-day"]').datepicker({
  changeMonth: true,
  changeYear: true,
  showButtonPanel: true,
}).focus(function() {
  var thisCalendar = $(this);
  $('.ui-datepicker-calendar').detach();
  $('.ui-datepicker-close').click(function() {
    var month = parseInt($("#ui-datepicker-div .ui-datepicker-month :selected").val())+1;
    var year = $("#ui-datepicker-div .ui-datepicker-year :selected").val();
    thisCalendar.datepicker('setDate', new Date(year, month-1, 1));
    getData('tweetsperday', drawDailyTweets, month, year);
  });
});

$('input[name="date-range-tweets-over-time"]').datepicker({
  changeMonth: true,
  changeYear: true,
  showButtonPanel: true
}).focus(function() {
  var thisCalendar = $(this);
  $('.ui-datepicker-calendar').detach();
  $('.ui-datepicker-close').click(function() {
    var month = parseInt($("#ui-datepicker-div .ui-datepicker-month :selected").val())+1;
    var year = $("#ui-datepicker-div .ui-datepicker-year :selected").val();
    thisCalendar.datepicker('setDate', new Date(year, month-1, 1));
    var state = $('.select-us-state option:selected').val();
    getData('sentimentsandcountovertime', drawSentimentCountOverTime, month, year, state);
  });
});

$('input[name="date-range-map1"]').daterangepicker({
  format: 'MM-DD-YYYY',
  startDate: '01/01/2014',
  endDate: moment(),
  minDate: '01/01/2014',
  maxDate: moment(),
  showDropdowns: true,
  showWeekNumbers: false,
  timePicker: false,
  ranges: {
     'Today': [moment(), moment()],
     'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
     'Last 7 Days': [moment().subtract(6, 'days'), moment()],
     'Last 30 Days': [moment().subtract(29, 'days'), moment()],
     'This Month': [moment().startOf('month'), moment().endOf('month')],
     'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
  },
  opens: 'left',
  drops: 'down',
  buttonClasses: ['btn', 'btn-sm'],
  applyClass: 'btn-primary',
  cancelClass: 'btn-default',
  separator: ' to ',
  locale: {
      applyLabel: 'Submit',
      cancelLabel: 'Cancel',
      fromLabel: 'From',
      toLabel: 'To',
      customRangeLabel: 'Custom',
      daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr','Sa'],
      monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      firstDay: 1
  }
}, function(start, end, label) {
  fetchTweetsJson(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
});

var width = 960,
    height = 500,
    active = d3.select(null);

var projection = d3.geo.albersUsa()
    .scale(1000)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

/* First Map */

var svg1 = d3.select(".map1").append("svg")
  .attr("width", width)
  .attr("height", height);

svg1.append("rect")
  .attr("class", "background")
  .attr("width", width)
  .attr("height", height)
  .on("click", reset);

function drawTweetsMap() {
  gTweet = svg1.append("g").style("stroke-width", "1.5px");

  d3.json("/javascripts/us.json", function(error, us) {

    var states = gTweet.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .enter().append("path")
      .attr("d", path)
      .attr("class", "feature tooltips")
      .attr("id", function (d) {
        return d.id;
      })
      .style("fill", getTweetMapColor)
      .attr("title", getTweetTitle)
      // .html('<div style="width: 150px;">This is some information about whatever</div>')
      .on("mouseover", onMouseOverTweetMap)
      .on('mouseout', onMouseOutTweetMap);
      // .on("click", clicked);

    gTweet.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "mesh")
      .attr("d", path);

    $('.tooltips').tooltipsy();

  });
}

function getTweetTitle(d) {
  var stateID = d.id.split("-")[1].toString();
  var title = 'No Data Available';
  if(stateTweetData["count"][stateID]) {
    var count = stateTweetData["count"][stateID];
    var name = stateTweetData["name"][stateID];
    title = name + ": " + count;
  }
  return title;
}

function onMouseOverTweetMap(d) {
  var nodeSelection = d3.select(this).style({opacity:'0.8'});
  var stateID = d.id.split("-")[1].toString();
  var display = '<h4>Tweets Per State</h4><b/>No Data Available';
  if (stateTweetData["count"][stateID]) {
    var count = stateTweetData["count"][stateID];
    var name = stateTweetData["name"][stateID];
    display = '<h4>Tweets Per State</h4><b/>' + name + ' : ' + count;
  }
  d3.select(".map1 .info").html(display);
}

function onMouseOutTweetMap(d) {
  var nodeSelection = d3.select(this).style({opacity:'1.0'});
  //nodeSelection.select("text").style({opacity:'0.8'});
  d3.select(".map1 .info").html('<h4>Tweets Per State</h4>Hover over a state to see');
}

// get color depending on population density value
function getTweetMapColor(d) {
  var stateID = d.id.split("-")[1].toString();
  var count = stateTweetData["count"][stateID];
  return count > 50000  ? '#800026' :
         count > 40000  ? '#BD0026' :
         count > 30000  ? '#E31A1C' :
         count > 20000  ? '#FC4E2A' :
         count > 10000  ? '#FD8D3C' :
         count > 5000   ? '#FEB24C' :
         count > 2000   ? '#FED976' :
         count > 0      ? '#FFEDA0' :
                          '#ccc';
}

var svg2 = d3.select(".map2").append("svg")
  .attr("width", width)
  .attr("height", height);

svg2.append("rect")
  .attr("class", "background")
  .attr("width", width)
  .attr("height", height)
  .on("click", reset);

function drawBoxOfficeMap() {
  gBoxOffice = svg2.append("g").style("stroke-width", "1.5px");

  d3.json("/javascripts/us.json", function(error, us) {
    var states = gBoxOffice.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .enter().append("path")
      .attr("d", path)
      .attr("class", "feature tooltips")
      .attr("id", function (d) {
        return d.id;
      })
      .style("fill", getBoxOfficeMapColor)
      .attr("title", getBoxOfficeTitle)
      // .html('<div style="width: 150px;">This is some information about whatever</div>')
      .on("mouseover", onMouseOverBoxOfficeMap)
      .on('mouseout', onMouseOutBoxOfficeMap);
      // .on("click", clicked);

    gBoxOffice.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "mesh")
      .attr("d", path);
  });
}

function getBoxOfficeTitle(d) {
  var title = 'No data available';
  var stateID = d.id.split("-")[1].toString();
  if(stateBoxOffieData["declineRate"][stateID]) {
    var declineRate = stateBoxOffieData["declineRate"][stateID];
    var name = stateBoxOffieData["name"][stateID];
    title =  name + ": " + declineRate + "%"
  }
  return title;
}

function onMouseOverBoxOfficeMap(d) {
  var nodeSelection = d3.select(this).style({opacity:'0.8'});
  //nodeSelection.select("text").style({opacity:'1.0'});
  var display = '<h4>Tweet percentage left</h4><b>No data available</b>';
  var stateID = d.id.split("-")[1].toString();
  if(stateBoxOffieData["declineRate"][stateID]) {
    var declineRate = stateBoxOffieData["declineRate"][stateID];
    var name = stateBoxOffieData["name"][stateID];
    display = '<h4>Tweet percentage left</h4><b>' + name + ' : ' + declineRate + '%</b>';
  }
  d3.select(".map2 .info").html(display);
}

function onMouseOutBoxOfficeMap(d) {
  var nodeSelection = d3.select(this).style({opacity:'1.0'});
  //nodeSelection.select("text").style({opacity:'0.8'});
  d3.select(".map2 .info").html('<h4>Tweet percentage left</h4>Hover over a state to see');
}

// get color depending on population density value
function getBoxOfficeMapColor(d) {
  var stateID = d.id.split("-")[1].toString();
  var rate = stateBoxOffieData["declineRate"][stateID];
  return rate > 15.0  ? '#234d20' :
         rate > 10.0  ? '#36802d' :
         rate > 8.0   ? '#77ab59' :
         rate > 5.0   ? '#c9df8a' :
         rate > 4.0   ? '#f9db57' :
         rate > 2.0   ? '#f8aa38' :
         rate > 1.0   ? '#f7614b' :
         rate >= 0.0   ? '#F5361A' :
                       '#ccc';
}

function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = .9 / Math.max(dx / width, dy / height),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  g.transition()
      .duration(750)
      .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  g.transition()
      .duration(750)
      .style("stroke-width", "1.5px")
      .attr("transform", "");
}

// Fill table with data
function fetchTweetsJson(start, end) {
  start = typeof start !== 'undefined' ? start : "2015-01-01";
  end = typeof end !== 'undefined' ? end : moment().format('YYYY-MM-DD');
  // jQuery AJAX call for JSON
  $.getJSON( '/api/service/get/data/visualize/tweetsperstate',
  {
    start: start,
    end: end
  }, function(result) {
    var stateCount = {};
    var stateNames = {};
    console.log(result)
    if(!result.err && result.data) {
      var data = result.data;
      for (var i = 0; i < data.length; i++) {
        if(data[i].STATECODE !== null) {
          stateCount[data[i].STATECODE] = data[i].COUNT;
          stateNames[data[i].STATECODE] = data[i].STATENAME;
        }
      };
      stateTweetData["count"] = stateCount;
      stateTweetData["name"] = stateNames;
      drawTweetsMap();
    } else {
      console.log("Error: Tweet Per State Data Returned is Invalid/Empty.");
    }
  });
  return false;
};

// Fill table with data
function fetchBoxOfficeJson(start, end) {
  // jQuery AJAX call for JSON
  $.getJSON( '/api/service/get/data/visualize/tweetsdeclinerate', function(result) {
    var stateDecRates = {};
    var stateNames = {};
    var num;
    if(!result.err && result.data) {
      var data = result.data;
      for (var i = 0; i < data.length; i++) {
        if(data[i].STATECODE !== null) {
          num = data[i].DECLINERATE;
          stateDecRates[data[i].STATECODE] = Math.round(num * 100) / 100;
          stateNames[data[i].STATECODE] = data[i].STATENAME;
        }
      };
      stateBoxOffieData["declineRate"] = stateDecRates;
      stateBoxOffieData["name"] = stateNames;
      drawBoxOfficeMap();
    } else {
      console.log("Error: Tweet Decline Rate Data Returned is Invalid/Empty.");
    }
  });
  return false;
};

function fetchUSstates() {
  $.getJSON('/api/service/get/data/list/usstates',
    function(result) {
      var select = $('.select-us-state');
      select.empty();
      $.each(result.data, function(key, value) {
        $(select)
          .append($("<option></option>")
          .attr("value",key)
          .text(value)); 
      });
  });
}

$('.select-us-state').on('change', function() {
  var date = $('input[name="date-range-tweets-over-time"]').datepicker("getDate");
  getData('sentimentsandcountovertime', drawSentimentCountOverTime, $.datepicker.formatDate("m", date), $.datepicker.formatDate("yy", date), this.value);
})

function initialize() {
  //$.getJSON( '/login', function(response) {
    // if(response && response.success) {
      getData('topmonth', drawGraphicsWithDatePicker);
      getData('topday', drawTopDay);
      getData('topstate', drawTopState);
      getData('topcity', drawTopCity);
      getData('topsentiment', drawTopSentiment);
      getData('topthreelanguages', drawDonut);
      getData('tweetcountpergender', drawGenderChart);
      getData('tweetscountpersentiment', drawDonut);
      getData('tweetspermonth', drawDailyTweets);
      getData('tweetscountpersentimentandlanguage', drawSentimentsPerLanugage);
      fetchUSstates();
      fetchTweetsJson();
      fetchChartJson(); //chart.js
      fetchBoxOfficeJson();
    //} else {
      //console.log("Error: Login Failed");
    //}
  //});
}

function getData(service, callback, start, end, extra) {
  var start = typeof start !== 'undefined' ? start : moment().format('MM'),
      end = typeof end !== 'undefined' ? end : moment().format('YYYY');

  $.getJSON('/api/service/get/data/visualize/'+service, 
    {
      start: start,
      end: end,
      extra: extra
    },
    function(result) {
      callback(result.err, result.data, service)
  });
  return false;
}

function drawGraphicsWithDatePicker(err, data) {
  if(!err && data) {
    var date = new moment(data[0].DATE);
    $('input[name="date-range-tweets-per-day"]').val(date.format('MM/DD/YYYY'));
    getData('tweetsperday', drawDailyTweets, date.format('MM'), date.format('YYYY'), "ALL");
    $('input[name="date-range-tweets-over-time"]').val(date.format('MM/DD/YYYY'));
    getData('sentimentsandcountovertime', drawSentimentCountOverTime, date.format('MM'), date.format('YYYY'), "ALL");
  }
}

function drawTopCity(err, data) {
  if(!err && data) {
    $('.top-city h4').html(data[0].CITYNAME);
    $('.top-city h5').html('with ' + data[0].COUNT + ' Tweets');
  }
}

function drawTopState(err, data) {
  if(!err && data) {
    $('.top-state h4').html(data[0].STATENAME);
    $('.top-state h5').html('with ' + data[0].COUNT + ' Tweets');
  }
}

function drawTopDay(err, data) {
  if(!err && data) {
    $('.top-day h4').html(data[0].DAY);
    $('.top-day h5').html('with ' + data[0].COUNT + ' Tweets');
  }
}

function drawTopSentiment(err, data) {
  if(!err && data) {
    $('.top-sentiment h4').html(data[0].SENTIMENT);
    $('.top-sentiment h5').html('with ' + data[0].COUNT + ' Tweets');
  }
}

function drawDonut(err, dataset, service) {
  if(!err && dataset) {
    var chartClass;
    if(service.indexOf('language')>-1) {
      chartClass = "top-languages";
    } else {
      chartClass = "top-sentiments";
    }

    var width = 300;
    var height = 300;
    var radius = Math.min(width, height) / 2;
    var donutWidth = 60;
    var legendRectSize = 18;
    var legendSpacing = 4;

    var color = d3.scale.ordinal()
        .range(["#4CAF50", "#CC3333", "#FFCC00", "#2196F3"]);

    var svg = d3.select('.'+chartClass)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', 'translate(' + (width / 2) + 
        ',' + (height / 2) + ')');

    var arc = d3.svg.arc()
      .innerRadius(radius - donutWidth)
      .outerRadius(radius);

    var pie = d3.layout.pie()
      .value(function(d) { return d.COUNT; })
      .sort(null);

    var tooltip = d3.select('.'+chartClass)
      .append('div')
      .attr('class', 'donut-tooltip');
                  
    tooltip.append('div')
      .attr('class', 'label');
         
    tooltip.append('div')
      .attr('class', 'count');

    tooltip.append('div')
      .attr('class', 'percent');


    var path = svg.selectAll('path')
      .data(pie(dataset))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', function(d, i) { 
        return color(d.data.LABEL); 
      });

    path.on('mouseover', function(d) {
      var total = d3.sum(dataset.map(function(d) {
        return d.COUNT;
      }));
      var percent = Math.round(1000 * d.data.COUNT / total) / 10;
      tooltip.select('.label').html(d.data.LABEL.toUpperCase());
      tooltip.select('.count').html(d.data.COUNT);
      tooltip.select('.percent').html(percent + '%');
      tooltip.style('display', 'block');
    });
    
    path.on('mouseout', function() {
      tooltip.style('display', 'none');
    });
      
    var legend = svg.selectAll('.legend')
      .data(color.domain())
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) {
        var height = legendRectSize + legendSpacing;
        var offset =  height * color.domain().length / 2;
        var horz = -3 * legendRectSize;
        var vert = i * height - offset;
        return 'translate(' + horz + ',' + vert + ')';
      });

    legend.append('rect')
      .attr('width', legendRectSize)
      .attr('height', legendRectSize)                                   
      .style('fill', color)
      .style('stroke', color);
      
    legend.append('text')
      .attr('x', legendRectSize + legendSpacing)
      .attr('y', legendRectSize - legendSpacing)
      .text(function(d) { return d.toUpperCase(); });
  }
}

function drawGenderChart(err, data) {
  if(!err && data) {
    var margin = {top: 30, right: 10, bottom: 20, left: 70},
        width = 300 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var svg = d3.select(".gender-tweets-count").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      x.domain(data.map(function(d) {return d.GENDER;}));
      y.domain([0, d3.max(data, function(d) {return d.COUNT; })]);

      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Tweets");

      svg.selectAll(".bar")
          .data(data)
        .enter().append("rect")
          .attr("class", "bar")
          .attr("x", function(d) { return x(d.GENDER); })
          .attr("width", x.rangeBand())
          .attr("y", function(d) { return y(d.COUNT); })
          .attr("height", function(d) { return height - y(d.COUNT); });

    } else {
      console.log("Error: Tweet Count per Gender Data Returned is Invalid/Empty.");
    }
}

function filterData(data) {
  var obj;
  var next = false;
  var date = "";
  var fileteredData = [];
  for (var i = 0; i < data.length; i++) {
    if(date === data[i].DATE) {
      obj[data[i].SENTIMENT] = data[i].COUNT;
    } else {
      if(next) fileteredData.push(obj)
      obj = {DATE:data[i].DATE,POSITIVE:0,NEGATIVE:0,NEUTRAL:0,AMBIVALENT:0};
      date = data[i].DATE;
      obj[data[i].SENTIMENT] = data[i].COUNT;
      next = true;
    }
  };
  return filterData;
}

function drawDailyTweets(err, data, service) {
  if(!err && data) {
    var chartclass, chartformat, incomingFormat;
    if(service.indexOf('day')>-1){
      chartclass = ".day-tweets-count";
      incomingFormat = "%Y-%m-%d";
      chartformat = "%d";
    } else {
      chartclass = ".monthly-tweets-count";
      incomingFormat = "%Y-%m";
      chartformat = "%b";
    }

    var margin = {top: 50, right: 55, bottom: 30, left: 75},
      width  = 1000 - margin.left - margin.right,
      height = 500  - margin.top  - margin.bottom,
      parse = d3.time.format(incomingFormat).parse,
      format = d3.time.format(chartformat);

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);
    var y = d3.scale.linear()
        .rangeRound([height, 0]);
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
    var color = d3.scale.ordinal()
        .range(["#4CAF50", "#CC3333", "#FFCC00", "#2196F3"]);

    var svg = d3.select(chartclass).html("").append("svg")
    .attr("width",  '100%')
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var labelVar = 'DATE';
    var varNames = d3.keys(data[0]).filter(function (key) { return key !== labelVar;});
    color.domain(varNames);
        
    data.forEach(function (d) {
      var y0 = 0;
      d.mapping = varNames.map(function (name) { 
        return {
          name: name,
          label: d[labelVar],
          y0: y0,
          y1: y0 += +d[name]
        };
      });
      d.total = d.mapping[d.mapping.length - 1].y1;
    });

    x.domain(data.map(function (d) { return format(parse(d.DATE)); }));
    y.domain([0, d3.max(data, function (d) { return d.total; })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Number of Tweets");
    
    var selection = svg.selectAll(".series")
        .data(data)
      .enter().append("g")
        .attr("class", "series")
        .attr("transform", function (d) { return "translate(" + x(format(parse(d.DATE))) + ",0)"; });

    selection.selectAll("rect")
      .data(function (d) { return d.mapping; })
    .enter().append("rect")
      .attr("width", x.rangeBand())
      .attr("y", function (d) { return y(d.y1); })
      .attr("height", function (d) { return y(d.y0) - y(d.y1); })
      .style("fill", function (d) { return color(d.name); })
      .style("stroke", "grey")
      .on("mouseover", function (d) { showPopover.call(this, d); })
      .on("mouseout",  function (d) { removePopovers(); })
    
    var legend = svg.selectAll(".legend")
        .data(varNames.slice().reverse())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function (d, i) { return "translate(90," + i * 20 + ")"; });
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);
    legend.append("text")
        .attr("x", width - 18)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function (d) { return d; });

    function removePopovers () {
      $('.popover').each(function() {
        $(this).remove();
      }); 
    }
    function showPopover (d) {
      $(this).popover({
        title: d.name,
        placement: 'auto top',
        container: 'body',
        trigger: 'manual',
        html : true,
        content: function() { 
          return "Date: " + d.label + 
                 "<br/>Tweets: " + d3.format(",")(d.value ? d.value: d.y1 - d.y0); }
      });
      $(this).popover('show')
    }
  }
}

function drawSentimentCountOverTime (err, data) {
  if(!err && data) {
    var incomingFormat = "%Y-%m-%d",
        chartformat = "%d";
        parse = d3.time.format(incomingFormat).parse,
        format = d3.time.format(chartformat);

    var margin = {top: 50, right: 55, bottom: 30, left: 75},
        width  = 1000 - margin.left - margin.right,
        height = 500  - margin.top  - margin.bottom;
    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);
    var y = d3.scale.linear()
        .rangeRound([height, 0]);
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
    var stack = d3.layout.stack()
        .offset("zero")
        .values(function (d) { return d.values; })
        .x(function (d) { return x(d.label) + x.rangeBand() / 2; })
        .y(function (d) { return d.value; });
    var area = d3.svg.area()
        .interpolate("cardinal")
        .x(function (d) { return x(d.label) + x.rangeBand() / 2; })
        .y0(function (d) { return y(d.y0); })
        .y1(function (d) { return y(d.y0 + d.y); });
    
    var color = d3.scale.ordinal()
        .range(["#4CAF50", "#CC3333", "#FFCC00", "#2196F3"]);    
    var svg = d3.select(".sentiments-tweets-count-over-time").html("").append("svg")
        .attr("width",  '100%')
        .attr("height", height + margin.top  + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var labelVar = 'DATE';
    var varNames = d3.keys(data[0])
        .filter(function (key) { return key !== labelVar;});
    color.domain(varNames);

    var seriesArr = [], series = {};
    varNames.forEach(function (name) {
      series[name] = {name: name, values:[]};
      seriesArr.push(series[name]);
    });
    
    data.forEach(function (d) {
      varNames.map(function (name) {
        series[name].values.push({name: name, label: format(parse(d[labelVar])), value: +d[name]});
      });
    });
    
    x.domain(data.map(function (d) { return format(parse(d.DATE)); }));
    stack(seriesArr);

    y.domain([0, d3.max(seriesArr, function (c) { 
      return d3.max(c.values, function (d) { return d.y0 + d.y; });
    })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Number of Tweets");

    var selection = svg.selectAll(".series")
      .data(seriesArr)
      .enter().append("g")
        .attr("class", "series");
    selection.append("path")
      .attr("class", "streamPath")
      .attr("d", function (d) { return area(d.values); })
      .style("fill", function (d) { return color(d.name); })
      .style("stroke", "grey");

    var points = svg.selectAll(".seriesPoints")
      .data(seriesArr)
      .enter().append("g")
        .attr("class", "seriesPoints");
    points.selectAll(".point")
      .data(function (d) { return d.values; })
      .enter().append("circle")
       .attr("class", "point")
       .attr("cx", function (d) { return x(d.label) + x.rangeBand() / 2; })
       .attr("cy", function (d) { return y(d.y0 + d.y); })
       .attr("r", "10px")
       .style("fill",function (d) { return color(d.name); })
       .on("mouseover", function (d) { showPopover.call(this, d); })
       .on("mouseout",  function (d) { removePopovers(); })
    
    var legend = svg.selectAll(".legend")
        .data(varNames.slice().reverse())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function (d, i) { return "translate(90," + i * 20 + ")"; });
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);
    legend.append("text")
        .attr("x", width - 18)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function (d) { return d; });
    
    function removePopovers () {
      $('.popover').each(function() {
        $(this).remove();
      }); 
    }
    function showPopover (d) {
      $(this).popover({
        title: d.name,
        placement: 'auto top',
        container: 'body',
        trigger: 'manual',
        html : true,
        content: function() { 
          return "Date: " + d.label + 
                 "<br/>Tweets: " + d3.format(",")(d.value ? d.value: d.y1 - d.y0); }
      });
      $(this).popover('show')
    }
  }
}

function drawSentimentsPerLanugage(err, data) {
  if(!err && data) {
  var margin = {top: 50, right: 55, bottom: 30, left: 75},
      width = 1000 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;
   
  var x0 = d3.scale.ordinal()
      .rangeRoundBands([0, width], 0.1);
   
  var x1 = d3.scale.ordinal();
   
  var y = d3.scale.linear()
      .range([height, 0]);
   
  var xAxis = d3.svg.axis()
      .scale(x0)
      .orient("bottom");
   
  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickFormat(d3.format(".2s"));
   
    var color = d3.scale.ordinal()
        .range(["#4CAF50", "#CC3333", "#FFCC00", "#2196F3"]);
   
  var svg = d3.select(".sentiments-tweets-count-per-lanugage").append("svg")
      .attr("width",  '100%')
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
   
  var yBegin;
   
  var innerColumns = {
    "column1" : ["POSITIVE"],
    "column2" : ["NEGATIVE"],
    "column3" : ["NEUTRAL"],
    "column4" : ["AMBIVALENT"]
  }
   
  var columnHeaders = d3.keys(data[0]).filter(function(key) { return key !== "LANGUAGE"; });
  color.domain(d3.keys(data[0]).filter(function(key) { return key !== "LANGUAGE"; }));
  data.forEach(function(d) {
    var yColumn = new Array();
    d.columnDetails = columnHeaders.map(function(name) {
      for (ic in innerColumns) {
        if($.inArray(name, innerColumns[ic]) >= 0){
          if (!yColumn[ic]){
            yColumn[ic] = 0;
          }
          yBegin = yColumn[ic];
          yColumn[ic] += +d[name];
          return {name: name, column: ic, yBegin: yBegin, yEnd: +d[name] + yBegin,};
        }
      }
    });
    d.total = d3.max(d.columnDetails, function(d) { 
      return d.yEnd; 
    });
  });
 
  x0.domain(data.map(function(d) { return d.LANGUAGE; }));
  x1.domain(d3.keys(innerColumns)).rangeRoundBands([0, x0.rangeBand()]);
 
  y.domain([0, d3.max(data, function(d) { 
    return d.total; 
  })]);
 
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
 
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".7em")
      .style("text-anchor", "end")
      .text("");
 
  var project_stackedbar = svg.selectAll(".project_stackedbar")
      .data(data)
    .enter().append("g")
      .attr("class", "g")
      .attr("transform", function(d) { return "translate(" + x0(d.LANGUAGE) + ",0)"; });
 
  project_stackedbar.selectAll("rect")
      .data(function(d) { return d.columnDetails; })
    .enter().append("rect")
      .attr("width", x1.rangeBand())
      .attr("x", function(d) { 
        return x1(d.column);
         })
      .attr("y", function(d) { 
        return y(d.yEnd); 
      })
      .attr("height", function(d) { 
        return y(d.yBegin) - y(d.yEnd); 
      })
      .style("fill", function(d) { return color(d.name); });
 
  var legend = svg.selectAll(".legend")
      .data(columnHeaders.slice().reverse())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(90," + i * 20 + ")"; });
 
  legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);
 
  legend.append("text")
      .attr("x", width - 18)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
  }
}