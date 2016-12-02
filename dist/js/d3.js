      //display polygon
      var width = 700,
      height = 700;

      //start unit projection
      var projection = d3.geo.albers();

      var path = d3.geo.path()
          .projection(projection);

      var svg = d3.select("#map").append("svg")
          .attr("width", width)
          .attr("height", height);

      d3.json("sfmaps/combine.json", function(error, sf) {
          if (error) return console.error(error);
          //console.log(sf)

          var neighborhoods = topojson.feature(sf, sf.objects.neighborhoods)
          var arteries = topojson.feature(sf, sf.objects.arteries)
          var freeways = topojson.feature(sf, sf.objects.freeways)
          var streets = topojson.feature(sf, sf.objects.streets)

          projection
                .scale(1)
                .translate([0, 0]);

          var b = path.bounds(neighborhoods),
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
          //draw arteries
          // svg.append("path")
          //       .datum(arteries)
          //       .attr("class", "arteries")
          //       .attr("d", path);
          //draw freeways
          // svg.append("path")
          //       .datum(freeways)
          //       .attr("class", "freeways")
          //       .attr("d", path); 
          //define a pattern
          var defs = svg.append('svg:defs');
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
          var allBusGroup = svg.append("svg:g")
          //create an object to maintain all inveral
          var inveralObj = {}
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
              .attr("value", function (all_routes){return all_routes;} )
              .on("click", function(chosen_route){
                  //create a toggle method
                  var chosen = allBusGroup.select(`#route${chosen_route}`)[0][0]
                  if (chosen) {
                    chosen.remove();
                    //return btn to normal
                    d3.select(`#btn${chosen_route}`)
                      .style("background-color", "white")
                      .style("border-radius", 5+"px")
                    //clear invertal of this route
                    clearInterval(inveralObj[`route${chosen_route}`])
                    //console.log(inveralObj)
                  } else {
                      var drawBus = function() {

                        var sglBusGroup = allBusGroup.append("svg:g")
                                                      .attr("id", "route"+chosen_route)

                        const locUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t=0&r="+chosen_route;
                        const cfgUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=sf-muni&r="+chosen_route;
                        
                        d3.xml(cfgUrl, function(error, cfgData){

                            cfgData = [].map.call(cfgData.querySelectorAll("route"), function(route) {
                              
                              const color = route.getAttribute("color")
                              
                              //change color for btn
                              d3.select(`#btn${chosen_route}`)
                                .style("background-color", "lightgoldenrodyellow")

                              d3.xml(locUrl, function(error, locData){

                                  locData = [].map.call(locData.querySelectorAll("vehicle"), function(vehicle) {
                                    
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
                              })

                            })
                        })
                      }
                      //immediately draw
                      drawBus();
                      //use obj to maintain the inverals of different bus
                      inveralObj[`route${chosen_route}`] = setInterval(function() {
                                allBusGroup.select(`#route${chosen_route}`)[0][0].remove();
                                drawBus(); 
                      }, 15000)                              
                      //console.log(inveralObj)
                  }
                })
            })

          //create a reset button
          d3.select("#reset_all_btn")
            .on("click", function() {
              //clear all intervals
              for(var key in inveralObj) {
                clearInterval(inveralObj[key]);
              }
              //delete all bus in the map
              allBusGroup.selectAll("*").remove();
              //reset the button
              d3.selectAll(".button")
                .style("background-color", "white")
                .style("border-radius", 5+"px")
            })


      });