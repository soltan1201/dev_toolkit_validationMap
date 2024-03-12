/**
 * import modules 
 */
var Legend = require('users/joaovsiqueira1/packages:Legend.js');
var ColorRamp = require('users/joaovsiqueira1/packages:ColorRamp.js');
/**
 * define parameters 
 */
//Palette
var Palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    cobert: {
          'min': 0,
          'max': 62,
          'palette': Palettes.get('classification8'),
          'format': 'png'
    },
    background: {"opacity":1,"bands":["constant"],"palette":["ffffff"]},

}

/**
 * visualization
 */
var visParams = {
    'number_of_changes': {
        'min': 0,
        'max': 7,
        'palette': [
            "#C8C8C8",
            "#FED266",
            "#FBA713",
            "#cb701b",
            "#a95512",
            "#662000",
            "#cb181d"
        ],
        'format': 'png'
    },
    'number_of_classes': {
        'min': 1,
        'max': 5,
        'palette': [
            "#C8C8C8",
            "#AE78B2",
            "#772D8F",
            "#4C226A",
            "#22053A"
        ],
        'format': 'png'
    },
    'stable': {
        'min': 0,
        'max': 49,
        'palette': Palettes.get('classification6'),
        'format': 'png'
    },
    'trajectories': {
        'min': 1,
        'max': 8,
        'palette': [
            "#c4c3c0", //[1] Ab-Ab Ch=0
            "#666666", //[2] Pr-Pr Ch=0
            "#020e7a", //[3] Ab-Pr Ch=1
            "#941004", //[4] Pr-Ab Ch=1
            "#14a5e3", //[5] Ab-Pr Ch>2
            "#f5261b", //[6] Pr-Ab Ch>2
            "#9c931f", //[7] Ab-Ab Ch>1
            "#ffff00", //[8] Pr-Pr Ch>1

            // "#c8c8c8", //[1] Ab-Ab Ch=0
            // "#999999", //[2] Pr-Pr Ch=0
            // "#00598d", //[3] Ab-Pr Ch=1
            // "#9d006d", //[4] Pr-Ab Ch=1
            // "#02d6f2", //[5] Ab-Pr Ch>2
            // "#ff4dd5", //[6] Pr-Ab Ch>2
            // "#f58700", //[7] Ab-Ab Ch>1
            // "#ffbf70", //[8] Pr-Pr Ch>1
        ],
        'format': 'png'
    }
};

param = {
    'asset_Col8' : 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1',
    'asset_biomas': 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster',
    'asset_sphBiomas': "projects/mapbiomas-workspace/AUXILIAR/biomas-2019",
    'assetOutput': 'projects/mapbiomas-workspace/AMOSTRAS/col8/CAATINGA/aggrements',
    'class_in': [3,4,5,6,49,11,12,13,32,29,50,15,19,39,20,40,62,41,36,46,47,48,9,21,22,23,24,30,25,33,31],
    'class_out_n1': [1, 1, 1, 1, 1,10,10,10,10,10,10,14,14,14,14,14,14,14,14,14,14,14,14,22,22,22,22,26,26],
    'class_out_n2': [3, 4, 5, 6,49,11,12,32,29,50,13,15,18,18,18,18,18,18,18,18,18, 9,21,23,24,30,25,33,31],
    'class_out_n3': [3, 4, 5, 6,49,11,12,32,29,50,13,15,19,19,19,19,19,36,36,36,36, 9,21,23,24,30,25,33,31],


}
var years = [
    '1985','1986','1987','1988','1989','1990','1991','1992','1993','1994',
    '1995','1996','1997','1998','1999','2000','2001','2002','2003','2004',
    '2005','2006','2007','2008','2009','2010','2011','2012','2013','2014',
    '2015','2016','2017','2018','2019','2020','2021','2022'
];


var bioma =  'Caatinga'; 
var biomes_caat = ee.Image(params['asset_biomas']).eq(5).selfMask();
var new_dataCol8 = ee.Image(param.asset_Col8).updateMask(biomes_caat);           
var pixelArea = ee.Image.pixelArea().divide(1000000).updateMask(biomes_caat);
var white_background = ee.Image(0)
Map.addLayer(white_background, vis.background, 'white_background', true);

