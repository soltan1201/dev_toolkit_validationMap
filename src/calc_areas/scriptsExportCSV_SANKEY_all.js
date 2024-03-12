
var exportMap = false;
//var biomes = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-raster-41')
//var pampa = biomes.mask(biomes.eq(6))
var params = {
    asset_Col6 : 'projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1',
    asset_Col7 : 'projects/mapbiomas-workspace/public/collection7_1/mapbiomas_collection71_integration_v1',
    asset_Col8 : 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1',
    asset_biomas: 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster',
    asset_sphBiomas: "projects/mapbiomas-workspace/AUXILIAR/biomas-2019",
    assetOutput: 'projects/mapbiomas-workspace/AMOSTRAS/col8/CAATINGA/estabilidade_colecoes',
    lstClassMB:  [3, 4, 5, 49 ,9, 11, 12, 13, 29, 50, 15, 21, 23, 24, 25, 30, 31, 33, 39, 20, 40, 62, 41, 36, 46, 47, 48],
    lstClassRC:  [3, 4, 3,  3 ,9, 12, 12, 12, 12, 12, 21, 21, 22, 22, 22, 30, 33, 33, 21, 21, 21, 21, 21, 21, 21, 21, 21]
}

var biomes = ee.Image(params.asset_biomas).eq(5).selfMask();

var col71 = ee.Image(params.asset_Col7).updateMask(biomes);
var col80 = ee.Image(params.asset_Col8).updateMask(biomes);

 
Map.addLayer(biomes, {}, 'biomas', false)


var class_col71_remap = col71.select('classification_2021')
                            .remap(params.lstClassMB, params.lstClassRC).rename('col7')
var class_col80_remap = col80.select('classification_2021')
        .remap(params.lstClassMB, params.lstClassRC).rename('col8')
print('class_col71_remap', class_col71_remap);
print('class_col80_remap', class_col80_remap);

var Palettes = require('users/mapbiomas/modules:Palettes.js');
var palette = Palettes.get('classification8');
var vis = {
          'min': 0,
          'max': 62,
          'palette': palette,
          'format': 'png'
      };


var mudanca = class_col71_remap.multiply(100).add(class_col80_remap).rename('compara')
/*
var estavel = mudanca
        .remap([303,404,1212,1515,1818,909,2121,2222],
               [0,0,0,0,0,0,0,0])

mudanca = mudanca.blend(estavel).selfMask()
*/
Map.addLayer(mudanca,{},'mudanca',false)


mudanca = mudanca.addBands(class_col71_remap).addBands(class_col80_remap)
print('mudanca',mudanca)

var territory = biomes;
var mapbiomas = mudanca;

var scale = 30;
var years = ['2021']

var driverFolder = 'AREA-MAPBIOMAS_TOOLS';

var pixelArea = ee.Image.pixelArea().divide(10000);
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
//            var col7Id = classAndArea.get('col7');
//            var col8Id = classAndArea.get('col8');
            var area = classAndArea.get('sum');
            var tableColumns = ee.Feature(null)
                .set('territory', territory)
                .set('class', classId)
                .set('col7', ee.Number(classId).divide(100).byte())
                .set('col8', ee.Number(classId).mod(100).byte())
                .set('area', area);
            return tableColumns;
        }
    );

    return ee.FeatureCollection(ee.List(tableRows));
};

var calculateArea = function (image, territory, geometry) {
    var reducer = ee.Reducer.sum().group(1, 'class').group(1, 'territory');
    var territotiesData = pixelArea.addBands(territory).addBands(image)
        .reduceRegion({
            reducer: reducer,
            geometry: geometry,
            scale: scale,
            maxPixels: 1e12
        });
    territotiesData = ee.List(territotiesData.get('groups'));
    var areas = territotiesData.map(convert2table);
    areas = ee.FeatureCollection(areas).flatten();
    return areas;
};

var areas = years.map(
    function (year) {
        var image = mapbiomas.select('compara');
        var areas = calculateArea(image, territory, geometry);
        // set additional properties
//        areas = areas.map(
//            function (feature) {
//                return feature.set('year', year);
//            }
//        );
        return areas;
    }
);

areas = ee.FeatureCollection(areas).flatten();

Export.table.toDrive({
    collection: areas,
    description: 'sankey_2021_71e8',
    folder: driverFolder,
    fileNamePrefix: 'sankey_2021_71e8',
    fileFormat: 'CSV'
});
