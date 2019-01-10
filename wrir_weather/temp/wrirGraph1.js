

/* -----------------------------------------

WRIR Weather Information Discovery Tool JavaScript core

original concept and code by Tom Moore

with revisions by Joshua A. Lemli, 2018-01-12

----------------------------------------  */





function _makeDateStringForQuery(dateObj) {
    return dateObj.getUTCFullYear() +
        ('0' + (dateObj.getUTCMonth()+1)).slice(-2) +
        ('0' + dateObj.getUTCDate()).slice(-2) +
        ' ' +
        ('0' + dateObj.getHours()).slice(-2) +
        ':' +
        ('0' + dateObj.getMinutes()).slice(-2)
}

// takes two "date" strings valid w/ JS `Date` constructor
function addMonths(date, months) {
    date.setMonth(date.getMonth() + months);
    return date;
}


// Made modifications, probally bad ones to autopull dates and update graph oppose to start on a button.
function fetchData(startDate,endDate,siteId) {

    startDate = startDate ? new Date(startDate) : addMonths(new Date(),-20) ;
    endDate = endDate ? new Date(endDate) : new Date() ;

    // make SQL-
    var
    ti = _makeDateStringForQuery(startDate),
    tf = _makeDateStringForQuery(endDate);
    sid = siteId;
    // console.log(sid);
    const fetchURL = 'https://uwmaps.wygisc.org/windriver_k12_custom/index.php';
    // async return
    return new Promise(function(resolve,reject){
        var postData = new FormData();
        postData.append('ti',ti);
        postData.append('tf',tf);
        postData.append('sid',sid);
        postData.append("tbl","AirTemperature"); // <----- change this to change the targeted table   hmm not wind?
        var xhr = new XMLHttpRequest();
        xhr.onerror = function(error){console.log(error);};
        xhr.onreadystatechange = function() {
            if (xhr.readyState==4 & xhr.status==200) resolve(JSON.parse(xhr.response));
        };
        xhr.open('post',fetchURL);
        xhr.send(postData);
    });
}






function updateGraph(startDate,endDate,siteId) {
		
    fetchData(startDate,endDate,siteId).then(function(results){

        ////*set size of graph */ 
        var
        svg = d3.select("svg"),
        margin = {top: 20, right: 20, bottom: 90, left: 45},
        margin2 = {top:  440, right: 20, bottom: 20, left: 45},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        height2 = +svg.attr("height") - margin2.top - margin2.bottom,

        ////*what we can zoom and pan on in relation to graph */
        focus = svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
        context = svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

        ////*make date format from JSON work as a scale (MAY NEED TO CHANGE) */
        var format = d3.timeParse("%Y-%m-%d %H:%M:%S");

        ////*create variable for all a and y axes */
        var x = d3.scaleTime()
            .rangeRound([0, width]);

        var x2 = d3.scaleTime()
            .rangeRound([0, width]);
        
        var y = d3.scaleLinear()
            .rangeRound([height, 0]);

        var y2 = d3.scaleLinear()
            .rangeRound([height2, 0]);

        var y3 = d3.scaleLinear()
            .rangeRound([height, 0]);

        ////*the little grpah at the bottom needs them tooo!! */
        var y32 = d3.scaleLinear()
            .rangeRound([height2, 0]);


        ////*create variable for each object needed represented and the zoom/toggle function */
        var brush = d3.brushX()
            .extent([[0, 0], [width, height2]])
            .on("brush end", brushed);

        var zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed)
        
        // wind
        var area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function(d,i) { return x(d.date); })
            .y0(height)
            .y1(function(d, i) { return y(d.wind); })

        // wind-gust
        var linee = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function(d,i) { return x(d.date); })
            .y0(height)
            .y1(function(d,i) { return y3(d.windg); });

        // wind (bottom)
        var area2 = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function(d,i) { return x2(d.date); })
            .y0(height2)
            .y1(function(d,i) { return y2(d.wind); });

        // wind-gust (bottom)
        var linee2 = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function(d,i) { return x2(d.date); })
            .y0(height2)
            .y1(function(d,i) { return y32(d.windg); });
        
        
        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        /////Need to format the date
