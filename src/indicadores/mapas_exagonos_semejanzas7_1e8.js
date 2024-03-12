/**
// --- --- --- COMPARISON WITH REFERENCE DATA
 * Obective: To generate a regular hexagonal grid with unique ID per cell
 * and to associate spatial statistics to each cell in the grid.
 * 
 * Intention: To computs differences in native vegetation area per cell (Collection 8 versus Collection 7.1, 2021) 
 * 
 * Development: Instituto de Pesquisa Ambiental da Amazônia - IPAM
 *
 * 
 * contact: barbara.silva@ipam.org.br
 *
*/
//https://code.earthengine.google.com/6bcaf59277adc0a235627e83603bf994
// --- --- --- Gena libraries are super useful!
var palettesGena = require('users/gena/packages:palettes');
var palettes = require('users/mapbiomas/modules:Palettes.js');
var style = require('users/gena/packages:style');
var utils = require('users/gena/packages:utils');

// add a gradient bar
var min = -12000;
var max = 6000;
var minActual = min/1000;
var maxActual = max/1000;
// --- --- --- Visualization params
var labels = ee.List.sequence(minActual, maxActual, (maxActual-minActual)/5);
var vis = {
    visexagono: {
        max: max,
        min: min,
        palette: ["9b2226","ae2012","ee9b00","fbf8ef","94d2bd","005f73","092d34"]
    },

    colecao: { 
        'min': 0, 
        'max': 62,  
        'palette': palettes.get('classification8')
    },
    visGradiente : {
          min: minActual, 
          max: maxActual, 
          palette: ["9b2226","ae2012","ee9b00","fbf8ef","94d2bd","005f73","092d34"], 
          labels: labels, 
          format: '%.1f', 
          text: textProperties
      }
};
// --- --- --- Caaatinga --------------------------
var showThumbnails = false;
var bioma =  'Caatinga'; 
var year = '1986';
var asset_ImBiomas = 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster';
var assetInputCol71 = 'projects/mapbiomas-workspace/public/collection7_1/mapbiomas_collection71_integration_v1';
var assetInputCol8 = 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1';

var limitBioma = ee.Image(asset_ImBiomas).eq(5).selfMask();
// --- --- --- MapBiomas Collection 8

var col8 = ee.Image(assetInputCol8)
                .select("classification_" + year)
                .updateMask(limitBioma).selfMask();

// --- --- --- MapBiomas Collection 7.1 
var col71 = ee.Image(assetInputCol71)
            .select("classification_" + year)
            .updateMask(limitBioma).selfMask();
            
// --- --- --- Pixel area converted from m² to km²            
var pixelArea = ee.Image.pixelArea().divide(1000000)
//pixel area as a percentage of total cell area (1624 km² per cell)              
                  .divide(1624).multiply(100)
//temporary conversion to avoid using .double()
                  .multiply(1000).round().int();


// --- --- --- Reclassifies LULC classes to binary map with native vegetation classes only
var natC71 = col71.remap([3, 4, 11, 12, 29], [1,1,1,1,1], 0);
var natC8 = col8.remap([3, 4, 11, 12, 29],  [1,1,1,1,1], 0);

// 0 = no change between data; +1 = colecao_80 (blue) ; -1 = col71 (red)
var difNat = natC8.subtract(natC71);

// --- --- --- HexGrid functions
//This function was originally created by Noel Gorelick
//avaiable: https://code.earthengine.google.com/dd84895c06eeed4f2007d682a98e9695

var hexGrid = function(proj, diameter) {
    var size = ee.Number(diameter).divide(Math.sqrt(3)); // Distance from center to vertex
    
    var coords = ee.Image.pixelCoordinates(proj).updateMask(limitBioma);
    var vals = {
        // Switch x and y here to get flat top instead of pointy top hexagons.
        x: coords.select("x"),
        u: coords.select("x").divide(diameter),  // term 1
        v: coords.select("y").divide(size),      // term 2
        r: ee.Number(diameter).divide(2),
    };
    var i = ee.Image().expression("floor((floor(u - v) + floor(x / r))/3)", vals);
    var j = ee.Image().expression("floor((floor(u + v) + floor(v - u))/3)", vals);
    
    // Turn the hex coordinates into a single "ID" number.
    var cells = i.long().leftShift(32).add(j.long()).rename("hexgrid");
    return cells;
};

