var Palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    cobertura : {
        'min': 0,
        'max': 62,
        'palette': Palettes.get('classification8'),
        'format': 'png'
    },
    diferencia: {
        'min': 1,
        'max': 2,
        'palette': '#FFFFFF, #f6f4d2, #38a3a5',
        'format': 'png'
    }
}
Map.addLayer(ee.Image.constant(1), {min: 0, max: 1}, 'base');

var asset_ImBiomas = 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster';
var assetInputCol8 = 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1';
var assetIBGE =  'users/nerivaldogeo/uso_caatinga_ibge';

var lstCCIbge = [1 , 2, 3, 4, 5, 6, 9,10,11,12,13,14];
var lstCCMapb = [33,21,21,21,21, 3,10, 4,21,33,33,22];
var class_in =  [3,4,5,6,49,11,12,13,32,29,50,15,19,39,20,40,62,41,36,46,47,48,9,21,22,23,24,30,25,33,31];
var class_out = [3,4,3,6,3,11,12,12,12,29,12,21,21,21,21,21,21,21,21,21,21,21,21,21,25,25,25,25,25,33,33];

var atribMaps = [
    "USO2000","USO2010", "USO2012",
    "USO2014","USO2016", "USO2018", "USO2020"
];
var bandasMaps = [
    "classification_2000", "classification_2010", "classification_2012",
    "classification_2014","classification_2016", "classification_2018", 
    "classification_2020"
];
var lstYears = [
    "2000","2010", "2012",
    "2014","2016", "2018", 
    "2020"
];
var class_mask_final = null;
var shpIBGE = ee.FeatureCollection(assetIBGE);
print("show metadados ", shpIBGE.limit(3));
print("número de poligons ", shpIBGE.size());
var limitBioma = ee.Image(asset_ImBiomas).eq(5).selfMask();
var col8 = ee.Image(assetInputCol8).updateMask(limitBioma).selfMask();

var cc = 0;
var ImMapIBGE = null;
var lstClass = null;
atribMaps.forEach(function(atrib){
    if (atrib === "USO2000"){
        ImMapIBGE = shpIBGE.select([atrib]).reduceToImage([atrib], ee.Reducer.first());
        lstClass = shpIBGE.reduceColumns(ee.Reducer.toList(), [atrib]).get('list');
        lstClass = ee.List(lstClass).distinct();
        print("reducer ", lstClass);
        ImMapIBGE = ImMapIBGE.remap(lstCCIbge, lstCCMapb);
        ImMapIBGE = ImMapIBGE.select(["remapped"], [bandasMaps[cc]]);
        print(bandasMaps[cc], ImMapIBGE);
        
    }else{
        var mapTmp = shpIBGE.select([atrib]).reduceToImage([atrib], ee.Reducer.first());
        mapTmp = mapTmp.remap(lstCCIbge, lstCCMapb);
        mapTmp = mapTmp.select(["remapped"], [bandasMaps[cc]]);
        print(bandasMaps[cc], ImMapIBGE)
        ImMapIBGE = ImMapIBGE.addBands(mapTmp);
        lstClass = shpIBGE.reduceColumns(ee.Reducer.toList(), [atrib]).get('list');
        lstClass = ee.List(lstClass).distinct();
        print("reducer ", lstClass);
        
    }

    var mapCol8 = col8.select(bandasMaps[cc]).remap(class_in, class_out);
    var igual_Class = mapCol8.eq(ImMapIBGE.select(bandasMaps[cc])).remap([1],[2]);    
    var mask_final = limitBioma.blend(igual_Class);   

    if (atrib === "USO2000"){
        class_mask_final = mask_final.rename('Coinc_' + lstYears[cc]) 
    }else{
        class_mask_final = class_mask_final.addBands(mask_final.rename('Coinc_' + lstYears[cc])); 
    }

    Map.addLayer(mapCol8, vis.cobertura , "col8 " +  atrib, false);
    Map.addLayer(ImMapIBGE.select(bandasMaps[cc]), vis.cobertura , "IBGE " + atrib, false);
    Map.addLayer(mask_final, vis.diferencia, 'Coinc_'+ atrib, false)
    cc = cc + 1;
})



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

var areas = lstYears.map(
    function (year) {
        var image = class_mask_final.select('Coinc_' + year);

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
    description: 'areas-pixels-Coincidentes-UF-IBGE-MB-Caatinga',
    folder: driverFolder,
    fileNamePrefix: 'areas-pixels-Coincidentes-UF-IBGE-MB-Caatinga',
    fileFormat: 'CSV'
});
