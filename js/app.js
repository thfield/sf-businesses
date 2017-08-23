L.mapbox.accessToken = 'pk.eyJ1IjoidGhmaWVsZCIsImEiOiI4YTA3MmJkY2Q0OTg0YTkzMDAxOWQ3NzIyMzQ3NjIzOSJ9.LxGif2Jlko59H3l5yUvZug';
let map = L.mapbox.map('map', 'mapbox.streets')
    .setView([37.77, -122.42], 11);
let markers = L.layerGroup();

let summarySupervisors = d3.select('#summary-supervisors')
let summaryNeighborhoods = d3.select('#summary-neighborhoods')
// selector options
d3.csv('data/codes.csv',(err, data)=>{
  if (err) console.error(err);

  let codeSelector = d3.select('#lic-codes').selectAll('option')
    .data(data)
    .enter().append('option')
      .attr('value', (d)=>{return d.Code})
      .text(d=>{return `${d.Code}: ${d.Description}`})

  let supervisorSelect = d3.select('#supervisor-district').selectAll('option')
    .data([1,2,3,4,5,6,7,8,9,10,11])
    .enter().append('option')
      .attr('value', (d)=>{return d})
      .text(d=>{return `Supervisor District ${d}`})
});

function getData(wherestring, handler){
  let consumer = new soda.Consumer('data.sfgov.org')
  consumer.query()
    .withDataset('vbiu-2p9h')
    .limit(2000)
    .where(wherestring)
    .getRows()
      .on('success', handler)
      .on('error', function(error) {
        d3.select('#loading').classed('hidden', true)
        console.error(error.message);
      });
}

function codes() {
  let joiner = d3.select('input[name="joinerRadios"]:checked').property("value")
  d3.select('#loading').classed('hidden', false)
  d3.select('#info-result').text(``)
  let wherestring = whereString( getCodes('lic-codes'), joiner )
  getData(wherestring, handle)
}

function handle(rows){
  d3.select('#loading').classed('hidden', true)
  summarySupervisors.classed('hidden', false)
  summaryNeighborhoods.classed('hidden', false)
  markers.clearLayers();
  summarySupervisors.select('tbody').html('')
  summaryNeighborhoods.select('tbody').html('')
  if(rows.length === 0){
    return d3.select('#info-result').text('No businesses found with that license code.')
  }
  let supes = [0,0,0,0,0,0,0,0,0,0,0,0]
  let neighborhoods = {}
  rows.forEach(row=>{
    if (row.location) {
      let coords = [row.location.coordinates[1], row.location.coordinates[0]]
      let content = `<p><strong>${row.dba_name}</strong></p><p>${row.location_address}<br> ${row.location_city}, ${row.location_state} ${row.location_zip}</p>`;
      let marker = L.marker(coords).bindPopup(content);
      markers.addLayer(marker)
      // count business in each supervisor district
      if(row.supervisor_district){
          supes[+row.supervisor_district] += 1
      }
      //count businesses in each neighborhood
      if(row.neighborhoods_analysis_boundaries){
        neighborhoods[row.neighborhoods_analysis_boundaries] = neighborhoods[row.neighborhoods_analysis_boundaries] || 0
        neighborhoods[row.neighborhoods_analysis_boundaries] += 1
      }
    }
  })
  d3.select('#info-result').text(`${rows.length} businesses found`)
  supes.forEach((count,index)=>{
    if( index===0 ) return
    summarySupervisors.select('tbody').append('tr')
        .html(`<td>District ${index}</td><td>${count}</td>`)
  })
  for (let neighborhood in neighborhoods) {
    summaryNeighborhoods.select('tbody').append('tr')
        .html(`<td>${neighborhood}</td><td>${neighborhoods[neighborhood]}</td>`)
  }
  map.addLayer(markers)
}

/**
* Returns array of licence codes
* @param {string} selectId - id of select element on page
* @returns {array} Selected option values
*/
function getCodes(selectId){
  let options = document.getElementById(selectId).selectedOptions
  options = Array.from(options)
  return options.map(option=>{
    return option.value
  })
}

/**
* Returns search string for soda consumer where()
* @param {array} codes - array of codes
* @returns {string} string to feed into soda.Consumer.where()
*/
function whereString(codes, joiner='OR'){
  let wherestring = ''
  codes.forEach((code,i)=>{
    if( i>0 ){wherestring += ` ${joiner} `}
    wherestring += `lic like '%${code}%'`
  })
  // don't look for businesses that have shuttered the location or the business entirely
  wherestring += ' AND (location_end_date IS NULL AND dba_end_date IS NULL)'
  return wherestring
}