// the analysis runs only for the groups below
var classIds = [[3],[12],[24]];
var legend_level = 2   // 1, 2, 3, 4
var reclass = [[], []];
if (legend_level == 1){
    reclass = [param.class_in,  param.class_out_n1]
} else if (legend_level == 2){
    reclass = [param.class_in,  param.class_out_n2]
} else if (legend_level == 3){
    reclass = [param.class_in,  param.class_out_n3]
} else {
    reclass = [param.class_in,  param.class_in]
}
var new_data_reclass = null;
var periods = [[1985, 2022]];

years.forEach(function(year){
    var bnd_class = 'classification_'+ year;
    var image = new_dataCol8.select(bnd_class).remap(reclass[0],reclass[1]);
    if (year === '1985'){ 
        new_data_reclass = image.rename(bnd_class); 
    } else {
        new_data_reclass = new_data_reclass.addBands(image.rename(bnd_class)); 
    }

    print("dado de image reclass ", new_data_reclass);
    Map.addLayer(new_data_reclass.select(bnd_class), vis.cobert, 'new_data_reclass '+ year, true);
})




// defined user functions
/**
 * 
 * @param {*} image 
 * @returns 
 */
var calculateNumberOfClasses = function (image) {
    var nClasses = image.reduce(ee.Reducer.countDistinctNonNull());
    return nClasses.rename('number_of_classes');
};

/**
 * 
 * @param {*} image 
 * @returns 
 */
var calculateNumberOfChanges = function (image) {
    var nChanges = image.reduce(ee.Reducer.countRuns()).subtract(1)
    return nChanges.rename('number_of_changes');
};


/**
 * 
 */
// all lulc images
var image = new_data_reclass;

// for each period in list
periods.forEach(
    function (period) {
        var count = period[1] - period[0] + 1;

        var bands = Array.apply(null, Array(count)).map(
            function (_, i) {
                return 'classification_' + (period[0] + i).toString();
            }
        );

        // lulc images 
        var imagePeriod = image.select(bands);

        // number of classes
        var nClasses = calculateNumberOfClasses(imagePeriod);

        // incidents
        var nChanges = calculateNumberOfChanges(imagePeriod);

        // stable
        var stable = imagePeriod.select(0).mask(nClasses.eq(1));

        Map.addLayer(nClasses, visParams.number_of_classes, period + ' number of classes ', false);
        Map.addLayer(nChanges, visParams.number_of_changes, period + ' number of changes ', false);
        Map.addLayer(stable, visParams.stable, period + ' stable ', false);

        // trajectories
        classIds.forEach(
            function (classList) {
                var classIdsMask = ee.List(bands).iterate(
                    function (band, allMasks) {
                        var mask = imagePeriod.select([band])
                            .remap(classList, ee.List.repeat(1, classList.length), 0);
                        return ee.Image(allMasks).addBands(mask);
                    },
                    ee.Image().select()
                );

                classIdsMask = ee.Image(classIdsMask).rename(bands);

                // nChanges in classList
                var nChanges = calculateNumberOfChanges(classIdsMask);

                // nChanges rules in the analisys
                var nChangesEq0 = nChanges.eq(0); //  no change
                var nChangesEq1 = nChanges.eq(1); //  1 change
                var nChangesGt1 = nChanges.gt(1); // >1 changes
                // var nChangesGt2 = nChanges.gt(2); // >2 changes

                // lulc classIds masks for the first year and last year 
                var t1 = classIdsMask.select(bands[0]);
                var tn = classIdsMask.select(bands[bands.length - 1]);

                // categories
                var abAbCh0 = t1.eq(0).and(nChangesEq0);
                var prPrCh0 = t1.eq(1).and(nChangesEq0);
                var abPrCh1 = t1.eq(0).and(nChangesEq1).and(tn.eq(1));
                var prAbCh1 = t1.eq(1).and(nChangesEq1).and(tn.eq(0));
                var abPrCh2 = t1.eq(0).and(nChangesGt1).and(tn.eq(1));
                var prAbCh2 = t1.eq(1).and(nChangesGt1).and(tn.eq(0));
                var abAbCh1 = t1.eq(0).and(nChangesGt1).and(tn.eq(0));
                var prPrCh1 = t1.eq(1).and(nChangesGt1).and(tn.eq(1));

                // (*) the classes Ab-Ab and Pr-Pr the classes were joined
                var trajectories = ee.Image(0)
                                    .where(abAbCh0, 1)  //[1] Ab-Ab Ch=0
                                    .where(prPrCh0, 2)  //[2] Pr-Pr Ch=0
                                    .where(abPrCh1, 3)  //[3] Ab-Pr Ch=1
                                    .where(prAbCh1, 4)  //[4] Pr-Ab Ch=1
                                    .where(abPrCh2, 5)  //[5] Ab-Pr Ch>2
                                    .where(prAbCh2, 6)  //[6] Pr-Ab Ch>2
                                    .where(abAbCh1, 7)  //[7] Ab-Ab Ch>1 (*)
                                    .where(prPrCh1, 7); //[8] Pr-Pr Ch>1 (*)

                trajectories = trajectories.rename('trajectories').selfMask();

                Map.addLayer(trajectories, visParams.trajectories, period + ' trajectories ' + classList, false);

            }
        );
    }
);

