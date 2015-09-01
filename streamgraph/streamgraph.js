/****************************************************
*
* StreamGraph - A library for drawing and SVG stream graph
*
* Author : B. Berney
*
*****************************************************/

StreamColumn = function()
{
	this.items = [];
	this.totalScore = 0;
}

StreamColumn.prototype.addItem = function(item)
{
	this.items[item.partition] = item;
	this.totalScore += item.score;
}

var width = 0;
var height = 600;
var chartItemColours = ["#3366CC","#DC3912","#FF9900","#109618","#990099","#3B3EAC","#0099C6","#DD4477","#66AA00","#B82E2E","#316395","#994499","#22AA99","#AAAA11","#6633CC","#E67300","#8B0707","#329262","#5574A6","#3B3EAC"];
var proportional = false;
var centred = false;

var streamColumns = [];


function doLayout()
{
	var maxColumnTotal = 0;
	
	var columnKeys = Object.keys(streamColumns);
	
	//sort the stacked columns into date order
	columnKeys.sort();
	
	var noColumns = columnKeys.length;
	
	//iterate over keys, join stacks together
	for (var i = 0; i<noColumns; i++)
	{
		var curColumn = streamColumns[columnKeys[i]];

		
		if (i>0)
		{
			var prevColumn = streamColumns[columnKeys[i-1]];
			
			//insert 'bridging' items
			for (var key in curColumn.items) 
			{
				var curItem = curColumn.items[key];
				var prevItem = prevColumn.items[key]; //look for an item from the same partition in the previous stack
				if (prevItem == null) //set this as this item's 'prevItem';
				{
					if (i>1) //check the previous-previous stack for occurrence
					{
						var prevPrevColumn = streamColumns[columnKeys[i-2]];
						var prevPrevItem = prevPrevColumn.items[key];
					
						if (prevPrevItem != null)
						{
							//add a 'bridge' intermediate item to the previous column
							var bridgeItem;
							bridgeItem.score=0;
							bridgeItem.partition=curItem.partition;
							bridgeItem.name=curItem.name;
							
							prevColumn.addItem(bridgeItem);
						}
					}
				}
			}
		}
		if (curColumn.totalScore > maxColumnTotal)
			maxColumnTotal = curColumn.totalScore;
	}

	if (width==0)
		width = noColumns * 200;
	
	if (height==0)
		height = maxColumnTotal * 20;
		
	var columnHeight = height - 40;
	var columnItemSpacing = 4;
	var columnWidth = Math.round(width/(noColumns*1.5));
	var maxChars = columnWidth/7;
	var curX=0;
	
	var svgNS = "http://www.w3.org/2000/svg";
	var svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("width",width);
	svg.setAttribute("height",height);
	
	colourIdx = 0;
	
	var yScale = 1;
	if (proportional) yScale = columnHeight/maxColumnTotal;
			
	//iterate over columns, layout stacks 
	for (var i = 0; i<columnKeys.length; i++)
	{
		var curColumn = streamColumns[columnKeys[i]];
		
		//get keys to the series in the column
		var itemKeys = Object.keys(curColumn.items);
		//sort the column items into descending value order
		itemKeys.sort(function(a,b){return curColumn.items[a].score - curColumn.items[b].score});
		
		//draw column footer
		var axisYPos = height-20;
		var g = document.createElementNS(svgNS, "g");
		g.setAttribute("onmouseover","evt.target.setAttribute('opacity', '0.6');");
		g.setAttribute("onmouseout","evt.target.setAttribute('opacity', '1');");
		svg.appendChild(g);
		
		var rect = document.createElementNS(svgNS, "rect");
		rect.setAttribute("x",curX);
		rect.setAttribute("y",axisYPos);
		rect.setAttribute("width",columnWidth);
		rect.setAttribute("height","20");
		rect.setAttribute("stroke","#aaaaaa");
		rect.setAttribute("fill","#aaaaaa");
		g.appendChild(rect);
		
		var text = document.createElementNS(svgNS, "text");
		text.setAttribute("x",curX);
		text.setAttribute("y",axisYPos+14);
		text.setAttribute("class","streamAxisLbl");
		text.setAttribute("fill","#ffffff");
		text.appendChild(document.createTextNode("("+curColumn.totalScore+")"+columnKeys[i]));
		g.appendChild(text);

		//draw stacked column
		if (!proportional)
		{
			var totalSize = curColumn.totalScore;
							
			if (totalSize == 0)
				totalSize = 1;
			
			yScale = (columnHeight - (itemKeys.length * columnItemSpacing))/totalSize;
		}
		var curY = columnHeight+20;
			
		if (centred) //add an offset to the y to 'centre' the stream about the midpoint of the y-axis.
			curY -= (((maxColumnTotal - curColumn.totalScore) / 2.0) * yScale);
		
		for (var j = 0; j<itemKeys.length; j++)
		{
			var curItem = curColumn.items[itemKeys[j]];
			
			curItem.left = curX;
			var rectHeight = Math.round(curItem.score * yScale);
			curItem.top = curY - rectHeight;
			curItem.right = curX + columnWidth;
			curItem.bottom = curY; 
			
			var prevItem = null;
			var pathStr = "";
			if (i>0)
			{
				var prevColumn = streamColumns[columnKeys[i-1]];
				prevItem = streamColumns[columnKeys[i-1]].items[itemKeys[j]];
			}
			
			if (prevItem==null) //just draw rectangle
			{
				curItem.colour = chartItemColours[(colourIdx++) % chartItemColours.length];
				pathStr = "M"+curItem.left+","+curItem.top+" L"+curItem.right+","+curItem.top+" L"+curItem.right+","+curItem.bottom+" L"+curItem.left+","+curItem.bottom+" Z";
			}
			else //draw a rectangle with a Bezier 'join' to the rect of the item in the same series in the previous column
			{
				curItem.colour = prevItem.colour;
				var midX = prevItem.right + ((curItem.left - prevItem.right) / 2);
				pathStr = "M" + (prevItem.right-1)+","+prevItem.top+" C"+midX+","+prevItem.top+" "+midX+","+curItem.top+" "+curItem.left+","+curItem.top+
				" L"+curItem.right+","+curItem.top+" L"+curItem.right+","+curItem.bottom+" L"+curItem.left+","+curItem.bottom+
				" C"+midX+","+curItem.bottom+" "+midX+","+prevItem.bottom+" "+(prevItem.right-1)+","+prevItem.bottom+" Z";
			}
			
			g = document.createElementNS(svgNS, "g");
			svg.appendChild(g);
			
			var path = document.createElementNS(svgNS, "path");
			path.setAttribute("d", pathStr);
			path.setAttribute("stroke",curItem.colour);
			path.setAttribute("fill",curItem.colour);
			path.setAttribute("onmouseover","evt.target.setAttribute('opacity', '0.6');");
			path.setAttribute("onmouseout","evt.target.setAttribute('opacity', '1');");
			g.appendChild(path);
			
			if (rectHeight>=20)
			{
				var text = document.createElementNS(svgNS, "text");
				text.setAttribute("x",curX);
				text.setAttribute("y",(curItem.top+14));
				text.setAttribute("class","streamItemLbl");
				text.setAttribute("fill","#ffffff");
				text.appendChild(document.createTextNode("("+Math.round(curItem.score)+") "+curItem.name));
				g.appendChild(text);
			}
			
			curY -= (rectHeight + columnItemSpacing);
		}
		
		curX += Math.round(columnWidth * 1.5);
	}	
		
	var graphDiv = document.getElementById("graphDiv");
	graphDiv.appendChild(svg);
}
	

function showGraph(url)
{
	$.getJSON( url, 
	
	function( data ) 
	{
	  $.each( data.itemCountsByDate, 
		  function( key, val ) 
		  {
			var date = new Date(val.date);
			var dateStr = (date.getFullYear()+'/'+('0'+date.getMonth()+1).slice(-2)+'/'+('0'+date.getDate()).slice(-2));
			var curColumn = streamColumns[dateStr];
			if (curColumn == null)
			{
				curColumn = new StreamColumn();
				streamColumns[dateStr] = curColumn;
			}
			curColumn.addItem(val);
		  }
	  );
	 
		doLayout();
	}
	);
}