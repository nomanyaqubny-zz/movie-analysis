var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	res.render('users', { title: 'Express' });
});

/* GET users listing. */
router.get('/userlist', function(req, res, next) {
	// res.send('respond with a resource');
	var items = new Array();
	items.push({_id : 1, username : "Noman", email : "ny@gmail.com"}); 
	res.json(items);
});

/* POST to adduser. */
router.post('/adduser', function(req, res) {
	console.log(req.body);
});

/* DELETE to deleteuser. */
router.delete('/deleteuser/:id', function(req, res) {
    console.log("Id to delete: " + req.params.id);
});

module.exports = router;
