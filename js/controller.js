var bkg = chrome.extension.getBackgroundPage();
var friends_remaining_count = 0;
var logDOM = null;

/**
 * Send a request to the Facebook page and tell it to get the friends list. 
 * Keep the map stored there since we can guarantee to get it afterwards.
 * Asynchronous communication will not guarantee us to get it now.
 */
function fetchFriendList() {
  chrome.tabs.sendRequest(bkg.facebook_id, {retrieveFriendsMap: 1});
}

/**
 * Render all my friends below. Display their profile pic and a link to their
 * profile page. As well, when hovered, show their name.
 * @param {Object<id, friend>} friendsMap All the users friends in a map.
 * @param {number} count The number of friends.
 */
function renderFriendList(friendsMap, count) {
  logDOM.val('');
  log('Rendering friends list ...');
  $('#step1').hide();
  $('#friendlist').show();

  // Reset counter of processed  friends. This is just used to show how many
  // friends are showing.
  total_processed_friends = 0;
  
  $.each(friendsMap, function(key, value) {
    total_processed_friends++;
    $('#remaining-friend-count').text(
      'Processsing ' + total_processed_friends + ' / ' + count + ' friends!'
    );
    
    // Create the list friend item, but first decide if its cached or not.
    var li = document.createElement('li');
    $(li).addClass('friend-row')
         .attr('id', key)
         .html('<img src="' + value.photo + '" title="' + value.name + '"/>' +
               '<span>READY</span>')
         .click(
           function() {
              chrome.tabs.create({url: value.fb });
           }
         );
    $('#friendlist').append(li);
    gotInfoForFriend(value);
    
    // The last friend finished processing.
    if (total_processed_friends == count) {
      setupExportScreen();
    }
  });
  
  log('Found ' + count + ' friends!');
  
  // Check if we have any friends.
  if (count == 0) {
    var li = document.createElement('li');
    $(li).addClass('friend-row')
         .text('Looks like you have no friends? Impossible! You probably need ' +
               'to pick a different network (see above).');
  }
}

/**
 * Friend information recieved that needs to be processed/
 * @param {object} friend An object that represents a single friend.
 */
function gotInfoForFriend(friend) {
  var success = true;
  
  // If the email is empty
  if (friend.email.length == 1 && friend.email[0] == '') {
    log('Finished processing [' + friend.name + '] FAIL, no email.' );
    success = false;
  } else {
    log('Finished processing [' + friend.name + ']');
  }
  var item = $('#' + friend.id);
  item.find('span').text(success ? 'PROCESSED' : 'FAILED');
  item.removeClass('starting');
  item.addClass(success ? 'processed' : 'failed');
  
  var checkbox = document.createElement('input');
  $(checkbox).attr('type', 'checkbox')
             .attr('checked', '1')
             .attr('id', 'checkbox' + friend.id)
             .addClass('checkbox')
             .click(
               function(event) {
                  event.stopPropagation();
               }
             );
  item.prepend($(checkbox));

  // Attach the friend object to the list item, for later retrieval.
  item.data(friend);

  // Create a detailed view, for now disable this until we make a better UI,
  // perhaps a hover (card) that shows the persons extracted information.
  var detail_ul = document.createElement('ul');
  $(detail_ul).addClass('friend-detail');
  // item.append($(detail_ul));

  $.each(friend, function(key, value) {
    if (key == 'name') {
      // No need to show name, since it's part of the parent li.
      return;
    }

    if (value) {
      if ($.isArray(value)) {
        $.each(value, function(k, v) {
          var detail_li = document.createElement('li');
          $(detail_li).text(key + ': ' + v);
          $(detail_ul).append($(detail_li));
        });
      } else {
        var detail_li = document.createElement('li');
        $(detail_li).text(key + ': ' + value);
        $(detail_ul).append($(detail_li));
      }
    }
  });

  return success;
}

function setupExportScreen() {
  log('Export screen is now visible.');
  
  // All of the friend info for the visible subset of friends has been
  // received.  Show specific export buttons now.
  $('#step3').hide();
  $('#step4').show();

  // Remove the ajax loading gif.
  $('#export-methods img').remove();

  //chrome.tabs.sendRequest(bkg.facebook_id,
  //                        {hideTopBanner: 1});

  $('#remaining-friend-count').hide();
}
/**
 * Setup a list of the visible, checked friends that we want to send to 
 * export.
 */
