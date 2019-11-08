// ==UserScript==
// @name BAJ Conconrdia Enhancements
// @description Updates colours to players' preferred colours; adds auto-refresh and notifications
// @version  1
// @grant unsafeWindow
// @grant GM_notification
// @include http://www.boiteajeux.net/jeux/ccd/partie.php?id=*
// @include http://boiteajeux.net/jeux/ccd/partie.php?id=*
// @require http://code.jquery.com/jquery-1.7.2.min.js
// @author David Weinberg and Dr Julia Peetz
// 😖😖😖😖😖😖😖this is a stupid exercise 😬😬😬😬


// ==/UserScript==
/* KNOWN LIMITATIONS:
 - Architecting and other actions that change the board state will revert to original colours in the middle of the action. Some of these have been hooked into, but there are multiple and it is brittle, so looking for a better solution.
 - At the beginning of a game with Forum Tiles, the notifications may be broken and refresh too much.
 - Notifications will not work on Firefox/Greasemonkey. Needs HTTPS to make this work.
*/

var RED = "1";
var BLACK = "2";
var GREEN = "3";
var YELLOW = "4";
var BLUE = "0";

/**** CONFIGURATION OPTIONS ****/
// See colours above
var preferredColours = {
  THIEFOFSANITY: YELLOW,
  STEPHENSROCKET: RED
};

// miliseconds between refreshes
var refreshInterval = 30000;

// show desktop notifications
var showNotifications = true;

/*******************************/

var $j = $;
var lastPlayer = null;
var loggedInPlayer;
var gameName;


//index on page -> baj colour code (i.e. 0-4) strings
var originalColours;
//index on page -> upper case player name
var players;
//index->colour
var computedColourSwaps;

function changeColour(fromIndex, toColour) {
  var fromColour = originalColours[fromIndex];


  $j("#villas_" + fromColour).css("background-image", "url(img/buildJ" + toColour + ".png");
  setImageSrc('colonJ', '.png');
  setImageSrc('shipJ', '.png');
  setImageSrc('buildJ', '.png');
  setImageSrc('plateauJ', '.jpg');

  $j("div").each(function (index, element) {
    setBackgroundImage(element, 'colonJ', '.png');
    setBackgroundImage(element, 'shipJ', '.png');
    setBackgroundImage(element, 'plateauJ', '.jpg');
  });

  function setImageSrc(suffix, type) {
    $j("img[src$='img/" + suffix + fromColour + type + "']").each(function (index, element) {
      var originalSource = $j(element).attr("originalSrc");
      if (originalSource === undefined || originalSource === $j(element).attr("src")) {
        $j(element).attr("originalSrc", $j(element).attr("src"));
        $j(element).attr("src", "img/" + suffix + toColour + type)
      }
    });


  }

  function setBackgroundImage(elem, suffix, type) {
    if ($j(elem).css('background-image').includes('img/' + suffix + fromColour + type + '")') &&
      ($j(elem).attr('originalBackGroundImage') === undefined || $j(elem).css('background-image') === $j(elem).attr('originalBackGroundImage'))
    ) {
      $j(elem).attr('originalBackGroundImage', $j(elem).css('background-image'));
      $j(elem).css('background-image', 'url("http://www.boiteajeux.net/jeux/ccd/img/' + suffix + toColour + type + '")');
    }
  }
}

function enhancePage() {
  console.log("Enhancing Page");

  updateColours();
  addNotifications();

  console.log("Done with enhancements");
}

function updateColours() {
  computedColourSwaps.forEach(function (item, index) {
    changeColour(index, item);
  });
}

function addNotifications() {
  $j('span[id^=lienjoueur_]').each(function (index, element) {
    var colour = $j(element).css("color");
    var isTurn = colour === "rgb(247, 188, 20)";
    var player = $j(element).text().toUpperCase();
    if (isTurn) {
      if (showNotifications && player !== lastPlayer && lastPlayer !== null) {
        GM_notificationShim(
          {
            title: 'Concordia',
            text: "It is " + player + "'s turn!\n" + gameName,
            image: 'http://www.boiteajeux.net/jeux/ccd/img/city4.png',
            timeout: 60000,
            onclick: function () {
              window.focus();
            }
          });
      }
      lastPlayer = player;
    }
  });
}

function main() {
  var oldRefreshDisplay = window.refreshDisplay;
  window.refreshDisplay = function () {
    oldRefreshDisplay();
    var event = new CustomEvent("refreshDisplay");
    document.dispatchEvent(event);
  };

  var oldValiderArchitecteDeplacements = window.validerArchitecteDeplacements;
  window.validerArchitecteDeplacements = function () {
    oldValiderArchitecteDeplacements();
    var event = new CustomEvent("validerArchitecteDeplacements");
    document.dispatchEvent(event);
  };

  var oldCiteClick = window.citeClick;
  window.citeClick = function () {
    oldCiteClick();
    var event = new CustomEvent("citeClick");
    document.dispatchEvent(event);
  };
}


function GM_notificationShim(notificationDetails) {
  if (typeof GM_notification === "function") {
    GM_notification(notificationDetails);
  } else {
    //https://stackoverflow.com/questions/36779883/userscript-notifications-work-on-chrome-but-not-firefox
    //secure context only, so can't do in FF
  }
}


function calculateColourSwaps() {
  computedColourSwaps = Array(originalColours.length);

  function colourToSwapBack(colour) {
    console.log("colour", colour);

    var originalColour = originalColours[computedColourSwaps.indexOf(colour)];
    console.log("originalColour", originalColour);
    if (computedColourSwaps.indexOf(originalColour) >= 0) {
      return colourToSwapBack(originalColour);
    } else {
      return originalColour;
    }
  }


  Object.keys(preferredColours).forEach(function (key) {
    var playerIndex = players.indexOf(key);
    if (playerIndex >= 0 && originalColours[playerIndex] !== preferredColours[key]) {
      computedColourSwaps[playerIndex] = preferredColours[key];
    }
  });

  originalColours.forEach(function (item, index) {
    if (computedColourSwaps[index] === undefined && computedColourSwaps.indexOf(item) >= 0) {
      computedColourSwaps[index] = colourToSwapBack(item);
    }
  });
}

$j(document).ready(function () {
  gameName = $j('#globalDiv2 > table > tbody > tr:nth-child(3) > td > span').text();
  originalColours = $j.map($j('span[id^=lienjoueur_]'), function (x) {
    return x.id.slice(-1)
  });
  players = $j.map($j('span[id^=lienjoueur_]'), function (e) {
    return $j(e).text().toUpperCase()
  });
  loggedInPlayer = players[0];
  calculateColourSwaps();

  enhancePage();

  document.addEventListener("refreshDisplay", function () {
    enhancePage();
  });

  document.addEventListener("validerArchitecteDeplacements", function () {
    enhancePage();
  });

  document.addEventListener("citeClick", function () {
    enhancePage();
  });


  $j('.clRoadArea').on('click', function () {
    enhancePage();
  });


  setInterval(function () {
    if (lastPlayer !== loggedInPlayer) {
      unsafeWindow.actualiserPage();
    }
  }, refreshInterval);

  var script = document.createElement('script');
  script.appendChild(document.createTextNode('(' + main + ')();'));
  (document.body || document.head || document.documentElement).appendChild(script);
});

