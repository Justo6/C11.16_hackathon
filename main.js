/* Sean, Miles, Mike, Vernon    Music Venue     Hack-a-thon     December 12-13, 2016    */

//START GOOGLE PLACES API

/**
 *  https://developers.google.com/maps/documentation/javascript/places
 */

/**
 * Global variables for html elements
 */
var input_zipcode;
var imageSearch;
var places_list;

/**
 * Global variables for url parameters
 */
var venue_name;
var lat_from_landing;       // landing page is now index page -VL
var long_from_landing;
var radius_from_landing;

/**
 * Google maps variables
 */
var map;
var infowindow;
var places_array = [];

/**
 * Twitter variables
 */
var tweet_storage_array = [];   // where I store all the tweets for the current venue
var tweetNum;                   // which Tweet number we are on, the 1st of five
var totalTweetNum;              // the number of tweets we have pulled from Twitter API for the current venue
var psn = [];                   // added 3/25/17 - VL

/**
 * YouTube variables
 */
var YT_num = 5;                // maximum number of YouTube videos inserted into carousel

$(document).ready(function() {
    $("#back").click(back_clicked);     // added 3/25/17, VL

    $("#photo_btn").click(function () {
        $(".Container1").show();
        $(".Container2").hide();
        $(".Container3").hide();
        $("#photo_btn").addClass("disabled");
        $("#tweet_btn").removeClass("disabled");
        $("#video_btn").removeClass("disabled");
    });

    $("#tweet_btn").click(function () {
        $(".Container1").hide();
        $(".Container2").show();
        $(".Container3").hide();
        $("#photo_btn").removeClass("disabled");
        $("#tweet_btn").addClass("disabled");
        $("#video_btn").removeClass("disabled");
    });

    $("#video_btn").click(function () {
        $(".Container1").hide();
        $(".Container2").hide();
        $(".Container3").show();
        $("#photo_btn").removeClass("disabled");
        $("#tweet_btn").removeClass("disabled");
        $("#video_btn").addClass("disabled");
    });

    $(".search_icon").click(function () {
        $("#homePage_form").toggleClass("hide_me");
    });

    lat_from_landing = parseFloat(getUrlParameter("lat"));
    long_from_landing = parseFloat(getUrlParameter("long"));
    radius_from_landing = parseInt(getUrlParameter("radius"));

    if (lat_from_landing && long_from_landing) {
        initMap(lat_from_landing, long_from_landing, radius_from_landing);
    }

    places_list = $('.places-list');
    $(places_list).on('click', '.mediaButton', function(){
        var index = $(this).index('.mediaButton');
        var name = places_array[index].name;
    });

    input_zipcode = $('#zipcode');
    $('.zipCodeButton').click(zipCodeButtonClicked);
    $('.landingPageButton').click(landingPageButtonClicked);    // landing page is now index page -VL

    $('.followingTweets').click(displayFollowingTweets);    // clears current tweets and displays the next 5 tweets
    $('.precedingTweets').click(displayPrecedingTweets);    // clears current tweets and displays the preceding 5 tweets

    $('.autoLocationButton').click(function() {
        radius = null;
        $.ajax({
            dataType:   'json',
            url:        'https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyC87SYazc5x5nNq7digLxdNnB3riG_eaVc',
            method:     "POST",
            success:    function(data) {
                var latitude, longitude;

                latitude = data.location.lat;
                longitude = data.location.lng;
                // document.location.href = "index.html?lat=" + latitude + "&long=" + longitude + "&radius=" + radius;
                document.location.href = "home.html?lat=" + latitude + "&long=" + longitude + "&radius=" + radius;
            }
        });
    });

    venue_name = getUrlParameter("name");
    var vicinity = getUrlParameter("vicinity");
    var city = vicinity.split(",");
    city = city[city.length-1];
    $('.infoVenueName').append(venue_name);
    $(".infoAddress").append(vicinity);

    getAndDisplayFlickrPhotos(venue_name + city);   // flicker API call begins here
    getAndDisplayFirstTweets(venue_name + city);    // gets tweets from Twitter API and displays on info2.html
    getAndDisplayYTVideos(venue_name + city);       // gets videos from YouTube API and displays on info2.html
});

