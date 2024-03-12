

var Palettes = require('users/mapbiomas/modules:Palettes.js');
var palette = Palettes.get('classification8');
var vis = {
    cobertura : {
        'min': 0,
        'max': 62,
        'palette': palette,
        'format': 'png'
    },
    diferencia: {
        'min': 1,
        'max': 2,
        'palette': '#FFFFFF, #f6f4d2, #38a3a5, #672f28, #ea6a34, #a6bb3a',
        'format': 'png'
    }
};
Map.addLayer(ee.Image.constant(1), {min: 0, max: 1}, 'base');
var asset_ImBiomas = 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster';
var limitBioma = ee.Image(asset_ImBiomas).eq(5).selfMask();
Map.addLayer(limitBioma, {}, 'Bioma Raster', false)

// Define a list of years to export
var years = [
    '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992',
    '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000',
    '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008',
    '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016',
    '2017', '2018', '2019', '2020', '2021'
];

//var years = [2021]
var class_mask_final = null;
var class_in =  [3,4,5,6,49,11,12,13,32,29,50,15,19,39,20,40,62,41,36,46,47,48,9,21,22,23,24,30,25,33,31]
var class_out = [3,4,3,6,3,11,12,12,12,29,12,21,21,21,21,21,21,21,21,21,21,21,21,21,25,25,25,25,25,33,33]

years.forEach(function(year) {  
    // 4 - Classificação Final 
    var class_Final = ee.ImageCollection("projects/mapbiomas-workspace/AMOSTRAS/col7/CAATINGA/class_filtered_final").min()
                                    .mask(limitBioma).select('classification_' + year)
                                    .remap(class_in, class_out).rename('class')
    
    // 5 - Integração
    var class_col7 = ee.Image('projects/mapbiomas-workspace/public/collection7_1/mapbiomas_collection71_integration_v1')
                        .mask(limitBioma).select('classification_' + year)
                        .remap(class_in, class_out).rename('class')
    
    
    var igual_Class = class_col7.eq(class_Final).remap([1],[2]);    
    var mask_final = limitBioma.blend(igual_Class)
    
    Map.addLayer(class_Final, vis.cobertura, 'C7 Final '+ year, false)
    Map.addLayer(class_col7, vis.cobertura, 'Col 7.1 '+ year, false)
    Map.addLayer(mask_final, vis.diferencia, 'mask_final '+ year, false)
    

    if (year === '1985'){
        class_mask_final = mask_final.rename('mask_' + year) 
    }else{
        class_mask_final = class_mask_final.addBands(mask_final.rename('mask_' + year)); 
    }
  
})


var legend = ui.Panel({style: {position: 'middle-right', padding: '8px 15px'}});

var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {color: '#ffffff',
      backgroundColor: color,
      padding: '10px',
      margin: '0 0 4px 0',
    }
  });
  var description = ui.Label({
    value: name,
    style: {
      margin: '0px 0 4px 6px',
    }
  }); 
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')}
)};

var title = ui.Label({
  value: 'Legenda',
  style: {fontWeight: 'bold',
    fontSize: '16px',
    margin: '0px 0 4px 0px'}});

legend.add(title);
legend.add(makeRow('#f6f4d2','0 - Pixels com Mudanças'));
legend.add(makeRow('#a6bb3a','1 - Pixels Estaveis'));
Map.add(legend);

/**
 * @description
 *    calculate area
 * @author
 *    João Siqueira
 */


// Asset of regions for which you want to calculate statistics
var assetTerritories = "projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO8/VERSAO-1/state-raster";

// Change the scale if you need.
var scale = 30;

// Define a Google Drive output folder 
var driverFolder = 'AREA-EXPORT';


// Territory image
var territory = ee.Image(assetTerritories);

// LULC mapbiomas image
var mapbiomas = ee.Image(class_mask_final).selfMask();

// Image area in km2
var pixelArea = ee.Image.pixelArea().divide(1000000);

// Geometry to export
var geometry = mapbiomas.geometry();

/**
 * Convert a complex ob to feature collection
 * @param obj 
 */
var convert2table = function (obj) {

    obj = ee.Dictionary(obj);

    var territory = obj.get('territory');

    var classesAndAreas = ee.List(obj.get('groups'));

    var tableRows = classesAndAreas.map(
        function (classAndArea) {
            classAndArea = ee.Dictionary(classAndArea);

            var classId = classAndArea.get('class');
            var area = classAndArea.get('sum');

            var tableColumns = ee.Feature(null)
                .set('territory', territory)
                .set('class', classId)
                .set('area', area);

            return tableColumns;
        }
    );

    return ee.FeatureCollection(ee.List(tableRows));
};

/**
 * Calculate area crossing a cover map (deforestation, mapbiomas)
 * and a region map (states, biomes, municipalites)
 * @param image 
 * @param territory 
 * @param geometry
 */
var calculateArea = function (image, territory, geometry) {

    var reducer = ee.Reducer.sum().group(1, 'class').group(1, 'territory');

    var territotiesData = pixelArea.addBands(territory).addBands(image)
        .reduceRegion({
            reducer: reducer,
            geometry: geometry,
            scale: scale,
            maxPixels: 1e13
        });

    territotiesData = ee.List(territotiesData.get('groups'));

    var areas = territotiesData.map(convert2table);

    areas = ee.FeatureCollection(areas).flatten();

    return areas;
};

var areas = years.map(
    function (year) {
        var image = class_mask_final.select('mask_' + year);

        var areas = calculateArea(image, territory, geometry);

        // set additional properties
        areas = areas.map(
            function (feature) {
                return feature.set('year', year);
            }
        );

        return areas;
    }
);

areas = ee.FeatureCollection(areas).flatten();

Export.table.toDrive({
    collection: areas,
    description: 'areas-filtro-UF_Caat',
    folder: driverFolder,
    fileNamePrefix: 'areas-filtro-UF_Caat',
    fileFormat: 'CSV'
});