var incidentsLegend = Legend.getLegend(
    {
        "title": "Number of changes",
        "layers": [
            ["#C8C8C8", 0, " no Change"],
            ["#FED266", 1, " 1 Change"],
            ["#FBA713", 2, " 2 Changes"],
            ["#cb701b", 3, " 3 Changes"],
            ["#a95512", 4, " 4 Changes"],
            ["#662000", 5, " 5 Changes"],
            ["#cb181d", 6, ">6 Changes"],
        ],
        "style": {
            "backgroundColor": "#ffffff",
            "color": "#212121",
            "fontSize": '12px',
            "iconSize": '14px',
        },
        "orientation": "vertical"
    }
);

var statesLegend = Legend.getLegend(
    {
        "title": "Number of classes",
        "layers": [
            ["#C8C8C8", 1, " 1 Classe"],
            ["#AE78B2", 2, " 2 Classes"],
            ["#772D8F", 3, " 3 Classes"],
            ["#4C226A", 4, " 4 Classes"],
            ["#22053A", 5, ">5 Classes"],
        ],
        "style": {
            "backgroundColor": "#ffffff",
            "color": "#212121",
            "fontSize": '12px',
            "iconSize": '14px',
        },
        "orientation": "vertical"
    }
);

var trajectoriesLegend = Legend.getLegend(
    {
        "title": "Trajectories",
        "layers": [
            ["#c4c3c0", 1, "Ab-Ab Ch=0"],
            ["#666666", 2, "Pr-Pr Ch=0"],
            ["#020e7a", 3, "Ab-Pr Ch=1"],
            ["#941004", 4, "Pr-Ab Ch=1"],
            ["#14a5e3", 5, "Ab-Pr Ch>2"],
            ["#f5261b", 6, "Pr-Ab Ch>2"],
            ["#9c931f", 7, "Ab-Ab or Pr-Pr Ch>1"],
            // ["#ffff00", 8, "Pr-Pr Ch>1"],
            // ["#c8c8c8", 1, "Ab-Ab Ch=0"],
            // ["#999999", 2, "Pr-Pr Ch=0"],
            // ["#00598d", 3, "Ab-Pr Ch=1"],
            // ["#9d006d", 4, "Pr-Ab Ch=1"],
            // ["#02d6f2", 5, "Ab-Pr Ch>2"],
            // ["#ff4dd5", 6, "Pr-Ab Ch>2"],
            // ["#f58700", 7, "Ab-Ab Ch>1"],
            // ["#ffbf70", 8, "Pr-Pr Ch>1"],
        ],
        "style": {
            "backgroundColor": "#ffffff",
            "color": "#212121",
            "fontSize": '12px',
            "iconSize": '14px',
        },
        "orientation": "vertical"
    }
);

var panel = ui.Panel({
    widgets: [
        incidentsLegend,
        statesLegend,
        trajectoriesLegend
    ],
    style: {
        position: 'bottom-left'
    }
});

Map.add(panel);


var palette = require('users/mapbiomas/modules:Palettes.js').get('classification8');

/**
 * 
 */