function back_clicked () {
    window.history.back();
}

function milesToMeters(miles) {
    meters = miles * 1609.34;
    return meters;
}

/**
 * Creates a Google Map element inside the #map div and
 * @param lat {number}:
 * @param long
 * @param radius
 */
function initMap(lat, long, radius) {
    // radius in meters
    var keyword = "music venues";

    if (!radius) {
        radius = 50000;
    } else {
        radius = milesToMeters(radius);
    }
    var original_location = {lat: lat, lng: long};

    map = new google.maps.Map(document.getElementById('map'), {
        center: original_location,
        zoom: 10
    });

    infowindow = new google.maps.InfoWindow();
    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
        location: original_location,
        radius: radius,
//                type: ['store']
        keyword: "music venues"
    }, callback);
}

function callback(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
            createMarker(results[i]);
        }
    }

    places_array = results;
    populateList();
}

function createMarker(place) {
    var placeLoc = place.geometry.location;
    var marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location
    });

    google.maps.event.addListener(marker, 'mouseover', function() {     // changed 'click' to 'mouseover' 3/25/17, VL
        infowindow.setContent(place.name);
        infowindow.open(map, this);
    });
}

function populateList() {
    var len = places_array.length;
    $(places_list).html("");

    for(var i = 0; i < len; i++) {
        addPlaceToDom(places_array[i]);
    }
}

function getPlaceDetails(place) {
    var service = new google.maps.places.PlacesService(map);
    var request = {
        placeId: place
    };
    return service.getDetails(request, callback);
}

function addPlaceToDom(placeObj) {
    var name = placeObj.name;
    var vicinity  = placeObj.vicinity;
    var rating  = placeObj.rating;
    //var placeid = placeObj.place_id;
    // var hours = false;
    var hours = "Closed";

    if (placeObj.opening_hours) {
        if (placeObj.opening_hours.open_now){
            hours = "Open";
        }
    }

    var tr = $('<tr>');
    // var media_button = $('<a href="info2.html?name=' + name + '&vicinity='+vicinity+' "><button type="button" class="btn btn-info mediaButton">Info</button></a>');
    // tr.append( $('<td>').html('<a href="#">' + name + '</a>') );
    // tr.append( $('<td>').append(media_button) );
    // tr.append( $('<td>').text(name) );

    tr.append( $('<td>').html('' + name + '<a href="info2.html?name=&vicinity=">'+vicinity+'' + name + '</a>') );
    tr.append( $('<td>').text(vicinity) );
    tr.append( $('<td>').text(hours) );
    tr.append( $('<td>').text(rating) );
    tr.appendTo(places_list);
    // var details = getPlaceDetails(placeid);
}
//END GOOGLE PLACES API

function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
}

function landingPageButtonClicked() {   // landing page is now index page
    zipcode = input_zipcode.val();
    radius = $('#radius').val();
    $.ajax({
        dataType:   'json',
        url:        'http://maps.googleapis.com/maps/api/geocode/json?address='+ zipcode,
        method:     "POST",
        success:    function(data) {
            var latitue, longitude;

            latitude = data.results[0].geometry.location.lat;
            longitude= data.results[0].geometry.location.lng;
            document.location.href = "home.html?lat=" + latitude + "&long=" + longitude + "&radius=" + radius;
        }
    });
}

function zipCodeButtonClicked() {
    zipcode = input_zipcode.val();
    radius = $('#radius').val();
    console.log('click initiated');
    $.ajax({
        dataType:   'json',
        url:        'http://maps.googleapis.com/maps/api/geocode/json?address='+ zipcode,
        method:     "POST",
        success:    function(data) {
            latitude = data.results[0].geometry.location.lat;
            longitude= data.results[0].geometry.location.lng;
            initMap(latitude, longitude, radius);
        }
    });
}

