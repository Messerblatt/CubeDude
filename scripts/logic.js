import AudioMotionAnalyzer from 'https://cdn.skypack.dev/audiomotion-analyzer?min';
window.trigger = ($(window).width() < 968) ? "touchstart" : "click";
let music_metadata;
$.getJSON("../data/music_metadata.json", function(data) {
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
  $.getJSON("../data/folders.json", function(data) {
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

  $(document).on(window.trigger, "#bt_about", function() {
    info_menu.toggle();
  })
}

function create_waveform(path) {
  window.wavesurfer = WaveSurfer.create({
    container: '#wave_container',
    waveColor: 'white',
    progressColor: 'red',
    cursor: false,
    url: path,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    normalize: true,
    cursorWidth: 1,
  })
  
}

function register_songs() {
  $(document).on("click", ".song", function(event) {
    event.stopPropagation();
    var songname = $(this).attr("target");
    // console.log("Song selected: ", songname)
    var path_split = songname.split("/")
    var path = "audio/" 
      + path_split[path_split.length - 2] // Get folder
      + "/"
      + path_split[path_split.length - 1] // Get song inside folder

     
    // create_waveform(path);
    extract_metadata(path_split[path_split.length - 1])
    window.song.stop();

    window.song = new Pz.Sound(path, function() {
      window.song.attack = 0;
      window.song.loop = true;
      window.song.play();
      window.song.connect(analyzer);
      window.song.volume = $("#volume").val() / 100;
      // $(".playPause").siblings(".underline").addClass("switch_on")  
    })

    $(".active_icon").removeClass("active_icon")
    $(this).siblings(".active_icon").addClass("active_icon")
    $(".song").removeClass("active_song");
    $(this).addClass("active_song");
    var substrings = songname.split("/")
    $("#play_underline").addClass("switch_on")
    $("#playPause").html("Pause")
    $("#song_title").html(substrings[substrings.length - 1].split(".")[0]);
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
      case KEY_d:
        $("#distortion").trigger(window.trigger);
        break;
      case KEY_f:
        $("#flanger").trigger(window.trigger);
        break;
      case KEY_e:
        $("#delay").trigger(window.trigger);
        break;
      case KEY_r:
        $("#reverb").trigger(window.trigger);
        break;
      case KEY_l:
        $("#lowPassFilter").trigger(window.trigger);
        break;
      case KEY_t:
        $("#tremolo").trigger(window.trigger);
        break;
    }
  });
}

$(".slider").on("input", function() {
  var val = Number($(this).val() / 100);
  var fx = $(this).siblings(".fx_button").attr("id")
  $(this).siblings("label").html(Math.ceil(val * 100 )+ "%")
  if (window.effects[fx]["set"]) {
    console.log("Adjust Parameter")
  } else {
    console.log(fx, " not activated")
  }

  // Im Grunde brauchen wir ein Mapping von window.effects[fx] nach window.song.effects
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
    //gradient: "steelblue",
    bgAlpha: 0,
  });

  window.audioMotion.registerGradient("red", {
    colorStops: [ "red" ]
  })

  window.audioMotion.gradient = "red";
}
 
function setup_mobile() {
  $.mobile.defaultPageTransition = 'none'
  $.mobile.defaultDialogTransition = 'none'
  $.mobile.buttonMarkup.hoverDelay = 0
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
  // console.log(song_data['WEBSITE'])
  if (isValidUrl(song_data['WEBSITE'])) {
    $("#WEBSITE").html(`<a href="${song_data['WEBSITE']}" target="_blank">Link</a>`);
  } else {
    $("#WEBSITE").html("Unknown");
  }

  $("#ARTIST").html(song_data['ARTIST'])
  $("#ALBUM").html(song_data['ALBUM'])
  // $("#TITLE").html(song_data['TITLE'])
  $("#TRACK").html(song_data['TRACK'])
  $("#YEAR").html(song_data['YEAR'])
  $("#GENRE").html(song_data['GENRE'])
  $("#COMMENT").html(song_data['COMMENT'])
  $("#COMPOSER").html(song_data['COMPOSER'])
  $("#INITIALKEY").html(song_data['INITIALKEY'])
  $("#PUBLISHER").html(song_data['PUBLISHER'])
  $("#DISC").html(song_data['DISC'])
  $("#DISCTOTAL").html(song_data['DISCTOTAL'])
  $("#TRACKTOTAL").html(song_data['TRACKTOTAL'])
  $("#ALBUMARTIST").html(song_data['ALBUMARTIST'])
  $("#BPM").html(song_data['BPM'])
  $("#COMPILATION").html(song_data['COMPILATION'])
  $("#COPYRIGHT").html(song_data['COPYRIGHT'])
  $("#ENCODEDBY").html(song_data['ENCODEDBY'])
  $("#ENCODERSETTINGS").html(song_data['ENCODERSETTINGS'])
  $("#ISRC").html(song_data['ISRC'])
  $("#REPLAYGAIN_TRACK_GAIN").html(song_data['REPLAYGAIN_TRACK_GAIN'])
  $("#REPLAYGAIN_ALBUM_GAIN").html(song_data['REPLAYGAIN_ALBUM_GAIN'])
  $("#REPLAYGAIN_TRACK_PEAK").html(song_data['REPLAYGAIN_TRACK_PEAK'])
  $("#REPLAYGAIN_ALBUM_PEAK").html(song_data['REPLAYGAIN_ALBUM_PEAK'])
  $("#LYRICS" ).html(song_data['LYRICS'])
  $("#COVERART" ).html(song_data['COVERART'])
  $("#CONDUCTOR" ).html(song_data['CONDUCTOR'])
  $("#SUBTITLE" ).html(song_data['SUBTITLE'])
  $("#PRODUCER" ).html(song_data['PRODUCER'])
  $("#LANGUAGE" ).html(song_data['LANGUAGE'])
  $("#MEDIA" ).html(song_data['MEDIA'])
  $("#STYLE" ).html(song_data['STYLE'])
  $("#REMIXEDBY" ).html(song_data['REMIXEDBY'])
  $("#CATALOGNUMBER" ).html(song_data['CATALOGNUMBER'])
  $("#MOOD" ).html(song_data['MOOD'])
  $("#ENCODEDDATE").html(song_data['ENCODEDDATE'])

}