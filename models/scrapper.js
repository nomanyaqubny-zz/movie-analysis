"use strict"

var request = require('request'),
	cheerio = require('cheerio'),
    Movie = require('../models/movie');

var searchString, movieName, $, performance;

var numbersHost = 'http://www.the-numbers.com',
    // url = numbersHost + '/daily-box-office-chart';
    url = numbersHost + '/box-office-chart/daily/2015/08/04';

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
                callback(err, {message : 'success', name : movieName, performance : performance});
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

function callBot(callback) {
    getBoxOfficeTabLink(function(err, result){
        if(!err)
            fetchDailyBoxOffiePerformance(result.url, function(err){
                callback(err, {message:"Could not retrieve box office performance entries.", data: null});
            });
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

function retrieveContext(link, callback) {
    console.log("retrieveContext");
    request(link, function(err, resp, body) {
        if(err)
            throw err;
        $ = cheerio.load(body);
        callback(err);
    });
}

function parseDailyBoxOfficeChart() {
    var uri = null;
    $('#main').children('div').eq(1).find('table tr').each(function() {
        var movie = $(this).children('td').eq(2).find('a');
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
    console.log("fetchDailyBoxOffiePerformance " + url);

    retrieveContext(url, function(err) {
        if(!err)
            var success = parseDailyBoxOfficePerformance();
        callback(success);
    });
}

function parseDailyBoxOfficePerformance() {
    console.log("parseDailyBoxOfficePerformance");
    var date, gross;
    $('#box-office').children('div#box_office_chart').eq(0).find('table tr').slice(1).each(function() {
        date = $(this).children('td').eq(0).find('a').text().replace(/\//g, '-');
        gross = $(this).children('td').eq(2).text().replace(/[^a-z\d]+/gi, '');
        performance.push({"date":date, "gross":gross});
    });
    return !performance.length > 0;
}

module.exports = Scrapper;