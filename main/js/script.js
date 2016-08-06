var serverURL = "https://data.learninginventions.org/channels/";

var config = { results:1000, dynamic:false };

var fieldTxt = "field";
var params	= {};
var channel = {fields:[],names:[],data:{}};
var validTypes = ["line","column","spline"];
var suffix = ["Wh","V","A","Watt"]

var isLoading = {};
var seriesOptions = [],
seriesCounter = 0,

// create the chart when all data is loaded
createChart = function () {
	var channelID = Number(getUrlParameter("channelID"));
	$('#container').highcharts( 'StockChart', {
		chart : {
			
			events : {
				load : function () {
					var series2 = this.series.slice(0,this.series.length-1);
					handleLoaded(series2);
				}
			}
		},

		title: {
			text: channel.name ,
			style: {
				color: 'black',
				fontSize: '36px'	
			}
		},
		rangeSelector: {
			buttons: [
				{
					type: 'minute',
					count: 5,
					text: '5min'
				},
				{
					type: 'hour',
					count: 1,
					text: '1hr'
				},
				{
					type: 'day',
					count: 1,
					text: '1d'
				},
				{
					type: 'week',
					count: 1,
					text: '1w'
				},
				{
					type: 'month',
					count: 1,
					text: '1m'
				}, {
					type: 'ytd',
					text: 'YTD'
				}, {
					type: 'year',
					count: 1,
					text: '1y'
				}, {
					type: 'all',
					text: 'All'
				}]
			},

			yAxis: {
            	
            	plotLines: [{
                	value: 0,
                	width: 2,
                	color: 'Sliver'
            	}]
        	},
			

			// legend: {
			// 	enabled: true,
			// 	layout: 'horizontal',
			// 	align: 'bottom',
			// 	borderWidth: 0
			// },
			legend: {
				enabled: true,
				layout: 'vertical',
				align: 'left',
				verticalAlign: 'top',
				floating: true,
				y: 240
			},
			

			// plotOptions: {
			// 	// series: {
			// 	//     compare: 'percent'
			// 	// }
			// 	enabled: true

			// },

			 plotOptions: {
   //          	line: {
   //              	dataLabels: {
   //               	   enabled: false
   //              	},
   //              	enableMouseTracking: true
   //          	}
   				bar: {
					dataLabels: {
						enabled: true
					}
				}
         	},

			tooltip: {
				pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
				valueDecimals: 2
			},

			series: seriesOptions
		});
	};

	var updateChannelShow = function(data){
		channel = $.extend(channel, data.channel);
		setFields(data);
		initData(data);
	}

	var updateChannelMultiShow = function(data){
		channel = $.extend(channel, data.channel);
		setFields(data);

		var template = $('<iframe src="show.html" width="100%" height="400px" style="border: 0px"></iframe>');
		var params_clone = params;
		delete params_clone.types;
		delete params_clone.fields;

		for (fieldi in channel.data){
			var field = channel.data[fieldi];
			var $iframe = $(template).clone();
			var src = "show.html?"+$.param( $.extend(params_clone, {fields:field.field, types:field.type} ) );
			$iframe.attr("src", src);
			$('#container').append($iframe);
		}
	}

	function getChannelInfo(callback){
		$.getJSON( serverURL+params.channelID+"/feeds.json?results=0&api_key="+params.api_key, callback).fail(function() {
			alert("Invalid parametors");
		});

	}

	function initData(object){
		console.log("Loading...");
		var valueplot = [];
		$.each(channel.list, function (i, name) {

			var option = config;//{results : config.results, api_key : params.api_key}
			var fetch_url = serverURL+params.channelID+'/field/'+name+'.json?'+$.param(option);

			$.getJSON(fetch_url,    function (data) {

				var list = []
				if (data.feeds){
					$.each(data.feeds, function (index, record) {
						if(record[fieldTxt+name]){
							var parsedData = parseDataLog({ datetime:record.created_at,value:record[fieldTxt+name] });
							list.push( [parsedData.datetime, parsedData.value ] )
							valueplot[i] = parsedData.value.toFixed(2) ;
						};
					});
				}
				
				// Store last upadted
				channel.data[name].last_entry_id = data.channel.last_entry_id
				channel.data[name].updated_at = data.channel.updated_at;
				channel.updated_at = data.channel.updated_at;
				isLoading[name] =  false;

				seriesOptions[i] = {
					name: channel.data[name].name,
					data: list,
					type: ( validTypes.indexOf(channel.data[name].type) > -1  ? channel.data[name].type : 'line' ),
					step: channel.data[name].type=="step" ? 'left' : false ,
					tooltip: {valueSuffix: " " + suffix[i]}
				};

				// As we're loading the data asynchronously, we don't know what order it will arrive. So
				// we keep a counter and create the chart when all the data is loaded.
				seriesCounter += 1;

				if (seriesCounter === channel.names.length) {
					createChart();
					plotRealTime(valueplot);
				}

			});
		});
	
		return;
	}

	function getUrlParameter(sParam) {
		var sPageURL = window.location.search.substring(1);
		var sURLVariables = sPageURL.split('&');
		var datas = {};
		for (var i = 0; i < sURLVariables.length; i++)
		{
			var sParameterName = sURLVariables[i].split('=');
			datas[sParameterName[0]] = sParameterName[1];
			if (sParameterName[0] == sParam)
			{
				return sParameterName[1];
			}
		}
		return datas;
	}

	function validateParams(){
		var datas = getUrlParameter();
		if ( !Number(datas.channelID) || Number(datas.channelID)<1 ) {
			alert("Invalid Channel ID");
			return false;
		} else if ( datas.api_key && datas.api_key.length != 16 ) {
			alert("Invalid Read API Key");
			return false;
		}

		if (!"api_key" in datas){
			datas.api_key = "";
		}

		if ("results" in datas && Number(datas.results) ){
			config.results = Number(datas.results);
		}
		if ("days" in datas && Number(datas.days) ){
			config.days = Number(datas.days);
			delete config.results;
		}

		config.dynamic = ("dynamic" in datas && datas.dynamic=='true');

		return true;
	}

	function getLogNames(object){
		var names = [];
		if (object.channel){
			for (var i=1 ; i<=8 && fieldTxt+i in object.channel ; i++){
				channel.names.push( fieldTxt+i+ ':' + object.channel[fieldTxt+i] );
			}
		}
		return names;
	}

	function setFields(object){

		//changes params
		params.types = decodeURIComponent(params.types).split(',');
		if (params.fields){
			params.fields = decodeURIComponent(params.fields).split(',');
		}
		console.log(params.fields);

		channel.list = [];
		var fieldIndex = 0;
		if (object.channel){
			for (var i=1 ; i<=8 && fieldTxt+i in object.channel ; i++){

				if ( ( params.fields && params.fields.indexOf(fieldTxt+i)>-1) || !params.fields){
					channel.data[i] = {
						i			:	i,
						field	: fieldTxt+i,
						label	: object.channel[fieldTxt+i],
						name	: fieldTxt+i+ ':' +  object.channel[fieldTxt+i],
						type 	: ( fieldIndex in params.types ? params.types[fieldIndex] : '' )
					}

					channel.fields.push(fieldTxt+i);
					channel.list.push(i);
					channel.names.push( fieldTxt+i+ ':' +  object.channel[fieldTxt+i]);
					fieldIndex++;
				}

			}
		}
	}

	function getLogNameFromUrl() {
		return getUrlParameter("name").split(",");
	}

	function getReduce() {
		return getUrlParameter("average")=="true";
	}

	function parseDataLog(data){
		var date = new Date(data.datetime);
		var localdate = date-1*date.getTimezoneOffset()*60*1000;
		data.datetime = localdate;
		data.value    = Number(data.value);
		return data;
	}
	function plotRealTime(valueplot) {

    	document.getElementById("Energy.value").innerHTML = valueplot[0];
    	document.getElementById("Voltage.value").innerHTML = valueplot[1];
    	document.getElementById("Current.value").innerHTML = valueplot[2];
    	document.getElementById("Power.value").innerHTML = valueplot[3];
    	console.log(valueplot);

	}
	function handleLoaded(series){

		if (!config.dynamic) {
			return;
		}

		// push data every 5 seconds
		setInterval(function() {

			var option = {results : config.results, api_key : params.api_key, start:channel.updated_at}
			var fetch_url = serverURL+params.channelID+'/feeds.json?'+$.param(option);
			var valueplot = [];

			$.getJSON(fetch_url,    function (data) {
				
				if (data.feeds){
					$.each(data.feeds, function (index, record) {
							
						$.each(channel.list, function (i, name) {
								
							if(record.entry_id > channel.data[name].last_entry_id && record[fieldTxt+name]){
								var parsedData = parseDataLog({ datetime:record.created_at,value:record[fieldTxt+name] });
								series[i].addPoint([parsedData.datetime,parsedData.value], true, true);
								channel.data[name].last_entry_id = record.entry_id;
								valueplot[i] = parsedData.value.toFixed(2) ;
								plotRealTime(valueplot);

							};

							channel.data[name].updated_at = data.channel.updated_at;
							channel.updated_at = data.channel.updated_at;
							
							
						});

					});

				}

			});
		}, 5000);

	}
