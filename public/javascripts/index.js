$(document).ready(function() { 
  init();
});

function init (){
	getAllMovies();
}

function getAllMovies() {
  // jQuery AJAX call for JSON
  $.getJSON('/movie/get/all', function(result) {
    console.log(result)
    if(!result.err && result.data) {
    	appendOptions(result.data);
    } else {
      $('.message').append('<div class="message-box message-err">Movie list is empty</div>');
    }
  });
  return false;
};

function appendOptions(selectValues) {
  var select = $('#select-movie-list');
  select.empty();
	$.each(selectValues, function(key, value) {
    $(select)
	    .append($("<option></option>")
      .attr("value",key)
      .text(value)); 
	});
}

$('#btn-visualize').click(function() {
  var url = "movie/box-office/" + $('#select-movie-list option:selected').val();
  window.location.href = url;
});

$('#btn-load').click(function() {
  var searchString = $("#search-field").val();
  if(searchString) {
    console.log(searchString)
    loadMovieData(searchString);
  } else {
    $('#search-field').addClass('warning');
  }
});

function getInputParams(string) {
  var first = string.substring(3,string.indexOf("-t")-1);
  var second = string.substring(string.indexOf("-t")+3);
  return {boxOffice: first,
    twitter: second
  }
}

function loadMovieData(string) {
  $.getJSON('/movie/load/search', getInputParams(string), function(result) {
    console.log(result)
    if(!result.err && result.data) {
      $('.message').append('<div class="message-box message-success">Title: ' + result.data.theNumbers.name +  ', Box Office Entries : ' + result.data.theNumbers.performance.length
       + ', Tweets Count: ' + result.data.twitterInsights.count + '</div>');
    } else {
      $('.message').append('<div class="message-box message-err">'+result.data.message+'</div>');
    }
    $('.message-box').fadeOut(100000, 'linear');
  });
  return false;
}

function insertReplaceMovieDataCallback(result) {
  if(!result.err && result.data) {
    getAllMovies();
    $('.message').append('<div class="message-box message-success">Tweets Count: ' + result.data.tweets +
      ' Box Office Entries : ' + result.data.theNumbers + '</div>');
  } else {
    $('.message').append('<div class="message-box message-err">'+result.data.message+'</div>');
    $('.message-box').fadeOut(100000, 'linear');
  }
}

$('#btn-insert-replace').click(function(e) {
  var query = $("#search-field").val();
  if(query) {
    $.ajax({
      type: 'GET',
      url: '/movie/replace/query',
      data: getInputParams(query),
      dataType: 'json',
      success: insertReplaceMovieDataCallback,
      error: function(x, t, m) {
        if(t==="timeout") {
            console.log("got timeout");
        } else {
            console.log(t);
            console.log(x);
            console.log(m);
        }
      },
      timeout: 360000000 //60 minutes
      // progress: function(evt) {
      //     if (evt.lengthComputable) {
      //         console.log("Loaded " + parseInt( (evt.loaded / evt.total * 100), 10) + "%");
      //     }
      //     else {
      //         console.log("Length not computable.");
      //     }
      // },
      // progressUpload: function(evt) {
      //   // See above
      // }
    });
  } else {
    $('#search-field').addClass('warning');
  }
  // e.stopImmediatePropagation();
  e.preventDefault();
  return false;
});

$('#btn-delete').click(function(e) {
  var movieName = $('#select-movie-list option:selected').text();
  var ask = confirm("Delete "+movieName+"! Are you sure?");
  if (ask == true) {
      $.ajax({
        type: 'GET',
        url: '/movie/delete/'+movieName,
        dataType: 'json',
        success: deleteMovieDataCallback,
        error: deleteMovieDataCallback
    });
  }
  e.preventDefault();
  return false;
});

function deleteMovieDataCallback(result) {
  if(!result.err && result.data) {
    $('.message').append('<div class="message-box message-success">Movie Deleted</div>');
    getAllMovies();
  } else {
    $('.message').append('<div class="message-box message-err">Error in Deletion</div>');
  }
  $('.message-box').fadeOut(100000, 'linear');
}