      "use strict";
      //display polygon
      const width = 700,
      height = 700;

      //start unit projection
      const projection = d3.geo.albers();

      const path = d3.geo.path()
          .projection(projection);

      const svg = d3.select("#map").append("svg")
          .attr("width", width)
          .attr("height", height);

      d3.json("sfmaps/combine.json", function(error, sf) {
          if (error) return console.error(error);
          //console.log(sf)

          const neighborhoods = topojson.feature(sf, sf.objects.neighborhoods)
          const arteries = topojson.feature(sf, sf.objects.arteries)
          const freeways = topojson.feature(sf, sf.objects.freeways)
          const streets = topojson.feature(sf, sf.objects.streets)

          projection
                .scale(1)
                .translate([0, 0]);

          const b = path.bounds(neighborhoods),
              s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
              t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

          projection
                .scale(s)
                .translate(t);
          //draw neighborhoods
          svg.append("path")
                .datum(neighborhoods)
                .attr("class", "feature")
                .attr("d", path);
          // outside boundary      
          svg.append("path")
                .datum(topojson.mesh(sf, sf.objects.neighborhoods, function(a, b) { return a === b; }))
                .attr("class", "mesh")
                .attr("d", path);
          //draw streets also cover the boundary between neighborhoods
          svg.append("path")
                .datum(streets)
                .attr("class", "streets")
                .attr("d", path); 
          //define a pattern
          const defs = svg.append('svg:defs');
          defs.append("svg:pattern")
                .attr("id", "bus_pattern")
                .attr("width", 20)
                .attr("height", 20)
                .append("svg:image")
                .attr("width", 20)
                .attr("height", 20)
                .attr("xlink:href","img/bus.png")
                .attr("x", 0)
                .attr("y", 0);
          //create a group for all the selected bus
          const allBusGroup = svg.append("svg:g")
          //create an object to maintain all inveral
          const inveralObj = {}
          //make table function
          function tabulate(data, columns, chosen_route, dir) {
            const table = d3.select('#prediction_div').append('table').attr("class", chosen_route);
            const caption = table.append('caption');
            const thead = table.append('thead');
            const tbody = table.append('tbody');
            
            // caption for the table
            caption.html(dir)

            // append the header row
            thead.append('tr')
              .selectAll('th')
              .data(columns).enter()
              .append('th')
                .text(function (column) { return column; })

            // create a row for each object in the data
            const rows = tbody.selectAll('tr')
                            .data(data)
                            .enter()
                            .append('tr');

            // create a cell in each row for each column
            const cells = rows.selectAll('td')
                            .data(function (row) {
                              return columns.map(function (column) {
                                return {column: column, value: row[column]};
                              });
                            })
                            .enter()
                            .append('td')
                              .text(function (d) { return d.value; });

             return table;
          }
          //search all route
          const routeUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=sf-muni"
          d3.xml(routeUrl, function(error, routeData){
            routeData = [].map.call(routeData.querySelectorAll("route"), function(route) {
                return {
                  tag: route.getAttribute("tag")
                }
            })
            const routeNames = routeData.map(function(obj) {
                return obj.tag
            })
            //build button and draw bus
            d3.select("#button_div")
              .selectAll("input")
              .data(routeNames)
              .enter()
              .append("input")
              .attr("type","button")
              .attr("class","button")
              .attr("id", function(d){return "btn"+d})
              .style("background-color", "white")
              .style("border-radius", 5+"px")
              .attr("value", function (this_routes){return this_routes;} )
              .on("click", function(chosen_route){
                  //create a toggle method
                  const chosen = allBusGroup.select(`#route${chosen_route}`)[0][0]
                  if (chosen) {
                    chosen.remove();
                    //clear table
                    Array.from(document.getElementsByClassName(`${chosen_route}`)).forEach(function(item){
                                  item.remove();
                                })
                    //return btn to normal
                    d3.select(`#btn${chosen_route}`)
                      .style("background-color", "white")
                      .style("border-radius", 5+"px")
                    //clear invertal of this route
                    clearInterval(inveralObj[`route${chosen_route}`])
                    
                  } else {
                      const drawBus = function() {

                        const sglBusGroup = allBusGroup.append("svg:g")
                                                      .attr("id", "route"+chosen_route)

                        const locUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t=0&r="+chosen_route;
                        const cfgUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=sf-muni&r="+chosen_route;
                        
                        d3.xml(cfgUrl, function(error, cfgData){

                            cfgData.querySelectorAll("route").forEach(function(route) {

                              const color = route.getAttribute("color");
                              
                              //change color for btn
                              d3.select(`#btn${chosen_route}`)
                                .style("background-color", "lightgoldenrodyellow")

                              d3.xml(locUrl, function(error, locData){

                                  locData.querySelectorAll("vehicle").forEach(function(vehicle) {
                                    
                                    const lon = vehicle.getAttribute("lon")
                                    const lat = vehicle.getAttribute("lat")
                                    //draw
                                    sglBusGroup.append("circle")
                                        .attr("r", 10)
                                        .style("fill", "url(#bus_pattern)")
                                        .style("stroke", color)
                                        .style("stroke-width", 3)
                                        .attr("transform", function() {return "translate(" + projection([lon, lat]) + ")";});
                                  })
                              });

                              //build route path
                              route.querySelectorAll("path").forEach(function(path) {

                                path.querySelectorAll("point").forEach(function(point) {
                                  const pathLon = point.getAttribute("lon")
                                  const pathLat = point.getAttribute("lat")
                                  sglBusGroup.append("circle")
                                        .attr("r", 1.5)
                                        .style("fill", color)
                                        .attr("transform", function() {return "translate(" + projection([pathLon, pathLat]) + ")";});
                                })
                              });
                              //create stop info
                              route.querySelectorAll("direction").forEach(function(direction) {
                                //timetable array for each direction
                                const timetableArr = new Array();

                                const dir = direction.getAttribute("title");
                                const stopSum = direction.querySelectorAll("stop").length;

                                direction.querySelectorAll("stop").forEach(function(stop) {
                                  const stopTag = stop.getAttribute("tag");
                                  const stopUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=predictionsForMultiStops&a=sf-muni&stops="+chosen_route+"|"+stopTag;
                                  
                                  d3.xml(stopUrl, function(err, stopData){

                                    stopData.querySelectorAll("predictions").forEach(function(predictions) {
                                      const timetableObj = new Object();
                                      timetableObj["StopTitle"] = predictions.getAttribute("stopTitle");
                                      if(predictions.querySelector("prediction:first-child") === null) {
                                        timetableObj["Time"] = "no data"
                                      }
                                      else{
                                        timetableObj["Time"] = predictions.querySelector("prediction:first-child").getAttribute("minutes");
                                      }
                                      timetableArr.push(timetableObj);                                      
                                    })
                                    if (timetableArr.length === stopSum) {
                                      tabulate(timetableArr, ["StopTitle", "Time"], chosen_route, dir);
                                    }
                                  })
                                })
                                //can not create a table here, since d3.xml is an AJAX call
                              })
                            })
                        })
                      }
                      //immediately draw
                      drawBus();
                      //use obj to maintain the inverals of different bus
                      inveralObj[`route${chosen_route}`]  = setInterval(function() {
                                allBusGroup.select(`#route${chosen_route}`)[0][0].remove();
                                //ES6 convert an array-like structure to an actual array.
                                Array.from(document.getElementsByClassName(`${chosen_route}`)).forEach(function(item){
                                  item.remove();
                                })
                                drawBus(); 
                      }, 15000)
                  }
                })
            })

          //create a reset button
          d3.select("#reset_all_btn")
            .on("click", function() {
              //clear all intervals
              for(const key in inveralObj) {
                clearInterval(inveralObj[key]);
              }
              //delete all bus in the map
              allBusGroup.selectAll("*").remove();
              //delete all tables in the map
              d3.selectAll("table").remove();
              //reset the button
              d3.selectAll(".button")
                .style("background-color", "white")
                .style("border-radius", 5+"px")
            })


      });