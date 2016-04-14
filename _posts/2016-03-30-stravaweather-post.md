---
layout: post
title: "StravaWeather"
description: "A project to add weather information to Strava activities."
tags: [strava, weather, api, visualisation]
modified: 2016-03-30
image:
  feature: /stravaweather/stravaweather1.jpg
---

Every cyclist knows just how much of an effect the weather can have, especially wind. The wind speed and direction can mean the difference between flying along effortlessly smashing KOMs and realising that you have to keep pedalling to avoid going backwards! 

Which makes it all the more surprising that Strava has no provision for weather information (and, as far as I know, no plans to do so).

So I though I would have a crack.... then left it for a year thinking about how complex getting, storing and retrieving all the weather data would be... , and then found a great weather API that would hugely speed up the project at <href a="http://developer.worldweatheronline.com/api/historical-weather-api.aspx">World Weather Online</a>. So here goes....

Essentially, it is a project of two halves :

* A server process to fetch Strava activities and weave weather data into them.
* Client side code to map an activity and display the route with weather information overlaid onto it.

This blog post will outline the server side code whilst the next one will describe the client.

##Server side code - StravaWeatherServlet

Essentially, the principal job of the StravaWeatherServlet is to sit between the browser client and the Strava servers, relaying requests for Strava activity data, parsing them, fetching the weather information from World Weather Online for the correct time and locations, and adding this weather info to the activity data.

Activities are requested from the Strava API as an HTTP REST request using the activity unique ID. The information is returned as JSON which looks like this:

{
  "comment_count": 0,
  "segment_efforts": [
    {
      "distance": 1038.3,
      "start_date_local": "2016-03-02T09:33:04Z",
      ...
      "segment": {
        "distance": 1041.8,
        "start_latlng": [
          53.424473,
          -2.217701
        ],
        "end_latlng": [
          53.433642,
          -2.214634
        ],
        "name": "1km Time Trial (N) - Parkville to Parsonage",
        ...
      },
      "elapsed_time": 133,
      "moving_time": 133,
      "start_date": "2016-03-02T09:33:04Z"
    },
    {
      
      "distance": 702.9,
      "start_date_local": "2016-03-02T09:33:52Z",
      "segment": {
        ...
        "start_latlng": [
          53.427669,
          -2.216579
        ],
        ...
        "end_latlng": [
          53.433826,
          -2.214619
        ],
        ...
      },
      "name": "Money Saver to Parsonage Rd sprint",
      "elapsed_time": 88,
      "id": 12172204111,
      "pr_rank": null,
      "moving_time": 88,
      "start_date": "2016-03-02T09:33:52Z"
    },
    ...
  ],
  "type": "Ride",
  "end_latlng": [
    51.32,
    -1.23
  ],
  "kilojoules": 138.6,
  ... 
  "max_speed": 12.6,
  "start_latlng": [
    53.42,
    -2.22
  ],
  "name": "Morning Ride",
  ...
  "start_latitude": 53.42,
  "location_city": "Manchester",
  "elapsed_time": 1402,
  "average_speed": 6.203,
  "moving_time": 1291,
  "start_date": "2016-03-02T09:29:19Z",
  "calories": 154.6,
  ...
}

I have l

###1. Fetch an activity from

The first stage of processing is to fetch the graph's data - this arrives a json in the following format:

	{"itemCountsByDate":
		[
		{"score":7, "partition":"BIRMINGHAM", "name":"BIRMINGHAM", "date":1393632000000},
		{"score":6, "partition":"BRADFORD", "name":"BRADFORD", "date":1393632000000},
		{"score":8, "partition":"BRISTOL", "name":"BRISTOL", "date":1393632000000},
		{"score":6, "partition":"GLASGOW", "name":"GLASGOW", "date":1393632000000}...
		{"score":9, "partition":"LEEDS", "name":"LEEDS", "date":1395360000000}
		]
	}

Each object represents a count of items of a particular category or series ('partition') and at a particular point in time ('date' : number of milliseconds since 01/01/1970).

We use jquery to fetch the data and then we 'bin' the items into particular epochs (we do this by converting the 'date' value into a sortable string representation, e.g. '2015/06/05' and adding the items to a 'StreamColumn' object representing that date).
 

	$.each( data.itemCountsByDate, 
		  function( key, val ) 
		  {
			var date = new Date(val.date);
			
			//create 'x' scale of dates in format 'yyyy/MM/dd'
			var dateStr = (date.getFullYear()+'/'+
							('0'+date.getMonth()).slice(-2)+'/'+
							('0'+date.getDate()).slice(-2));
			var curColumn = streamColumns[dateStr];
			if (curColumn == null)
			{
				//add a new column for this date
				curColumn = new StreamColumn();
				streamColumns[dateStr] = curColumn;
			}
			curColumn.addItem(val);
		  }
	  );
	  
