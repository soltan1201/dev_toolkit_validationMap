//var ano = 2021

// AZUL somente na col 8
// VERMELHO somente col7.1
// CINZA mapeado nos 2 

// listar anos para poerformar a análise
var years = [2021];



var Palettes = require('users/mapbiomas/modules:Palettes.js');
var palette = Palettes.get('classification8');
var vis = {
    colecao: {
          'min': 0,
          'max': 62,
          'palette': palette,
          'format': 'png'
    },
    aggrement: {
        min:1, max:3,
        palette: ['gray', 'blue', 'red']
    }
};
//exporta a imagem classificada para o asset
var processoExportarImage = function (imageMap, nameB, idAssetF, regionB){
    var idasset =  idAssetF + "/" + nameB
    print("saving ")
    var optExp = {
            'image': imageMap, 
            'description': nameB, 
            'assetId': idasset, 
            'region': regionB, //['coordinates']
            'scale': 30, 
            'maxPixels': 1e13,
            "pyramidingPolicy":{".default": "mode"}
        }
        
    Export.image.toAsset(optExp)
    print("salvando mapa ... " + nameB + "..!");
};

var params = {
    asset_Col6 : 'projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1',
    asset_Col7 : 'projects/mapbiomas-workspace/public/collection7_1/mapbiomas_collection71_integration_v1',
    asset_Col8 : 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1',
    asset_biomas: 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster',
    asset_sphBiomas: "projects/mapbiomas-workspace/AUXILIAR/biomas-2019",
    assetOutput: 'projects/mapbiomas-workspace/AMOSTRAS/col8/CAATINGA/aggrements',
    lstClassMB:  [3, 4, 5, 49 ,9, 11, 12, 13, 29, 50, 15, 21, 23, 24, 25, 30, 31, 33, 39, 20, 40, 62, 41, 36, 46, 47, 48],
    lstClassRC:  [3, 4, 3,  3 ,9, 12, 12, 12, 12, 12, 21, 21, 22, 22, 22, 30, 33, 33, 21, 21, 21, 21, 21, 21, 21, 21, 21]
}
var bioma =  'Caatinga'; 
var biomes = ee.Image(params.asset_biomas).eq(5).selfMask();
var limitBioma = ee.FeatureCollection(params.asset_sphBiomas)
                    .filter(ee.Filter.eq("Bioma", bioma));

var class_col71 = ee.Image(params.asset_Col7).updateMask(biomes);
var class_col80 = ee.Image(params.asset_Col8).updateMask(biomes);
Map.addLayer(ee.Image.constant(1), {min: 0, max: 1}, 'base');
    
      
// listar classes para performar a análise 
var lst_classes = [3,4,12,29,15,18,21,22,25,33];
years.forEach(function(year_j) {
    // para cada classe 
    // para cada ano
    var col8_j = class_col80.select('classification_'+year_j);
    var col71_j = class_col71.select('classification_'+year_j);
    lst_classes.forEach(function(class_i) {
        var images = ee.Image([]);

        // selecionar a classificação do ano j
        
        // calcular concordância
        var conc = ee.Image(0).where(col8_j.eq(class_i).and(col71_j.eq(class_i)), 1)   // [1]: Concordância
                            .where(col8_j.eq(class_i).and(col71_j.neq(class_i)), 2)  // [2]: Apenas Sentinel
                            .where(col8_j.neq(class_i).and(col71_j.eq(class_i)), 3)  // [3]: Apenas Landsat
                            //.updateMask(biomes.eq(4));
        
        conc = conc.updateMask(conc.neq(0)).rename('territory_' + year_j);
        
        // build sinthetic image to compute areas
        var synt = ee.Image(0).where(conc.eq(1), col8_j)
                            .where(conc.eq(2), col71_j)
                            .where(conc.eq(3), col8_j)
                            .updateMask(conc)
                            .rename(['classification_' + year_j]);
        // build database
        images = images.addBands(conc).addBands(synt);
        var nameLayer = year_j + 'Agreement_Class_' + class_i;
        Map.addLayer(images.select(['territory_' + year_j]), vis.aggrement, nameLayer, false);
        processoExportarImage(images.select(['territory_' + year_j]), nameLayer, params.assetOutput, limitBioma);
    });
    Map.addLayer(col71_j, vis.colecao, 'Col 7.1 '+ year_j, false);
    Map.addLayer(col8_j, vis.colecao, 'Col 8   '+ year_j, false);  
    
});


var outline = ee.Image(0).mask(0).paint(limitBioma, 'AA0000', 2); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(outline, visPar, 'Caatinga', false);