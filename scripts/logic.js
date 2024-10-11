import AudioMotionAnalyzer from './audiomotion-analyzer.min.js';
import keyCodes from './keycodes.js';

window.trigger = ($(window).width() < 968) ? "touchstart" : "click";
let music_metadata;
$.getJSON("data/music_metadata.json", function(data) {
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

// Get the depth of an object
const objectDepth = (o) =>
  Object (o) === o ? 1 + Math.max(-1, ... Object.values(o).map(objectDepth)) : 0

$(document).ready(function() {
  populate_HTML();
  register_songs();
  init_playPause();
  fx_load();
  fx_keybindings();
  setup_viz();
  populate_info_menu();
})

function populate_HTML() {
  $.getJSON("data/folders.json", function(data) {
    $.each(data, function(folder, song) {
      var html = `
      <div class="taskbar_small">
        <img class="folder_icon" src="HUD/folder_icon_white.svg">
        <div>${folder}</div>
      </div>
        <div class="folder mg_bottom10 mg_top10">
        `
        $.each(song, function(title, data) {
          html += `<div class="song" target="audio/${folder}/${title}">${title}</div>`;
        })

        html += `</div>`
        $(".songlist").append(html)
    })
  }) 
}

function populate_info_menu() {
  var info_menu = $(".info_menu_container")
  info_menu.load("info.html")
  $(window).keydown(function(e) {
    switch(e.which) {
      case keyCodes['KeyI']:
        info_menu.toggle();
        break;
      case keyCodes['Escape']:
        info_menu.css("display", "none")
    }
  })

  $(document).on(window.trigger, "#bt_about", function() {
    info_menu.toggle();
  })
}


function load_song(path) {
  window.song.stop();
  window.song = new Pz.Sound(path, function() {
    window.song.attack = 0;
    window.song.loop = true;
    window.song.play();
    window.song.connect(analyzer);
    window.song.volume = $("#volume").val() / 100;
    // $(".playPause").siblings(".underline").addClass("switch_on")
  })
}

function update_ui(element) {
  $(".song").removeClass("active_song");
  element.addClass("active_song");
  $("#play_underline").addClass("switch_on")
  $("#playPause").html("Pause")
  $("#song_title").html(song_name);
}

function register_songs() {
  $(document).on("click", ".song", function(event) {
    event.stopPropagation();
    var song_path = $(this).attr("target");
    var song_name = $(this).html()
    load_song(song_path)
    extract_metadata(song_name)
    update_ui($(this))
  })
}

$("#volume").on("input", function() {
  var volume = $(this).val()
  window.song.volume = volume / 100;
})


$(document).on("mouseover mouseleave", ".song", function(e) {
  if (e.type == "mouseover") {
    $(this).addClass("highlighted")
  } else {
    $(this).removeClass("highlighted")
  }
})


function init_playPause() {
  $(window).keydown(function(e) {
    if (e.which == keyCodes["Space"]) {
      playPause();
    }
  })
  $(document).on(window.trigger, "#playPause", function() {
    playPause()
  })
}

function fx_load() {
  $(document).on(
    window.trigger,
    "#flanger, #distortion, #reverb, #delay, #tremolo, #lowPassFilter",
    function() {
      var fx = $(this).attr("id");
      if (!window.effects[fx]["set"]) {
        window.song.addEffect(window.effects[fx]["ref"])
        window.effects[fx]["set"] = true
        window.effects.active.push(fx)
        $(this).siblings(".underline").addClass("switch_on")
      } else {
        window.song.removeEffect(window.effects[fx]["ref"])
        window.effects[fx]["set"] = false
        window.effects.active.remo
        $(this).siblings(".underline").removeClass("switch_on")
      }
      console.log("Active effects; ", window.effects.active)
  })
}

function fx_keybindings() {
  $(window).keydown(function(e) {
    switch(e.which) {
      case keyCodes['KeyD']:
        $("#distortion").trigger(window.trigger);
        break;
      case keyCodes['KeyF']:
        $("#flanger").trigger(window.trigger);
        break;
      case keyCodes["KeyD"]:
        $("#delay").trigger(window.trigger);
        break;
      case keyCodes["KeyR"]:
        $("#reverb").trigger(window.trigger);
        break;
      case keyCodes["KeyL"]:
        $("#lowPassFilter").trigger(window.trigger);
        break;
      case keyCodes["KeyT"]:
        $("#tremolo").trigger(window.trigger);
        break;
    }
  });
}

$(".slider").on("input", function() {
  var val = Number($(this).val() / 100);
  var fx = $(this).siblings(".fx_button").attr("id")
  $(this).siblings("label").html(Math.ceil(val * 100 )+ "%")

  switch (fx) {
    case "flanger":
      window.song.effects[0].depth = val;
      window.song.effects[0].feedback = val;
      break
    case "distortion":
      window.song.effects[0].gain = val;
      break;
    case "reverb":
      window.song.effects[0].mix = val;
      window.song.effects[0].decay = val / 10;
      break;
    case "delay":
      window.song.effects[0].time = val;
      break;
    case "tremolo":
      window.song.effects[0].speed = val * 10;
      window.song.effects[0].depth = val;
      break;
    case "lowPassFilter":
      window.song.effects[0].frequency = val * 400;
  }
})

function setup_viz() {
  window.analyzer = Pz.context.createAnalyser();
  window.audioMotion = new AudioMotionAnalyzer(
  document.getElementById('viz_container'), {
    source: window.analyzer,
    overlay: true,
    bgAlpha: 0,
  });

  window.audioMotion.registerGradient("red", {
    colorStops: [ "red" ]
  })

  window.audioMotion.gradient = "red";
}

function playPause() {  
  if (window.song.paused) {
    $("#play_underline").addClass("switch_on")
    // window.wavesurfer.play()
    $("#playPause").siblings(".underline").addClass("switch_on")
    $("#playPause").html("Pause")
    window.song.play();
    window.song.paused = false;
    $(".playPause").attr("src", "HUD/icons/play.png");
  } else {
     $("#play_underline").removeClass("switch_on")
    window.song.pause();
    // window.wavesurfer.pause()
    $("#playPause").siblings(".underline").removeClass("switch_on")
    $("#playPause").html("Play")
  }
}

function extract_metadata(songname) {
  var song_data = music_metadata[songname]
  console.log(song_data)
  for (const [key, value] of Object.entries(song_data)) {
    $("#" + key).html(value)
  } 
  if (isValidUrl(song_data['WEBSITE'])) {
    $("#WEBSITE").html(`<a href="${song_data['WEBSITE']}" target="_blank">Link</a>`);
  } else {
    $("#WEBSITE").html("Unknown");
  }
}