Note that when we add an 'item' to a column, we add it as an object 'keyed' on the 'partition id' to allow us to access the items by partitionId.

	StreamColumn.prototype.addItem = function(item)
	{
		this.items[item.partition] = item;
		this.totalScore += item.score;
	}
	
By now we have all the data placed into 'date' columns. Optionally, at this point we can fill in some of the blanks, either by insisting that each column 'stack' contains all of the partitions/series and adding 0 scored items where they are not already there, or by 'bridging' series across columns with missing values as below:

<center><figure>
	<img src="/images/streamgraph/bridge.jpg" alt=""></a>
	<figcaption>Columns with a missing 'BRADFORD' bridged.</figcaption>
</figure></center>

We do this by looking at each series in a stack, checking to see if it is in the previous column, and if not, we check the column before that, if it is in that 'previous-previous column', then we add a 0 scoring item of that series to the previous column.

	//insert 'bridging' items
	for (var key in curColumn.items) 
	{
		var curItem = curColumn.items[key];
		var prevItem = prevColumn.items[key]; //look for an item 
							//from the same partition 
							//in the previous stack
		if (prevItem == null) //set this as this item's 'prevItem';
		{
			if (i>1) //check the previous-previous stack for occurrence
			{
				var prevPrevColumn = streamColumns[columnKeys[i-2]];
				var prevPrevItem = prevPrevColumn.items[key];
			
				if (prevPrevItem != null)
				{
					//add a 'bridge' intermediate item 
					//to the previous column
					var bridgeItem;
					bridgeItem.score=0;
					bridgeItem.partition=curItem.partition;
					bridgeItem.name=curItem.name;
					
					prevColumn.addItem(bridgeItem);
				}
			}
		}
	}

###2. Prepare the layout

First we sort the columns into date order ( by sorting our 'map' of StreamColumns by the date/column label ). Next we sort each stack into descending score order (we could optionally sort by series name - which would give us a stacked area graph essentially).

Finally, we iterate through each column and mark out a stack of rectangles, where the width is defined in 'columnWidth' and the height is the score * yScale. The yScale can be decided in two ways

* (locally scaled/non proportional) The column height in pixels / The total score of that column (all items scores added). This will give a graph where every column is the same total height. Item heights are not comparable scross columns.
* (proportional/globally scaled) The column height in pixels / The column total score in the whole graph. This makes the item heights comparable across columns.

###3. Draw the graph

Finally, we draw the graph using SVG tags. Essentially we draw a stack of rectangles but with a twist: for each item, we check to see if there is an item of the same series in the previous column, if there isn't, we draw a simple rectangle. If there is however, we draw the a path that starts at the top-right corner of the previous rectangle and follows a Bezier curve to the top left of this item rectangle, following round the rectangle and then back via a bezier curve to the bottom right of the previous rectangle. This creates a nice join between the two columns.

	if (prevItem==null) //just draw rectangle
	{
		curItem.colour = chartItemColours[(colourIdx++) % chartItemColours.length];
		pathStr = "M"+curItem.left+","+curItem.top+" L"+curItem.right+","+curItem.top+
			" L"+curItem.right+","+curItem.bottom+" L"+curItem.left+","+curItem.bottom+" Z";
	}
	else //draw a rectangle with a Bezier 'join' to the rect of the item in the 
		 //same series in the previous column
	{
		curItem.colour = prevItem.colour;
		var midX = prevItem.right + ((curItem.left - prevItem.right) / 2);
		pathStr = "M" + (prevItem.right-1)+","+prevItem.top+" C"+midX+","+
			prevItem.top+" "+midX+","+curItem.top+" "+curItem.left+","+curItem.top+
			" L"+curItem.right+","+curItem.top+" L"+curItem.right+","+curItem.bottom+
			" L"+curItem.left+","+curItem.bottom+
			" C"+midX+","+curItem.bottom+" "+midX+
			","+prevItem.bottom+" "+(prevItem.right-1)+","+prevItem.bottom+" Z";
	}

	
###Example - Temperatures in 2015 in major UK cities. 

The HTML is <a href="/streamgraph/streamgraph.html" target="_blank">here</a>, the Javascript is <a href="/streamgraph/streamgraph.js" target="_blank">here</a> and the data JSON is <a href="/streamgraph/weather-daily-temps-2015-H1.json" target="_blank">here</a>.