"use strict"

/********************************************
This model file is responsible for scraping the the-numbers.com to fetch the box office data
    1. generate a BOT to scrape the-numbers.com
    2. parse the DOM
    3. check if movie name is listed
    4. get link of the box office listing page for a movie
    5. fetch the listing
    6. convert unstructured data into structured data

Author: Noman Yaqub
*********************************************/

var request = require('request'),
	cheerio = require('cheerio'),
    Movie = require('../models/movie'),
    config = require('nconf');

var searchString, movieName, $, performance;

var numbersHost = config.get('scrapper').host,
    url = numbersHost + config.get('scrapper').uri;

function Scrapper(string) {
    searchString = string;
    performance = [];
    movieName = null;
}

Scrapper.prototype = {
	fetch: function(callback) {
        callBot(function(err, result){
            if(err)
                callback(err, result);
            else
                callback(err, {message : 'success', name : movieName.replace(/\'/g,"''"), performance : performance});
        });
	},
    insert : function() {
        return {'name':movieName, 'performance':performance};
    },
    get : function() {
        return {'name':movieName, 'performance':performance};
    },
    getCount : function() {
        return performance.length;
    },
    print : function() {
        console.log("No. of Performance Entries found: " + performance.length);
        console.log(performance)
    }
}

// main method to scrap the the-numbers.com
// first it fetches the Box Office Tab Link of the movie by parsing the movie listing page
// and then visit that url and parse the DOM to get numbers
function callBot(callback) {
    // call method to get the tab link
    getBoxOfficeTabLink(function(err, result){
        if(!err) {
            // if we have url to the listing page, parse the DOM of the url by calling
            fetchDailyBoxOffiePerformance(result.url, function(err){
                callback(err, {message:"Could not retrieve box office performance entries.", data: null});
            });
        }
        else
            callback(err, result);
    });
}

function getBoxOfficeTabLink(callback) {
    retrieveContext(url, function(err) {
        var uri;
        if(!err) uri = parseDailyBoxOfficeChart();

        if(uri) 
            callback(null, {message:"success", url: numbersHost + uri});
        else
            callback(true, {message:"Could not find. Either Movie is not listed on the-numbers.com or bad DOM", data: null});
    });
}

// method to get the DOM of the page in JQuery format
// it requires url
// and cheerio module
// and store the DOM in $ 
function retrieveContext(link, callback) {
    request(link, function(err, resp, body) {
        if(err)
            throw err;
        $ = cheerio.load(body);
        callback(err);
    });
}

// method to parse the DOM of the movie listing page
// returns the url to numbers listing page of the movie
function parseDailyBoxOfficeChart() {
    var uri = null;
    //get all the tr of table in first div of the section having id #main
    //visit each tr by looping over them
    $('#main').children('div').eq(1).find('table tr').each(function() {
        // get the text of anchor tag under second td of each tr
        var movie = $(this).children('td').eq(2).find('a');
        // compare the title of the movie with the search string
        if(movie.text().toLowerCase().indexOf(searchString.toLowerCase()) !== -1 ) {
            movieName = movie.text();
            uri = movie.attr('href');
            console.log("Match Found with Name " + movieName + " & link " + uri);
            return false;
        }
    });
    return uri;
}

function fetchDailyBoxOffiePerformance(url, callback) {
    retrieveContext(url, function(err) {
        if(!err)
            var success = parseDailyBoxOfficePerformance();
        callback(success);
    });
}

// method to fetch the box office entries : date and their gross profit
function parseDailyBoxOfficePerformance() {
    var date, gross;
    // get the children of div having #box_offic_chart id if parent div having id #box-office
    // then get the trs of table placed at 1 position
    // omit first tr and iterate over others
    $('#box-office').children('div#box_office_chart').eq(0).find('table tr').slice(1).each(function() {
        // get child td of each tr one by one
        // date entries are under first td in anchor tag
        date = $(this).children('td').eq(0).find('a').text().replace(/\//g, '-');
        // gross entries are under third td 
        gross = $(this).children('td').eq(2).text().replace(/[^a-z\d]+/gi, '');
        // save date and gross profit in an array
        performance.push({"date":date, "gross":gross});
    });
    // if we have found so entries return false, as this booolean will be used as an error message in callback
    return !performance.length > 0;
}

module.exports = Scrapper;