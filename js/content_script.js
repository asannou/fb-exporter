// Just draw the export friends link on the top next to the other links.
renderExportFriendsLink();

// Listen on extension requests.
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if(request.retrieveFriendsMap) {
    exportFacebookContacts();
  }
});

/**
 * Switches back to the worker tab where you can see all your friends being
 * processed.
 */
function switchToWorkerTab() {
  // The extension will handle the case if the worker tab already exists.
  chrome.extension.sendRequest({switchToWorkerTab: 1});
}

function exportFacebookContacts() {
  $.get('/dialog/oauth', {
    client_id: '350685531728',
    redirect_uri: 'fbconnect://success',
    response_type: 'token'
  }, function(data) {
    var url = data.match(/window\.location\.replace\(([^)]*)\)/);
    var params = eval(url[1]).match(/#access_token=([^&]*)/);
    var accessToken = decodeURIComponent(params[1]);
    chrome.extension.sendRequest({accessTokenReceived: accessToken});
  });
}

/**
 * Adds a export friends link to the top of the worker tab.
 */
function renderExportFriendsLink() {
  // Paint the Export friends to the top of the page.
  var exportFriendsLink = $('#pageNav #navAccount ul li:nth-child(2)').clone();
  $('a', exportFriendsLink)
      .attr('id', 'export-friends-link')
      .attr('href', 'javascript:void(0);')
      .text('Export Friends!')
      .click(switchToWorkerTab);
  $('#pageNav #navAccount ul li:nth-child(2)').after(exportFriendsLink);
}