function getAndDisplayFlickrPhotos(string) {
    $(".container1").show();
    imageSearch = string;

    $.ajax({
        dataType:   'json',
        url:        "https://api.flickr.com/services/rest?method=flickr.photos.search&api_key=4291af049e7b51ff411bc39565109ce6&format=json&nojsoncallback=1&text=" + imageSearch,
        success:    function(result) {
            var server = result.photos.photo[0].server;
            var photoId = result.photos.photo[0].id;
            var secret = result.photos.photo[0].secret;
            var image = $("<img>").attr("src", "https://farm1.staticflickr.com/" + server + "/" + photoId + "_" + secret + ".jpg");
            var photosArray = result.photos.photo;

            for (var i = 0; i < 10 && i < photosArray.length; i++) {
                server = result.photos.photo[i].server;
                photoId = result.photos.photo[i].id;
                secret = result.photos.photo[i].secret;
                image = $("<img>").attr("src", "https://farm1.staticflickr.com/" + server + "/" + photoId + "_" + secret + ".jpg");
                if ( !i ) {
                    var imageDiv = $("<div>").addClass("item active");
                    $("#myCarousel .carousel-inner").append(imageDiv);
                    $(imageDiv).append(image);
                }
                else {
                    imageDiv = $("<div>").addClass("item");
                    $("#myCarousel .carousel-inner").append(imageDiv);
                    $(imageDiv).append(image);
                }
            }
        } // end of 'success' function
    }); // end of ajax call
}

/** This function receives Twitter_searchTerm as a parameter and then uses it as a search term for Twitter API.  It then gets all tweets (the profile pic of the tweeter and the tweet), places them into an object with 2 properties (urlPic & twt), and stores the object into the global array.  It then displays the first 5 tweets (assuming there are at least 5).  VL*/
/**
 * @param Twitter_searchTerm - the text that the AJAX call to Twitter searches on
 */
function getAndDisplayFirstTweets (Twitter_searchTerm) {
    var photo, picLink;
    tweetNum = 1;       // global variable; this function is only called once at "document(ready)", so tweetNum will always be 1

    $.ajax ({
        dataType:   'json',
        url:        'http://s-apis.learningfuze.com/hackathon/twitter/index.php',
        method:     "POST",
        data:       {search_term: Twitter_searchTerm},
        success:    function(result) {
            var array = result.tweets.statuses;
            var length = array.length;
            totalTweetNum = length;             // global variable

            for (var j = 0; j < length; j++) {  // store each tweet pic url and text into object within global array
                tweet_storage_array[j] = {};
                tweet_storage_array[j].urlPic = result.tweets.statuses[j].user.profile_image_url;
                tweet_storage_array[j].twt = result.tweets.statuses[j].text;
            }
            displayTweets();                    // display the 1st five tweets, if any
        }
    });
}

/** This function displays 5 tweets at a time.  It creates a table in the DOM and retrieves the object properties (picture and tweet) from the global array.  It then dynamically creates elements onto the  table and displays the tweet (tweeter pic and tweet).  VL */
function displayTweets() {
    var length, photo, picLink, secondNumber, tweet;

    secondNumber = tweetNum + 4;

    if (secondNumber > totalTweetNum) {     // don't want something like "6 to 10 of 8 tweets", want "6 to 8 of 8 tweets"
        secondNumber = totalTweetNum;
    }

    $(".twit thead tr th:nth-child(3)").text(tweetNum);     // this is the table header
    $(".twit thead tr th:nth-child(5)").text(secondNumber);
    $(".twit thead tr th:nth-child(7)").text(totalTweetNum);

    for (var w=tweetNum - 1; w < tweetNum + 4 ; w++) {
        $(".twit tbody").append($("<tr>"));     // append table row

        for (var v=0; v < 2; ++v) {                         // append 2 columns to the row just created
            $(".twit tbody tr:last-child").append($("<td>"));
        }
        $(".twit tbody tr:last-child td:last-child").attr("colspan", "8");  // should really be colspan=7, but for mobile view when photo is removed, then there will be 8 columns for the tweet text to span across

        if (tweet_storage_array.length === 0) {
            $(".twit tbody tr:last-child td:nth-child(2)").text("Sorry, there are no tweets for this venue");
            break;
        }

        picLink = tweet_storage_array[w].urlPic;
        photo = $("<img>", {
            src: picLink
        });
        $(".twit tbody tr:last-child td:first-child").append(photo);

        tweet = tweet_storage_array[w].twt;
        $(".twit tbody tr:last-child td:nth-child(2)").append(tweet);
    } // end of outer for loop
}

