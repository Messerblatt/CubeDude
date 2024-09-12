window.trigger = ($(window).width() < 968) ? "touchstart" : "click";
let music_metadata;
$.getJSON("/data/music_metadata.json", function(data) {
  music_metadata = data
})

// URL validator taken from https://www.jsowl.com
const isValidUrl = urlString=> {
  var urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
  '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
  return !!urlPattern.test(urlString);
}



// TODO: A self-contained Keymap
var KEY_SPACE = 32;
var KEY_ESCAPE = 27;
var KEY_f = 70;
var KEY_d = 68;
var KEY_r = 82;
var KEY_e = 69;
var KEY_t = 84;
var KEY_l = 76;
var KEY_i = 73;

var analyzer = Pz.context.createAnalyser();

// Get the depth of an object
const objectDepth = (o) =>
  Object (o) === o ? 1 + Math.max(-1, ... Object.values(o).map(objectDepth)) : 0

$(document).ready(function() {
  console.log("$")
  populate_HTML();
  register_songs();
  init_playPause();
  fx_load();
  fx_keybindings();
  setup_viz();
  populate_info_menu();
  // setup_mobile();
})

function populate_HTML() {
  $.getJSON("/data/folders.json", function(data) {
    $.each(data, function(folder, song) {
      var html = `<div class="folder subfolder txt_left"><b>${folder}</b>`
        $.each(song, function(title, data) {
          html += `<div class="file song" target="/api/public/audio/${folder}/${title}">${title}</div>`;
        })

        html += `</div>`
        $(".sidebar").append(html)
    })
  }) 
}

function init_loading_screen() {
  setTimeout(function() {
    $(".loading_screen").fadeOut();
  }, 200)
}

function populate_info_menu() {
  var info_menu = $(".info_menu_container")
  info_menu.load("info.html")
  $(window).keydown(function(e) {
    switch(e.which) {
      case KEY_i:
        info_menu.toggle();
        break;
      case KEY_ESCAPE:
        info_menu.css("display", "none")
    }
  })

  $(document).on(window.trigger, ".info_menu", function() {
    info_menu.toggle();
  })
}

function register_songs() {
  $(document).on("click", ".song", function(event) {
    event.stopPropagation();
    var songname = $(this).attr("target");
    
    var path_split = songname.split("/")
    var path = "../audio/" 
      + path_split[path_split.length - 2] // Get folder
      + "/"
      + path_split[path_split.length - 1] // Get song inside folder

    extract_metadata(songname)
    window.song.stop();
    window.song = new Pz.Sound(path, function() {
      window.song.attack = 0;
      window.song.loop = true;
      window.song.play();
      window.song.connect(analyzer);
      window.song.volume = $("#volume").val() / 100;
      // $(".playPause").siblings(".underline").addClass("border_bottom_red")
      
    })

    $(".active_icon").removeClass("active_icon")
    $(this).siblings(".active_icon").addClass("active_icon")
    $(".song").removeClass("active_song");
    $(this).addClass("active_song");
    var substrings = songname.split("/")
    $("#title").html(substrings[substrings.length - 1].split(".")[0]);
    // $('.back_home_container').get(0).scrollIntoView(); For mobile only
  })
}


// Encapsulate Event-listeners maybe?
$("#volume").on("input", function() {
  var volume = $(this).val()
  window.song.volume = volume / 100;
})

$(document).on(window.trigger, ".folder", function(e) {
  $(this).children(".subfolder").toggle();
  $(this).unbind("mouseover mouseleave")
})

$(document).on("mouseover mouseleave", ".file", function(e) {
  if (e.type == "mouseover") {
    $(this).addClass("highlighted")
  } else {
    $(this).removeClass("highlighted")
  }
})


function init_playPause() {
  // Register PlayPause on Spacebar
  $(window).keydown(function(e) {
    if (e.which == KEY_SPACE) {
      playPause();
    }
  })
  $(document).on(window.trigger, ".playPause", function() {
    playPause()
  })
}

