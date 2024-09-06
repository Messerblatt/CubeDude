// import { parseFile } from 'music-metadata';
import metadata from "/data/metadata.js";
window.trigger = ($(window).width() < 968) ? "touchstart" : "click";
window.rotateIndex = 0;0

window.song = new Pz.Sound()
// var folder;

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
  // register_folders();
  init_playPause();
//  populate_folders();
  fx_load();
  fx_keybindings();
  setup_viz();
  // setup_mobile();
})

function populate_HTML() {
  //init_loading_screen();
  populate_info_menu();
  // populate_back_home();

  $.getJSON("/scripts/folders.json", function(data) {
    // folders = data
    var items = []
    
    $.each(data, function(key, val) {
      var song_name = key.split(".")[0];
      var html = ""
      var depth = objectDepth(val)  
      if (depth == 1) {
        html += `<div class="file song" target="/audio/${key}" duration="${val['duration']}">${song_name}</div>`;
      } else {
        html += `<div class="folder">${song_name}`;
        html += `<div class="hidden subfolder">`
        $.each(val, function(key_in, val_in) {
          song_name = key_in.split(".")[0];
          html += `<div class="file song" target="${val_in['path']}" duration="${val_in['duration']}">${song_name}</div>`
        })
        html += "</div>"
      }
    
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

  $(document).on(window.trigger, ".info", function() {
    info_menu.toggle();
  }) 
}

function populate_back_home() {
  $(".back_home_container").load("back_home.html")
    .on(window.trigger, function() {
      window.location.href = "https://www.messerblatt.com/"
    })
}

function register_songs() {
  $(document).on("click", ".song", function(event) {
    event.stopPropagation();
    // select_song($(this));
    window.song.stop();
    var songname = $(this).attr("target");
    window.song = new Pz.Sound(songname, function() {
      window.song.attack = 0;
      window.song.loop = true;
      window.song.play();
      window.song.connect(analyzer);
      $(".playPause").siblings(".underline").addClass("border_bottom_red")
      extract_metadata(songname)
    })

    $(".active_icon").removeClass("active_icon")
    $(this).siblings(".active_icon").addClass("active_icon")
    $(".playPause").html("Pause");
    $(".song").removeClass("active_song");
    $(this).addClass("active_song");

    var title = $("#song").attr(songname);
    $("#title").html(songname.split("/")[1]);
    $('.back_home_container').get(0).scrollIntoView();
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
}

function init_playPause() {
  // Register PlayPause on Spacebar
  $(window).keydown(function(e) {
    if (e.which == KEY_SPACE) {
      playPause();
    }
  })

  $(document).on(window.trigger, ".playPause", function() {
    playPause();
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
  var underline = $(".playPause").siblings(".underline")
  if (window.song.paused) {
    window.song.play();
    underline.addClass("border_bottom_red")
    $(".playPause").html("Pause");
  } else {
    underline.removeClass("border_bottom_red")
    window.song.pause();
    $(".playPause").html("Play");
  }
}

function extract_metadata(songname) {
  var song_data = metadata[songname]
  $("#duration").html(song_data['duration'] + " Sec")
  $("#artist").html(song_data['artist']);
  $("#genre").html(song_data['genre']);
  $("#genre_bottom").html(song_data['genre']);
  $("#bpm").html(song_data['BPM']);
  $("#sample_rate").html(song_data['sample_rate']);
  
}