function setupAndStartExport(request) {
  // Only get the checked friends, disregard all others.
  var requested_friends = $('li.friend-row').map( function(idx, e) {
    // First, see if this element's checkbox is checked or not.
    if ($('.checkbox', e).attr('checked') != '1') {
      return null;
    }
    return $(e).data();
  }).get();

  // Reset the remaining friends counter, to take into effect the checked friends.
  friends_remaining_count = requested_friends.length;
  if (friends_remaining_count != 0) {
    $('#remaining-friend-count').show().text(
        friends_remaining_count + ' remaining');
  } else {
    // Remove the ajax loading gif, if there are no friends_remaining_count.
    alert('You don\'t have any friends selected!');
    $('#export-methods img').remove();
  }

  // Send a request to the background page, so that we can start the export
  // module process.
  request.requestedFriends = requested_friends;
  chrome.extension.sendRequest(request);
}

/**
 * Format number to 2 digits.
 */
function twoDigitsFormat(num) {
  return (num < 10) ? '0'+ num : num;
}
/**
 * Appends a |message| to the logger panel.
 */
function log(message) {
  var d = new Date();
  var time = twoDigitsFormat(d.getHours()) + ':' +
      twoDigitsFormat(d.getMinutes()) + ':' + twoDigitsFormat(d.getSeconds());
  logDOM.val(logDOM.val() + '\n' + time + ' - ' + message);
  logDOM.attr({ scrollTop: logDOM.attr("scrollHeight") });
}

$(document).ready(function() {
  // Log Manager.
  logDOM = $('#log');
  logDOM.attr('disabled', 'disabled');
  logDOM.hide();
  $('#btnLog').click(function () {
    if (logDOM.is(':visible')) {
      $(this).text('View log');
      logDOM.slideUp();
    } else {
      $(this).text('Hide log');
     logDOM.slideDown();
    }
  });
  
  // Activate the Terms of Service. They must click it to continue.
  $('#tos').click( function() {
    if ($('#tos').attr('checked')) {
      $('.tos-guarded').attr('disabled', false);
    } else {
      $('.tos-guarded').attr('disabled', true);
    }
  });

  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.log) {
      log(request.log);
    }
    if (request.gotInfoForFriend) {
      var response = gotInfoForFriend(request.gotInfoForFriend);
      sendResponse({OK: response});
    }
    else if (request.csvExportFinished) {
      var csv_popup = $("<div/>");
      $(csv_popup).attr("id", "csv-popup");

      var textarea = $("<textarea/>");
      $(textarea).text(request.csvExportFinished);

      var a = $("<a/>").attr("href", "javascript:void(0);")
                       .text("close")
                       .click(function() {
        $("#csv-popup").remove();
      });

      var info = $("<span/>").text("Here is your CSV.  Copy and save it somewhere safe.");

      $(csv_popup).append(info);
      $(csv_popup).append(a);
      $(csv_popup).append(textarea);

      $(document.body).append(csv_popup);
    }
    else if (request.finishedProcessingFriend) {
      // The export finished for this contact.  Update the list, based
      // on the success status, or show the error message.
      log('Export ' + (request.success ? 'passed' : 'failed') + ' [' +
          request.friend.name + '] ' + request.message);
      console.log(request.friend);
      var item = $('#' + request.friend.id);
      var status_text = request.success ? 'success' : 'failed';
      item.removeClass('starting');
      item.removeClass('processed');
      item.removeClass('cached');
      item.find('span').text(status_text.toUpperCase());
      item.addClass(status_text);
      
      friends_remaining_count -= 1;
      $('#remaining-friend-count').show().text(
          friends_remaining_count + ' remaining');

      if (friends_remaining_count == 0) {
        // Remove the ajax loading gif.
        $('#export-methods img').remove();

        //chrome.tabs.sendRequest(bkg.facebook_id,
        //                        {hideTopBanner: 1});
      }
    }
    else if (request.facebookError) {
      log('ERROR! Facebook error, they converted emails to images. Try again in 24 hours.');
      $('#note').show();
      setupExportScreen();
    }
    else if (request.renderFriendsList) {
      renderFriendList(request.renderFriendsList, request.count);
    }
  });


  $('.continue1').click(function() {
    $('.continue1').attr('disabled', true);
    $('#tos').attr('disabled', true);
    fetchFriendList();
  });
  
  // Gmail exportation:
  $('#export-to-gmail').click(function() {
    $('#export-to-gmail').parent().prepend(
          $('#ajax-loader').clone().attr('id', '').show());

    setupAndStartExport({doGmailExport: 1});
  });

  // CSV exportation:
  $('#export-to-csv').click(function() {
    $('#export-to-csv').parent().prepend(
          $('#ajax-loader').clone().attr('id', '').show());

    setupAndStartExport({doCSVExport: 1});
  });
});
