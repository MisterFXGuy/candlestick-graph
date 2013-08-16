//OCandlestickChart. The O prefix is to avoid a naming conflict with google's CandlestickChart.
function OCandlestickChart(dashElement, chartElement, controlElement, candleOpts, dimensionOpts) {

    //Set up defaults
    candleOpts = candleOpts || {};
    dimensionOpts = dimensionOpts || { chart : {}, control : {} };

    var todayAtMidnight = new Date();
    todayAtMidnight.setHours(0,0,0);
    //Chart range variables
    this.granularity = candleOpts.granularity || 'M30';
    this.instrument = candleOpts.instrument || 'EUR_USD';
    this.startTime = candleOpts.startTime || todayAtMidnight;
    this.stopTime = candleOpts.stopTime || new Date();

    //Chart controls
    this.dash = new google.visualization.Dashboard(dashElement);

    this.chartOpts = {
        'chartArea' :  {'width' : dimensionOpts.chart.width || '80%', 'height' : dimensionOpts.chart.height || '80%' },
    };    

    this.chart = new google.visualization.ChartWrapper({
        'chartType' : 'CandlestickChart',
        'containerId' : chartElement,
        
    });

    this.controlOpts = {
        'filterColumnIndex': 0,
        'ui': {
            'chartType': 'LineChart',
            'chartOptions': {
                'chartArea': {'width': dimensionOpts.control.width || '80%', 'height' : dimensionOpts.control.height},
                'hAxis': {'baselineColor': 'none'}
            },
            'chartView': {
                'columns': [0, 4]
            },
        }
    };

    this.control = new google.visualization.ControlWrapper({
        'controlType' : 'ChartRangeFilter',
        'containerId' : controlElement,
    });

    this.dash.bind(this.control, this.chart);

}

OCandlestickChart.prototype.render = function() {

    var self = this;
    OANDA.rate.history(this.instrument, { 'start' : this.startTime.toISOString(), 
                                          'stop'  : this.stopTime.toISOString(),
                                          'candleFormat' : 'midpoint', 'granularity' : this.granularity }, function(response) {
        if(response.error) {
            console.log(response.error);
            return;
        }

        var data = new google.visualization.DataTable();
        data.addColumn('datetime', 'Time');
        data.addColumn('number', 'lowMid');
        data.addColumn('number', 'closeMid');
        data.addColumn('number', 'openMid');
        data.addColumn('number', 'highMid');
        

        for(var i = 0 ; i < response.candles.length; i++) {
            var candle = response.candles[i];
            data.addRow([new Date(candle.time), candle.lowMid, candle.closeMid, candle.openMid, candle.highMid]);
        }
        
        //Set up extra chart options.
        self.chartOpts.title = self.instrument + " Candlesticks";
        self.chartOpts.legend = { 'position' : 'none' };
        self.chartOpts.view = {
            'columns' : [{
                'calc' : function(dataTable, rowIndex) {
                    return dataTable.getFormattedValue(rowIndex, 0);
                },
                'type' : 'string',
            }, 1, 2, 3, 4]
        };
        //Set up extra control options:
        self.controlOpts.ui.minRangeSize = OCandlestickChart.util.granularityMap[self.granularity] * 1000;
        //Reset the state of the control so the sliders stay in bounds.
        self.control.setState({ 'start' : data.getColumnRange(0).min, 'end' :  data.getColumnRange(0).max});

        self.chart.setOptions(self.chartOpts);
        self.control.setOptions(self.controlOpts);
        

        self.dash.draw(data);
    });
};

OCandlestickChart.prototype.reset = function() {

    var controlHandle = this.control.getControl();
    var chartHandle = this.chart.getChart();
    controlHandle.resetControl();
    chartHandle.clearChart();
};

OCandlestickChart.prototype.setGranularity = function(granularity) {

    //TODO: Validation.
    this.granularity = granularity;
    this.reset();
    this.render();
};

OCandlestickChart.prototype.setInstrument = function(instrument) {

    //TODO: Validation?
    this.instrument = instrument;
    this.reset();
    this.render();
};

OCandlestickChart.prototype.setStartTime = function(params) {
    
    //TODO:Validation.
    this.startTime = new Date(params.year  || this.startTime.getFullYear(), 
                              params.month || this.startTime.getMonth(), 
                              params.day   || this.startTime.getDate(), 
                              0, 0, 0);
    this.reset();
    this.render();
};

OCandlestickChart.util = {};

OCandlestickChart.util.getDaysInMonth = function(year, month) {
    var start = new Date(year, month, 1);
    var end = new Date(year, parseInt(month, 10) + 1, 1);
    return (end - start)/(1000 * 60 * 60 * 24);
};

//Maps granularity values to seconds.
OCandlestickChart.util.granularityMap = 
{ 'S5'  : 5, 
  'S10' : 10, 
  'S15' : 15, 
  'S30' : 30, 
  'M1'  : 60, 
  'M2'  : 120, 
  'M3'  : 180,
  'M5'  : 300, 
  'M10' : 600,
  'M15' : 900, 
  'M30' : 1800, 
  'H1'  : 3600, 
  'H2'  : 7200, 
  'H3'  : 10800, 
  'H4'  : 14400, 
  'H6'  : 21600, 
  'H8'  : 28800,
  'H12' : 43200,
  'D'   : 86400, 
  'W'   : 604800, 
  'M'   : -1 /*Let user calculate for now.*/
};

//List of possible granularity values.
OCandlestickChart.util.granularities = Object.keys(OCandlestickChart.util.granularityMap);