//This is an adaptation of the original function convert2table by Joao Silveira
//convert a complex object to a simple feature collection
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
                                    .set('class_id', classId)
                                    .set('area', area);                    
                return tableColumns;
            }
        );    
        return ee.FeatureCollection(ee.List(tableRows));
};

//This is an adaptation of the original function calculateArea by Joao Silveira
//parameter scale was set to 100 instead of 30 because of "Computation timed out" error
var calculateArea = function (raster, hexes, geometry) {
    var territotiesData = pixelArea.addBands(hexes).addBands(raster)
                            .reduceRegion({
                                reducer: ee.Reducer.sum().group(1, 'class').group(1, 'territory'),
                                geometry: geometry,
                                scale: 100,
                                maxPixels: 1e12
                            });
        
    territotiesData = ee.List(territotiesData.get('groups'));
    var areas = territotiesData.map(convert2table);
    areas = ee.FeatureCollection(areas);
    return areas;
};


// --- --- --- Computing loss/gain in Natural class as a percentage of total cell area
pixelArea = pixelArea.multiply(difNat);

//Hexagons with 25km sides and default projection WGS84
var hexes = hexGrid(ee.Projection("EPSG:3857"), 25000).rename('territory');

//The raster originally denoting direction of change (gain/loss; difNat)
//does not need to have negative values anymore as losses are already represented as negative values of area in pixelArea
var areas = calculateArea(difNat.neq(0).selfMask(), hexes, geometry);
areas = ee.FeatureCollection(areas).flatten();

var ids = areas.reduceColumns(ee.Reducer.toList(),["territory"]);
ids = ee.List(ids.get("list"));
//print("Check if cell IDs are unique", ids.slice(0,13));
 
var areas = areas.reduceColumns(ee.Reducer.toList(),["area"]);
areas = ee.List(areas.get("list")).map(
                function(value){
                    return ee.Number(value);
                });

    //print("Check if areas make sense", areas.slice(0,13));

//Using remap to change cell IDs to cell % area change per cell (transformed to avoid .double())
var result = hexes.remap(ids,areas);
result = ee.Image(result).unmask(0).updateMask(limitBioma).int();


Map.addLayer(ee.Image.constant(1), {min: 0, max: 1}, 'base');
Map.addLayer(col8, vis.colecao, "coleção 8 " + year);
Map.addLayer(col71, vis.colecao, "coleção 7.1 " + year);
Map.addLayer (result, {}, 'result')
//print(result);


// Plotting a frequency histogram to visualize distribution and getting reasonable values for
var hist = ui.Chart.image.histogram({
                image:  result.divide(1000), 
                region: geometry, 
                scale:5000,
                maxBuckets:100, 
                maxPixels: 1e12
            })
            .setOptions({});
print("Distribution of percentages of difference", hist);




// gradient bar properties
var textProperties = {fontSize:14, textColor: '000000', outlineColor: 'ffffff',
                      outlineWidth: 2, outlineOpacity: 0.6};

var gradientBar = style.GradientBar.draw(geometryGradientBar, vis.visGradiente);

var gradientBarRGB = gradientBar.visualize();

var mapToPlot = ee.Image().blend(result.visualize(vis.visexagono)).blend(gradientBarRGB);
Map.addLayer(mapToPlot, {}, 'concordancia');

// Create an empty image with backgorund color
var emptyImage = ee.Image(0).visualize({ palette: "#F6F6F6" });

var compositeImage = emptyImage.blend(mapToPlot);
if (showThumbnails){
  var imageToPrint = ui.Thumbnail({
      image: compositeImage.unmask(),
      params: {dimensions: 540, region: geometry }
  });
  
  print(imageToPrint);

}