jQuery(document).ready(function($){
  var markers = [];
  var listeners = [];
  var jsonURL = '/api/users';
  var jsonCountryURL = '/api/countries'
  
  var spinnerHTML = '<div class="u-text-center"><div class="spinner spinner--inverted"><i class="spinner__dot spinner__dot--one"></i><i class="spinner__dot spinner__dot--two"></i><i class="spinner__dot spinner__dot--three"></i></div></div>';

  var overlayTemplateHTML = '<span class="%wrapper%">%text%</span>';
  
  var defaultOverlaySpinner = {position: 'overlay', text: spinnerHTML, tpl: overlayTemplateHTML};

  var columns = {
    loading: function(status) {
      this.left.loading(status);
      this.right.loading(status);
    },
    left: {
      loading: function(status) {
        if (status) {
          $('#left-column').isLoading(defaultOverlaySpinner);
        } else {
          $('#left-column').isLoading("hide");
        }
      }      
    },
    right: {
      loading: function(status) {
        if (status) {
          $('#right-column').isLoading(defaultOverlaySpinner);
        } else {
          $('#right-column').isLoading("hide");
        }        
      }
    }
  }

  columns.loading(true);
  
  // build the table HTML from the summary json returned from the api - we currently re-render the whole table
  function buildTableHTML(data) {
    var tbl_body = '';
    var previous_user_name = '';
    var total_accounts = 0;
    
    $.each(data.users, function() {
      var user_id = this.id;
      var user_name = this.fullname;
      var user_account_countries = this.accounts.length;
      var user_accounts = 0;
      
      if (user_account_countries === undefined || user_account_countries === 0) {
        tbl_body += '<tr id="table-row-'+user_id+'"><th>'+user_name+'</th><th colspan="2" class="text-right info">'+user_accounts+'</th></tr>';
      } else {
        $.each(this.accounts, function() {
          var tbl_row = '';
        
          if (user_name != previous_user_name) {
            tbl_row += '<th rowspan="'+(user_account_countries+1)+'">'+user_name+'</th>';
          }
          tbl_row += '<td>'+this.country+'</td>';
          tbl_row += '<td class="text-right">'+this.count+'</td>';
          tbl_body += '<tr id="table-row-'+user_id+'-'+this.country_code+'">'+tbl_row+'</tr>';
        
          user_accounts += this.count;
          previous_user_name = user_name;
        })
        tbl_body += '<tr class="info" id="table-row-'+user_id+'-total"><th colspan="2" class="text-right">'+user_accounts+'</th></tr>';
        total_accounts += user_accounts;
      }            
    })
    tbl_body += '<tr class="success"><th colspan="2">Total Accounts</th><th class="text-right">'+total_accounts+'</th></tr>';
    
    return tbl_body;
  }
  
  // render the table
  function renderTable(tableHTML) {
    $("#data-table table tbody").html(tableHTML);
  }
  
  // display an error if there is a problem getting the data or building the table
  function renderTableError(msg) {
    if (msg === undefined || msg.length === 0) msg = 'Error - Could not retrieve data';
    $("#data-table table tbody").html('<tr class="warning"><td colspan="3">'+msg+'</td></tr>');
  }
  
  // create a drop down of account managers, excluding the specified account manager
  function buildOptionsForSelectHTML(users, exclude_user) {
    var options = '<option selected disabled="disabled" value="none">Select new owner</option>'
    
    $.each(users, function(i, user) {
      if (exclude_user.id && user.id === exclude_user.id) return;
      options += '<option value="'+user.id+'">'+user.fullname+'</option>';
    });
    
    return options;
  }
  
  // create the html for the info window - pass in country object
  function buildInfoWindowHTML(country, users, currentUser) {
    return unescape(
      '<div id="info-'+currentUser.id+'-'+country.countryCode+'">'+
        '<p>'+
          '<strong>'+country.country+'</strong>'+
          '<br>'+
          country.count+' account(s) owned by <span>'+currentUser.fullname+'</span>'+
        '</p>'+
        '<p>'+
          '<strong>Reassign accounts to:</strong><br>'+
          '<form class="form-inline" role="form">'+
            '<div class="form-group">'+
              '<select name="user" style="min-width: 150px;" class="reassign-select form-control">'+
                buildOptionsForSelectHTML(users, currentUser)+
              '</select>'+
              '<input type="hidden" name="user_id" value="'+currentUser.id+'">'+
              '<input type="hidden" name="country_code" value="'+country.countryCode+'">'+
            '</div>'+
            '<button disabled type="submit" class="btn btn-primary u-margin-Lm reassign-button">Reassign</button>'+
          '</form>'+
        '</p>'+
      '</div>'
    )
  }
  
  // add the event listener for reassignment
  function bindReassignmentListener(info) {      
    if (info.get('changeListenerRef')) google.maps.event.removeListener(info.get('changeListenerRef'));
    var ref = google.maps.event.addListener(info, 'domready', function() {
      $('#'+this.get('id')).find('select').change(function() {
        $(this).closest('form').find('button').prop('disabled', $(this).prop('disabled'));
      })
    });
    info.set('changeListenerRef', ref);
    
    return true;
  }
  
  // add the event listener for form submission
  function bindSubmitListener(info) {
    if (info.get('submitListenerRef')) google.maps.event.removeListener(info.get('submitListenerRef'));
    var ref = google.maps.event.addListener(info, 'domready', function() {
      $('#'+this.get('id')).find('form').submit(function(e) {
        try {
          var updateData = {
            previousUserId: $(this).find('input[name="user_id"]').val(),
            newUserId: $(this).find('select').val(),
            newUserName: $(this).find('select option:selected').text(),
            countryCode: $(this).find('input[name="country_code"]').val()
          }

          submitAndUpdateInfoAndTable(updateData);
        } finally {
          e.preventDefault();
        }
      })
    });
    info.set('submitListenerRef', ref);    
    
    return true;
  }
  
  // add marker for a country - pass in country object and current account manager id
  function addMarker(country, currentUser, users) {
    var marker = new google.maps.Marker({
                   position: new google.maps.LatLng(country.latitude, country.longitude),
                   map: map,
                   visible: true,
                   icon: marker_url,
                   id: 'marker-'+country.countryCode
                 });
    
    var info = new google.maps.InfoWindow({
      content: buildInfoWindowHTML(country, users, currentUser),
      id: 'info-'+currentUser.id+'-'+country.countryCode
    });
    
    markers.push({marker: marker, info: info});

    google.maps.event.addListener(marker, 'click', function() {
      $.each(markers, function() {
        this.info.close();
      });
      info.open(map, marker);
    });    
        
    bindReassignmentListener(info);
    bindSubmitListener(info);
    
    return true;
  }
  
  // update a marker with new data  
  function updateMarker(country, currentUser, users, updateData) {
    $.each(markers, function(i, marker) {
      if (marker.info.get('id') == 'info-'+updateData.previousUserId+'-'+updateData.countryCode) {
        if (marker.info.get('changeListenerRef')) google.maps.event.removeListener(marker.info.get('changeListenerRef'));
        if (marker.info.get('submitListenerRef')) google.maps.event.removeListener(marker.info.get('submitListenerRef'));
        
        marker.info.set('id', 'info-'+updateData.newUserId+'-'+updateData.countryCode);
        marker.info.setContent(buildInfoWindowHTML(country, users, currentUser));
        
        bindReassignmentListener(marker.info);
        bindSubmitListener(marker.info);
      }
    })
  }
  
  function renderMarkersFromJson(data, updateData) {
    var users = data.users;
    var update = (!(updateData === undefined));
    if (users === undefined) return;
    
    var previousUser;
    
    $.each(users, function(i, user) { 
      $.each(this.accounts, function(i, country) {
        if (country.country == "") return;   
        country.countryCode = country.country_code;
        
        if (update) {
          if ((user.id == updateData.newUserId) && (country.countryCode == updateData.countryCode)) {
            updateMarker(country, user, users, updateData);
          } else {
            $('#info-'+updateData.previousUserId+'-'+updateData.countryCode).html('<table><tr class="warning"><td colspan="3">Error - Could not display updated data - try reloading the page</td></tr></table>');
          }
        } else {
          addMarker(country, user, users);
        }        
      });
    });

    if (!update) {
      google.maps.event.addListener(map, "click", function(event) {
        $.each(markers, function() {
          this.info.close();
        });          
      });

      map.fitBounds(markers.reduce(function(bounds, marker) {
          return bounds.extend(marker.marker.getPosition());
      }, new google.maps.LatLngBounds()));        
    }
    
    return true;
  }
  
  function submitAndUpdateInfoAndTable(updateData) {
    var infoDiv = $('#info-'+updateData.previousUserId+'-'+updateData.countryCode);
    var infoParentDiv = $('#info-'+updateData.previousUserId+'-'+updateData.countryCode).parents().eq(3);
    
    infoParentDiv.isLoading({
      text:       "Loading",
      position:   "overlay",
      text: spinnerHTML,
      tpl: '<div class="u-padding-Al">'+overlayTemplateHTML+'</div>'
    });
    
    columns.left.loading(true);
    
    var data = { country_code: updateData.countryCode };
    
    $.ajax({type: 'POST', url: '/api/users/'+updateData.newUserId, data: data})
    .done(function() {
      fetchAndProcessJson(updateData);
    })
    .fail(function() {
      renderTableError("Error submitting data");
      infoDiv.html('<table><tr class="warning"><td colspan="3">Error - Could not update data</td></tr></table>');
    })
    .always(function() {
      infoParentDiv.isLoading("hide");
      columns.left.loading(false);
    });
    
    return true;
  }
  
  function fetchAndProcessJson(updateData) {
    $.getJSON(jsonURL)
    .done(function(data) {
      try {
        renderTable(buildTableHTML(data));
      } catch (e) {
        renderTableError("Error rendering data");
      }
      
      try {
        renderMarkersFromJson(data, updateData);        
      } catch (e) {
        console.log(e);
      }
      
    })
    .fail(function() {
      renderTableError();
    })
    .always(function() {
      columns.left.loading(false);
      columns.right.loading(false);
    });
  }
  
  google.maps.event.addDomListener(window, 'load', function() { fetchAndProcessJson() });
});