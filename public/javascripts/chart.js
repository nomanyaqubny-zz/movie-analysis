 function convertToCSV(array) {
  //var wor;
  var str = 'Box Office\tTweets\tdate\r\n';
  for (var i = 0; i < array.length; i++) {
      /*var line = '';
      for (var index in array[i]) {
          if (line != '') line += '\t';
          wor = array[i][index].toString().replace(/-/g,'');
          line += wor;
      }
      str += line + '\r\n';
      */
      str += array[i]["GROSS"].toString().replace(/-/g,'')
      + '\t'
      + array[i]["TWEETS"].toString().replace(/-/g,'')
      + '\t'
      + array[i]["DATE"].toString().replace(/-/g,'')
      + '\r\n';
  }
  return str;
}

function fetchChartJson(start, end) {
  start = typeof start !== 'undefined' ? start : "2015-01-01";
  end = typeof end !== 'undefined' ? end : moment().format('YYYY-MM-DD');
  // jQuery AJAX call for JSON
  var chartData;
  $.getJSON( '/api/service/get/data/visualize/boxofvstweets', {
    start: start,
    end: end
  }, function(result) {
    var stateDecRates = {};
    var stateNames = {};
    if(!result.err && result.data !=null) {
      chartData = convertToCSV(result.data);
      drawChart(chartData);
    } else {
      console.log("Error: Chart Data Returned is Invalid/Empty.");
    }
  });
}

$('input[name="date-range-chart"]').daterangepicker({
    format: 'MM-DD-YYYY',
    startDate: '01/01/2014',
    endDate: moment(),
    minDate: '01/01/2014',
    maxDate: moment(),
    showDropdowns: true,
    showWeekNumbers: true,
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
    fetchChartJson(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
});


function drawChart(tsvData) {
  var margin = {top: 20, right: 80, bottom: 30, left: 60},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var parseDate = d3.time.format("%Y%m%d").parse;

  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var color = d3.scale.category10();

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var line = d3.svg.line()
      .interpolate("basis")
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.temperature); });

  var svg = d3.select(".chart").html("").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var data = d3.tsv.parse(tsvData);
  console.log(data)

  color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));

  data.forEach(function(d) {
    d.date = parseDate(d.date);
  });

  var cities = color.domain().map(function(name) {
    return {
      name: name,
      values: data.map(function(d) {
        return {date: d.date, temperature: +d[name]};
      })
    };
  });

  x.domain(d3.extent(data, function(d) { return d.date; }));

  y.domain([
    0,//d3.min(cities, function(c) { return d3.min(c.values, function(v) { return v.temperature; }); }),
    d3.max(cities, function(c) { return d3.max(c.values, function(v) { return v.temperature; }); })
  ]);


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
      .text("Box Office (thousand $) and number of tweets");

  var city = svg.selectAll(".city")
      .data(cities)
    .enter().append("g")
      .attr("class", "city");

  city.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .style("stroke", function(d) { return color(d.name); });

  city.append("text")
      .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
      .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.temperature) + ")"; })
      .attr("x", 3)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });
}