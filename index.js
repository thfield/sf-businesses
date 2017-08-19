// node> .load index.js

const soda = require('soda-js')
const fs = require('fs')
const d3 = require('d3')
const turf = require('turf')
// let supervisorGeo = loadFromLocal('data/CurrentSupervisorDistricts.geojson')

// var whereString = `lic like '%D13%' OR lic like '%D14%'`
var whereString = `lic like '%H86%'`
whereString += ' AND (location_end_date IS NULL AND dba_end_date IS NULL) '

/* get data from socrata, then analyze*/
// getData(saveData)
// getData(analyzeData)
getData(lookForNulls)

/* load data from disk, then analyze data */
// let data = loadFromLocal('closeds.json')
// analyzeData(data)
// lookForNulls(data)


function getData(handler){
  let consumer = new soda.Consumer('data.sfgov.org')
  consumer.query()
    .withDataset('vbiu-2p9h')
    .limit(2000)
    .where(whereString) //D13&D14 licenses are "Motor Fuel Dispencing Facilities" or "Self-Service Motor Fuel Dispensing Facilities"
    .getRows()
      .on('success', handler)
      .on('error', function(error) { console.error(error); });
}

function saveData(rows) {
  writeFile('data/data.json', rows);
}

function writeFile(filename, jsonData){
  var str = JSON.stringify(jsonData)
  fs.writeFile(filename, str, function(err){
    if (err) { return console.error(err); }
    console.log("The file was saved as", filename);
  });
}

function loadFromLocal(filename){
  let data = fs.readFileSync(filename)
  data = JSON.parse(data)
  return data
}

function analyzeData(rows){
  //place businesses in supervisor districts, if possible
  rows = rows.map(function(business){
    if (business.supervisor_district === undefined){
      business.supervisor_district = findSupervisorDistrict(business)
    }
    return business
  })
  // writeFile('data/inDistrict.json', rows)
  let byDistrict = d3.nest().key(function(d){return d.supervisor_district}).object(rows)
  writeFile('districts.json', byDistrict)
}

function lookForNulls(rows){
  open = []
  closed = []
  rows.forEach((business)=>{
    if (!business.dba_end_date || !business.location_end_date){
      open.push( business )
      console.log(business.dba_end_date);
      console.log(business.location_end_date);
    }else {
      closed.push( business )
      console.log(business.dba_end_date);
      console.log(business.location_end_date);
    }
  })
  console.log(open.length + ' open')
  console.log(closed.length + ' closed');
  writeFile('opens.json', open)
  writeFile('closeds.json', closed)
}


// let closed = data.filter(function(el){
//   return el.location_end_date != undefined
// })

function findSupervisorDistrict(business){
  if (business.location === undefined) {return undefined}
  let pt = turf.point(business.location.coordinates)
  let district = supervisorGeo.features.find(function(geo){
    return turf.inside(pt,geo)
  })
  return district.properties.supervisor
}