console.log(results);
        var obs =    results.tblWind_WindDirection;
        var datese = obs.map(a => a.Samp_Datee.date);
        var dates =  datese.map(format)
        var wind =   obs.map(a => a.WindSpeed_m_s);
        var windg =  obs.map(a => a.WindGusts_m_s);

        (function(d){ return +d; });

        var data = new Object;
        data.date = dates;
        data.wind=wind;  
        data.windg=windg;

        // scale the range of the data
        x.domain(d3.extent(data.date));
        y.domain(d3.extent(data.windg));
        x2.domain(x.domain());
        y2.domain(y.domain());
        y3.domain(d3.extent(data.windg));
        y32.domain(y3.domain());
console.log(results);

        data.airTempByDate = data.date.map(function(d, i){
            return {
                date: d,
                wind: wind[i],
                windg: windg[i], 
            };
        })

console.log(results);
        focus.append("path")
            .datum(data.airTempByDate)
            .attr("class", "area1")
            .attr("id","redLine")
            .attr("d", linee);
        
        focus.append("path")
            .datum(data.airTempByDate)
            .attr("class", "area")
            .attr("id","blueLine")
            .attr("d", area);
        
        focus.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        focus.append("g")
            .attr("class", "axis axis--y")
            .attr("id","blueLine1")
            .attr("stroke","black")
            .call(d3.axisLeft(y))
            .call(d3.axisLeft(y3));

        focus.append("g")
            .attr("class", "axis axis--y")

        context.append("path")
            .datum(data.airTempByDate)
            .attr("class", "area")
            .attr("id","blueLine2")
            .attr("d", area2);
        
        context.append("path")
            .datum(data.airTempByDate)
            .attr("class", "area1")
            .attr("id","redLine2")
            .attr("d", linee2);
        
        context.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height2 + ")")
            .call(d3.axisBottom(x));
        

        context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, x.range());

        svg.append("rect")
            .attr("class", "zoom")
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);

		svg.append("text")
		.attr("id","blueLine4")
		.attr("transform", "rotate(-90)")
		.attr("y", 12)
		.attr("x", -253)
	.attr("fill","black")
		.text("Wind Speed (m/s)");
		
	  svg.append("text")
	  .attr("id","redLine4")
		  .attr("transform", "rotate(-90)")
		  .attr("y", 25)
		  .attr("x", -240)
	  .attr("fill","red")
		 .text("Wind Gust");       
	   
	   var supplanting = false;

        function supplantData(ti,tf,siteId) {
            if (supplanting) return;
            else supplanting = true;
            // console.log("supplanting");
            d3.select("#redLine").remove()
            d3.select("#blueLine").remove()
            d3.select("#blueLine1").remove()
            d3.select("#tempAxis1").remove()
            d3.select("#tempAxis2").remove()

            function addTSlashes(t) {
                return t.substr(0,4) + "/" + t.substr(4,2) + "/" + t.substr(6)
            }

            // this might be problematic in the future when switching between sites!
            ti = ti ? addTSlashes(ti) : addMonths(new Date(),-20)
            tf = tf ? addTSlashes(tf) : new Date()

            // determine which function we are aggregating by.
            // note that this is just for display and debugging purposes!

            var rangeInDays = (new Date(tf) - new Date(ti)) / 60/60/24/1000 ;
           // console.log( rangeInDays )
            if (rangeInDays < 200) {
                document.getElementById("aggBy").innerHTML = "Aggregating by hour"
            }
            else {
                document.getElementById("aggBy").innerHTML = "Aggregating by day"
            }

            return new Promise(function(resolve,reject){

                fetchData(ti,tf,siteId).then(function(results){



                    // wind
                    var areaRefresh = d3.area()
                        .curve(d3.curveMonotoneX)
                        .x(function(d,i) { return x(d.date); })
                        .y0(height)
                        .y1(function(d, i) { return y(d.wind); })

                    // wind-gust
                    var lineeRefresh = d3.area()
                        .curve(d3.curveMonotoneX)
                        .x(function(d,i) { return x(d.date); })
                        .y0(height)
                        .y1(function(d,i) { return y3(d.windg); });

console.log(results);
                    // parse data
                    var obs =    results.tblWind_WindDirection;
                    var datese = obs.map(a => a.Samp_Datee.date);
                    var dates =  datese.map(format)
                    var wind =   obs.map(a => a.WindSpeed_m_s);
                    var windg =  obs.map(a => a.WindGusts_m_s);

                    (function(d){ return +d; });

                    var data = new Object;
                    data.date = dates;
                    data.wind=wind;  
                    data.windg=windg;

                    // set domains...?
                    x.domain(d3.extent(data.date));
                    y.domain(d3.extent(data.windg));
                    y3.domain(d3.extent(data.windg));
                    data.airTempByDate = data.date.map(function(d, i){
                        return {
                            date: d,
                            wind: wind[i],
                            windg: windg[i], 
                        };
                    })

                    //if ((new Date(tf) - new Date(ti)) / 60/60/24/1000 < 50) {}



                    focus.append("path")
                        .datum(data.airTempByDate)
                        .attr("class", "area1")
                        .attr("id","redLine")
                        .attr("d", lineeRefresh);
                    
                    focus.append("path")
                        .datum(data.airTempByDate)
                        .attr("class", "area")
                        .attr("id","blueLine")
                        .attr("d", areaRefresh);

                    
                    // d3.select("g").remove();
                    // d3.select("g").remove();
                    // d3.select("g").remove();


                    // focus.append("g")
                    //     .attr("class", "axis axis--x")
                    //     .attr("id", "tempAxis1")
                    //     .attr("transform", "translate(0," + height + ")")
                    //     .call(d3.axisBottom(x));

                    focus.append("g")
                        .attr("class", "axis axis--y")
                        .attr("id","blueLine1")
                        .attr("stroke","black")
                        .call(d3.axisLeft(y))
                        .call(d3.axisLeft(y3));

                    focus.append("g")
                        .attr("class", "axis axis--y")
                        .attr("id", "tempAxis2")

                    supplanting = false;
                    resolve();
                })
            })
        }

        function brushed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
            var s = d3.event.selection || x.range();
            x.domain(s.map(x.invert, x));
            focus.selectAll(".area1").attr("d", linee);
            focus.selectAll(".area").attr("d", area);
            focus.selectAll(".axis--x").call(d3.axisBottom(x));
            svg.selectAll(".zoom").call(zoom.transform, d3.zoomIdentity
                .scale(width / (s[1] - s[0]))
                .translate(-s[0], 0));
            if (window.t_store) supplantData(t_store[0],t_store[1],document.getElementById("siteIdSelect").value);
        }



        function zoomed() {

            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
            var t = d3.event.transform;

            x.domain(t.rescaleX(x2).domain());
            focus.selectAll(".area1").attr("d", linee);
            focus.selectAll(".area").attr("d", area);

            //Ensure the date shifts with zoom//
            focus.select(".axis--x").call(d3.axisBottom(x));///labels  x axis
            context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
            ////Provides output for the date extent when zooming 
            //window.test = x.domain() //trying to make global
            // make SQL-
            ti = _makeDateStringForQuery(x.domain()[0]),
            tf = _makeDateStringForQuery(x.domain()[1]);

            window.t_store = [ti,tf];

            supplantData(ti,tf,document.getElementById("siteIdSelect").value);

        }


        // Get the modal
        var modal = document.getElementById('myModal');

        // Get the button that opens the modal
        var btn = document.getElementById("myBtn");

        // Get the <span> element that closes the modal
        var span = document.getElementsByClassName("close")[0];

        // When the user clicks the button, open the modal
        btn.onclick = function() {
            modal.style.display = "block";
        }

        // When the user clicks on <span> (x), close the modal
        span.onclick = function() {
            modal.style.display = "none";
        }

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }

        document.getElementById("siteIdSelect").onchange = function(event) {
            supplantData(null,null,event.target.value)
        }
  
    });
}