var Chart = {

    options: {
        'title': 'Inspector',
        'legend': 'none',
        'chartArea': {
            left: 30,
            right: 2,
        },
        'titleTextStyle': {
            color: '#ffffff',
            fontSize: 10,
            bold: true,
            italic: false
        },
        'tooltip': {
            textStyle: {
                fontSize: 10,
            },
            // isHtml: true
        },
        'backgroundColor': '#21242E',
        'pointSize': 6,
        'crosshair': {
            trigger: 'both',
            orientation: 'vertical',
            focused: {
                color: '#dddddd'
            }
        },
        'hAxis': {
            // title: 'Date', //muda isso aqui
            slantedTextAngle: 90,
            slantedText: true,
            textStyle: {
                color: '#ffffff',
                fontSize: 8,
                fontName: 'Arial',
                bold: false,
                italic: false
            },
            titleTextStyle: {
                color: '#ffffff',
                fontSize: 10,
                fontName: 'Arial',
                bold: true,
                italic: false
            },
            viewWindow: {
                max: 37,
                min: 0
            },
            gridlines: {
                color: '#21242E',
                interval: 1
            },
            minorGridlines: {
                color: '#21242E'
            }
        },
        'vAxis': {
            title: 'Class', // muda isso aqui
            textStyle: {
                color: '#ffffff',
                fontSize: 10,
                bold: false,
                italic: false
            },
            titleTextStyle: {
                color: '#ffffff',
                fontSize: 10,
                bold: false,
                italic: false
            },
            viewWindow: {
                max: 50,
                min: 0
            },
            gridlines: {
                color: '#21242E',
                interval: 2
            },
            minorGridlines: {
                color: '#21242E'
            }
        },
        'lineWidth': 0,
        // 'width': '300px',
        'height': '150px',
        'margin': '0px 0px 0px 0px',
        'series': {
            0: { color: '#21242E' }
        },

    },

    assets: {
        image: null,
        imagef: null
    },

    data: {
        image: null,
        imagef: null,
        point: null
    },

    legend: {
        0: { 'color': palette[0], 'name': 'Ausência de dados' },
        3: { 'color': palette[3], 'name': 'Formação Florestal' },
        4: { 'color': palette[4], 'name': 'Formação Savânica' },
        5: { 'color': palette[5], 'name': 'Mangue' },
        6: { 'color': palette[6], 'name': 'Floresta Alagável' },
        49: { 'color': palette[49], 'name': 'Restinga Florestal' },
        11: { 'color': palette[11], 'name': 'Área Úmida Natural não Florestal' },
        12: { 'color': palette[12], 'name': 'Formação Campestre' },
        32: { 'color': palette[32], 'name': 'Apicum' },
        29: { 'color': palette[29], 'name': 'Afloramento Rochoso' },
        50: { 'color': palette[50], 'name': 'Restinga Herbácea/Arbustiva' },
        13: { 'color': palette[13], 'name': 'Outra Formação não Florestal' },
        18: { 'color': palette[18], 'name': 'Agricultura' },
        39: { 'color': palette[39], 'name': 'Soja' },
        20: { 'color': palette[20], 'name': 'Cana' },
        40: { 'color': palette[40], 'name': 'Arroz' },
        62: { 'color': palette[62], 'name': 'Algodão' },
        41: { 'color': palette[41], 'name': 'Outras Lavouras Temporárias' },
        46: { 'color': palette[46], 'name': 'Café' },
        47: { 'color': palette[47], 'name': 'Citrus' },
        35: { 'color': palette[35], 'name': 'Plantação de Palma' },
        48: { 'color': palette[48], 'name': 'Outras Lavaouras Perenes' },
        9: { 'color': palette[9], 'name': 'Silvicultura' },
        15: { 'color': palette[15], 'name': 'Pastagem' },
        21: { 'color': palette[21], 'name': 'Mosaico de Usos,' },
        22: { 'color': palette[22], 'name': 'Área não Vegetada' },
        23: { 'color': palette[23], 'name': 'Praia e Duna' },
        24: { 'color': palette[24], 'name': 'Infraestrutura Urbana' },
        30: { 'color': palette[30], 'name': 'Mineração' },
        25: { 'color': palette[25], 'name': 'Outra Área não Vegetada' },
        33: { 'color': palette[33], 'name': 'Rio, Lago e Oceano' },
        31: { 'color': palette[31], 'name': 'Aquicultura' },

    },

    loadData: function () {
        Chart.data.image = image;
//        Chart.data.imagef = count_nat;
    },

    init: function () {
        Chart.loadData();
        Chart.ui.init();
    },

    getSamplePoint: function (image, points) {

        var sample = image.sampleRegions({
            'collection': points,
            'scale': 30,
            'geometries': true
        });

        return sample;
    },

    ui: {

        init: function () {

            Chart.ui.form.init();
            Chart.ui.activateMapOnClick();

        },

        activateMapOnClick: function () {

            Map.onClick(
                function (coords) {
                    var point = ee.Geometry.Point(coords.lon, coords.lat);

                    var bandNames = Chart.data.image.bandNames();

                    var newBandNames = bandNames.map(
                        function (bandName) {
                            var name = ee.String(ee.List(ee.String(bandName).split('_')).get(1));

                            return name;
                        }
                    );

                    var image = Chart.data.image.select(bandNames, newBandNames);
//                    var imagef = Chart.data.imagef.select(bandNames, newBandNames);

//                    Chart.ui.inspect(Chart.ui.form.chartInspectorf, imagef, point, 1.0);
                    Chart.ui.inspect(Chart.ui.form.chartInspector, image, point, 1.0);
                }
            );

            Map.style().set('cursor', 'crosshair');
        },

        refreshGraph: function (chart, sample, opacity) {

            sample.evaluate(
                function (featureCollection) {

                    if (featureCollection !== null) {
                        // print(featureCollection.features);

                        var pixels = featureCollection.features.map(
                            function (features) {
                                return features.properties;
                            }
                        );

                        var bands = Object.getOwnPropertyNames(pixels[0]);

                        // Add class value
                        var dataTable = bands.map(
                            function (band) {
                                var value = pixels.map(
                                    function (pixel) {
                                        return pixel[band];
                                    }
                                );

                                return [band].concat(value);
                            }
                        );

                        // Add point style and tooltip
                        dataTable = dataTable.map(
                            function (point) {
                                var color = Chart.legend[point[1]].color;
                                var name = Chart.legend[point[1]].name;
                                var value = String(point[1]);

                                var style = 'point {size: 4; fill-color: ' + color + '; opacity: ' + opacity + '}';
                                var tooltip = 'year: ' + point[0] + ', class: [' + value + '] ' + name;

                                return point.concat(style).concat(tooltip);
                            }
                        );

                        var headers = [
                            'serie',
                            'id',
                            { 'type': 'string', 'role': 'style' },
                            { 'type': 'string', 'role': 'tooltip' }
                        ];

                        dataTable = [headers].concat(dataTable);

                        chart.setDataTable(dataTable);

                    }
                }
            );
        },

        refreshMap: function () {

            var pointLayer = Map.layers().filter(
                function (layer) {
                    return layer.get('name') === 'Point';
                }
            );

            if (pointLayer.length > 0) {
                Map.remove(pointLayer[0]);
                Map.addLayer(Chart.data.point, { color: 'red' }, 'Point');
            } else {
                Map.addLayer(Chart.data.point, { color: 'red' }, 'Point');
            }

        },

        inspect: function (chart, image, point, opacity) {

            // aqui pode fazer outras coisas além de atualizar o gráfico
            Chart.data.point = Chart.getSamplePoint(image, ee.FeatureCollection(point));

            Chart.ui.refreshMap(Chart.data.point);
            Chart.ui.refreshGraph(chart, Chart.data.point, opacity);

        },

        form: {

            init: function () {

                Chart.ui.form.panelChart.add(Chart.ui.form.chartInspector);
//                Chart.ui.form.panelChart.add(Chart.ui.form.chartInspectorf);

                Chart.options.title = 'Integrated';
                Chart.ui.form.chartInspector.setOptions(Chart.options);

//                Chart.options.title = 'Integrated - ft';
//                Chart.ui.form.chartInspectorf.setOptions(Chart.options);

                // Chart.ui.form.chartInspector.onClick(
                //     function (xValue, yValue, seriesName) {
                //         print(xValue, yValue, seriesName);
                //     }
                // );

                Map.add(Chart.ui.form.panelChart);
            },

            panelChart: ui.Panel({
                'layout': ui.Panel.Layout.flow('vertical'),
                'style': {
                    'width': '450px',
                    // 'height': '200px',
                    'position': 'bottom-right',
                    'margin': '0px 0px 0px 0px',
                    'padding': '0px',
                    'backgroundColor': '#21242E'
                },
            }),

            chartInspector: ui.Chart([
                ['Serie', ''],
                ['', -1000], // número menor que o mínimo para não aparecer no gráfico na inicialização
            ]),

//            chartInspectorf: ui.Chart([
//                ['Serie', ''],
//                ['', -1000], // número menor que o mínimo para não aparecer no gráfico na inicialização
//            ])
        }
    }
};

Chart.init();