/** This function deletes the table rows of the old tweets first, then displays the next 5 tweets.  The if block takes care of the "wrap around" in case the user exceeds the number of tweets. Function called when clicking on "greater than" symbol on right hand side.  VL */
function displayFollowingTweets () {
    tweetNum += 5;
    $("tbody tr").remove();

    if (tweetNum > totalTweetNum) {
        tweetNum = 1;
    }

    displayTweets();
}

/** This function deletes the table rows of the old tweets first, then displays the preceding 5 tweets.  The if block logic takes care of the "wrap around".  Function called when clicking on "less than" symbol on left hand side. VL */
function displayPrecedingTweets () {
    var remainder;

    tweetNum -= 5;
    $("tbody tr").remove();

    if (tweetNum < 1) {             // if you're already at the 1st 5 tweets, then wrap around to the last tweets
        remainder = totalTweetNum % 5;

        if (remainder === 0) {      // tweetNum always starts at 1, 6, 11, 16, etc.
            tweetNum = totalTweetNum - 4;
        } else {
            tweetNum = totalTweetNum - remainder + 1;
        }
    }

    displayTweets();
}

/** This function gets videos based on YT_searchTerm from YouTube.  It retrieves the title and id.  The id is the thing needed to run the video. VL */
/**
 * @param YT_searchTerm - the text that YouTube searches on.
 */
function getAndDisplayYTVideos (YT_searchTerm) {
    var title, id_video, vid;

    $.ajax({
        dataType:   'json',
        url:        'http://s-apis.learningfuze.com/hackathon/youtube/search.php?',
        method:     "POST",
        data:       {q: YT_searchTerm, maxResults: YT_num},
        success:    function (result) {
            var array = result.video;
            // var length = array.length;  save this just in case we want to include all YouTube videos.

            for (var j = 0; j < YT_num; j++) {  // YT_num is a global variable that is initialized to 5 for now.
                title = result.video[j].title;  // Though we don't do anything with title, we might use it in future.
                id_video = result.video[j].id;

                vid = $("<iframe>", {
                    src: "https://www.youtube.com/embed/" + id_video
                });

                if (!j) {
                    var youTubeDiv = $("<div>").addClass("item active");
                    $("#myCarousel2 .carousel-inner").append(youTubeDiv);
                    $(youTubeDiv).append(vid);
                }
                else {
                    youTubeDiv = $("<div>").addClass("item");
                    $("#myCarousel2 .carousel-inner").append(youTubeDiv);
                    $(youTubeDiv).append(vid);
                }
            }
        } // end of 'success' function
    }); // end of ajax call
}

/** Drop down menu, in case we re-use this. VL **/
    // $(".dropPhotosButton").click(function () {
    //     $(".Container1").show();
    //     $(".Container2").hide();
    //     $(".Container3").hide();
    // });
    //
    // $(".dropYouTubeButton").click(function () {
    //     $(".Container3").show();
    //     $(".Container1").hide();
    //     $(".Container2").hide();
    // });
    //
    // $(".dropTweetsButton").click(function () {
    //     $(".Container2").show();
    //     $(".Container1").hide();
    //     $(".Container3").hide();
    // });