function fx_load() {
  $(document).on(
    window.trigger,
    ".flanger, .distortion, .reverb, .delay, .tremolo, .lowPassFilter",
    function() {
      var fx = $(this).attr("fx")
      if (!window.effects[fx]["set"]) {
        window.song.addEffect(window.effects[fx]["ref"])
        window.effects[fx]["set"] = true
        $(this).siblings(".underline").addClass("border_bottom_red")
        $(this).css("background-color", "red")
      } else {
        window.song.removeEffect(window.effects[fx]["ref"])
        window.effects[fx]["set"] = false
        $(this).siblings(".underline").removeClass("border_bottom_red")
        $(this).css("background-color", "#111")
      }
  })
}

function fx_keybindings() {
  $.getScript('scripts/effects.js', function() {
    $(window).keydown(function(e) {
      switch(e.which) {
        case KEY_d:
          $(".distortion").trigger(window.trigger);
          break;
        case KEY_f:
          $(".flanger").trigger(window.trigger);
          break;
        case KEY_e:
          $(".delay").trigger(window.trigger);
          break;
        case KEY_r:
          $(".reverb").trigger(window.trigger);
          break;
        case KEY_l:
          $(".lowPassFilter").trigger(window.trigger);
          break;
        case KEY_t:
          $(".tremolo").trigger(window.trigger);
          break;
      }
   });
  })
}

function setup_viz() {
  var canvas = $(".a_viz")[0]
  canvas.width = $(window).width();
  canvas.height = 250;
  var canvasCtx = canvas.getContext("2d");
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  
  var bufferLength = analyzer.frequencyBinCount;
  window.song.connect(analyzer);
  var data = new Float32Array(bufferLength);
  
  function draw() {

    requestAnimationFrame(draw);
    analyzer.getFloatFrequencyData(data);
    canvasCtx.clearRect(0,0, canvas.width, canvas.height)

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let posX = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (data[i] + 140) * 2;
      
      canvasCtx.fillStyle = `rgb(255 28 28)`;
      canvasCtx.fillRect(
        posX + .5,
        canvas.height - barHeight / 1.25 + .5,
        4,
        4
      );
      posX += barWidth + 1;
    }
  }
  draw();
}

function setup_mobile() {
  $.mobile.defaultPageTransition = 'none'
  $.mobile.defaultDialogTransition = 'none'
  $.mobile.buttonMarkup.hoverDelay = 0
  function findX(object, item) { 
    var val = object[item];
    if (item !== undefined) {
      return item;
    }
    for (var name in object) {
      var result = findX(object[name]);
      if (result !== undefined) {
        return result;
      }
    }
    return undefined;
  }
}

function playPause() {  
  if (window.song.paused) {
    $("#playPause").css("background-color", "red")
    $("#playPause").siblings(".underline").addClass("border_bottom_red")
    $("#playPause").html("Pause")
    window.song.play();
    window.song.paused = false;
    $(".playPause").attr("src", "/HUD/icons/play.png");
  } else {
    window.song.pause();
    $(".playPause").attr("src", "/HUD/icons/pause1.png");
    $("#playPause").css("background-color", "#111")
    $("#playPause").siblings(".underline").removeClass("border_bottom_red")
    $("#playPause").html("Play")
  }
}

function extract_metadata(songname) {
  
  var path_split = songname.split("/")
  var path = "../audio/" 
    + path_split[path_split.length - 2]
    + "/"
    + path_split[path_split.length - 1]

  console.log(path)
  var title = path_split[path_split.length - 1]
  var song_data = music_metadata[title]

  if (isValidUrl(song_data['WEBSITE'])) {
    $("#website").html(`<a class='txt_red' href="${song_data['WEBSITE']}" target="_blank">Link</a>`);
  } else {
    $("#website").html("Unknown");
  }

  $("#artist").html(song_data['ARTIST']);
  $("#genre").html(song_data['GENRE']);
  $("#bpm").html(song_data['BPM']);
  $("#key").html(song_data['INITIALKEY']);
}


