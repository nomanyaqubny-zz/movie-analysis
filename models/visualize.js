"use strict";

//class variables here
var name;

//class definition here
//class constructor
function Visualize() {
	name = "American Sniper";
}

Visualize.prototype.fetch = function(string) {
	return name;
}

Visualize.prototype.getAll = function() {
	return ["American Sniper", "Jurassic World", "Game Of Thrones"];
}

module.exports = Visualize;