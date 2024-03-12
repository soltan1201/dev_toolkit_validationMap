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

var lstYears = [
    '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', 
    '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', 
    '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', 
    '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', 
    '2021', '2022'
];
var listaYears = [
    "2000","2010", "2012", "2014","2016", "2018",  "2020"
];
var nameBacias = [
    '741', '7421','7422','744','745','746','751','752', '7492',
    '753', '754','755','756','757','758','759','7621','7622','763',
    '764','765','766','767','771','772','773', '7741','7742','775',
    '776','76111','76116','7612','7613','7614','7615', '777','778',
    '7616','7617','7618','7619'
]
var lstExcl = ['7492','777','778'];
var exportarRemap = false;
var asset_ImBiomas = 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster';
var assetInputCol8 = 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1';
var assetInputCol8Acc = 'users/mapbiomascaatinga04/occTab_corr_Caatinga_mapbiomas_collection80_integration_v1';
var assetIBGE =  'users/nerivaldogeo/uso_caatinga_ibge';
var assetIBGEAcc = 'users/mapbiomascaatinga04/occTab_corr_IBGE_Caatinga';
var baseAsset = 'users/mapbiomascaatinga04/';
var asset_bacias = 'projects/mapbiomas-arida/ALERTAS/auxiliar/bacias_hidrografica_caatinga';
var assetBiomas = 'projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil';


var lstCCIbge = [1 , 2, 3, 4, 5, 6, 9,10,11,12,13,14];
var lstCCMapb = [33,21,21,21,21, 3,10, 4,21,33,33,22];
var class_in =  [3,4,5,6,49,11,12,13,32,29,50,15,19,39,20,40,62,41,36,46,47,48,9,21,22,23,24,30,25,33,31];
var class_out = [3,4,3,6,3,11,12,12,12,29,12,21,21,21,21,21,21,21,21,21,21,21,21,21,25,25,25,25,25,33,33];
var knowPercent = true;
var atribMaps = [
    "USO2000","USO2010", "USO2012",
    "USO2014","USO2016", "USO2018", "USO2020"
];
var bandasMaps = [
    "classification_2000", "classification_2010", "classification_2012",
    "classification_2014","classification_2016", "classification_2018", 
    "classification_2020"
];
var yearShow = '2000';

var setDiferenciasClass = function(featTable, listaY){
    var featCTable = featTable.map(function(feat){        
        listaY.forEach(function(year){
            var classRef = "CLASS_" + year;
            var classCC = "classification_" + year;
            var refCC = 'refCC_' + year;
            var pointDif = ee.Algorithms.If(  
                ee.Algorithms.IsEqual(ee.Number(feat.get(classCC)).eq(feat.get(classRef)), 1),
                1, 0
            );
            feat = feat.set(refCC, pointDif);
        })
        return feat;

    })
    return featCTable;
    
}
var remap_classinFeatCol = function(featCol){
    lstYears.forEach(function(year){
        var classCC = "classification_" + year;
        featCol = featCol.remap(class_in, class_out, classCC);
    })
    return featCol;
}

//exporta a imagem classificada para o asset
var processoExportar = function(ROIsFeat, nameT){
    var  optExp = {
        'collection': ROIsFeat, 
        'description': nameT, 
        'assetId':"users/mapbiomascaatinga04/" + nameT          
    }
    Export.table.toAsset(optExp);
    print("salvando ... " + nameT + "..!")
    
};

var class_mask_final = null;
var shpIBGE = ee.FeatureCollection(assetIBGE);
print("show metadados ", shpIBGE.limit(3));
print("número de poligons ", shpIBGE.size());
var limitBioma = ee.Image(asset_ImBiomas).eq(5).selfMask();
var col8 = ee.Image(assetInputCol8).updateMask(limitBioma).selfMask();
var ptosAccCol8 = ee.FeatureCollection(assetInputCol8Acc);
var ptosAccIBGE = ee.FeatureCollection(assetIBGEAcc);

var ftcol_bacias = ee.FeatureCollection(asset_bacias);
var bioma250mil = ee.FeatureCollection(assetBiomas).filter(
                            ee.Filter.eq('Bioma', 'Caatinga')).geometry();

print("feat Col bacias ", ftcol_bacias);

if (exportarRemap){
    print("remaping the class col 8");
    ptosAccCol8 = remap_classinFeatCol(ptosAccCol8);    
    ptosAccCol8 = setDiferenciasClass(ptosAccCol8, lstYears);
    processoExportar(ptosAccCol8, 'occTab_Acc_Caatinga_mapbiomas_collection80_dif');
    // print("show the first points of table Col 8", ptosAccCol8.limit(10));
    ptosAccIBGE = setDiferenciasClass(ptosAccIBGE, listaYears);
    print("show the first points of table IBGE ", ptosAccIBGE.limit(10));
    processoExportar(ptosAccCol8, 'occTab_Acc_IBGE_Caatinga_dif');
}else{
    assetInputCol8Acc = baseAsset + 'occTab_Acc_Caatinga_mapbiomas_collection80_dif';
    assetIBGEAcc = baseAsset + 'occTab_Acc_IBGE_Caatinga_dif';
    ptosAccCol8 = ee.FeatureCollection(assetInputCol8Acc);
    ptosAccIBGE = ee.FeatureCollection(assetIBGEAcc);
}


//baciaTemp = ftcol_bacias.filter(ee.Filter.eq('nunivotto3', _nbacia)).geometry()  

var setCountsPoints = function(featColBa, featColPoints, yearSel){
    var attrib = 'refCC_' + yearSel;
    var featBac = featColBa.map(
                    function(feat){
                        var pointstmp = featColPoints.filterBounds(feat.geometry());
                        feat = feat.set('nPoints', pointstmp.size());
                        feat = feat.set('nPointsWrong', pointstmp.filter(ee.Filter.eq(attrib, 0)).size());
                        return feat;
                    }
                );
    
    return featBac;
};

var setPercents = function(feat){
    var percent = ee.Number(feat.get('nPointsWrong')).divide(feat.get('nPoints'));
    var DifCateg = ee.Algorithms.If(  
                ee.Algorithms.IsEqual(ee.Number(percent).lt(0.6), 1),
                ee.Algorithms.If(  
                    ee.Algorithms.IsEqual(ee.Number(percent).lt(0.3), 1),
                    1, 2
                ),
                ee.Algorithms.If(  
                    ee.Algorithms.IsEqual(ee.Number(percent).gte(0.8), 1),
                    4, 3
                )
            );
    return feat.set('percent', percent, 'CategoriaAcc', DifCateg);
};

var setcaatPoint = function(feat){
    var numbPto = ee.Number(feat.get('nPoints'));
    var Categ = ee.Algorithms.If(  
                ee.Algorithms.IsEqual(ee.Number(numbPto).lt(300), 1),
                ee.Algorithms.If(  
                    ee.Algorithms.IsEqual(ee.Number(numbPto).lt(100), 1),
                    1, 2
                ),
                ee.Algorithms.If(  
                    ee.Algorithms.IsEqual(ee.Number(numbPto).gte(500), 1),
                    4, 3
                )
            );
    return feat.set('Categoria', Categ);
};


ftcol_bacias = ftcol_bacias.map(function(feat){
    return feat.intersection(bioma250mil);
})

var featBaciaPtos = setCountsPoints(ftcol_bacias, ptosAccIBGE, yearShow);

Map.addLayer(featBaciaPtos, {color: '#1C1C1C'}, 'limitBacias');

var lstCateg = [1,2,3,4];
var dictCat = {
    1: "#FFF6C6",
    2: '#FFFF00',
    3: '#F55200',
    4: '#F50000'
}
var dictAcc = {
    1: 'Acc muito baixa',
    2: 'Acc baixa',
    3: 'Acc media',
    4: 'Acc Alta'
}
var dictnumbPtos = {
    1: "#FF6139",
    2: '#FFFE9D',
    3: '#7BBC8F',
    4: '#173540'
}

if (knowPercent){
    print("======== só quantidade =========")
    var featBaciaCountPtos = featBaciaPtos.map(setcaatPoint);
    var lstRed = featBaciaCountPtos.reduceColumns(ee.Reducer.toList(4), ['nunivotto3', 'nPoints', 'nPointsWrong','Categoria']).get('list');
    print("show all attribute", lstRed);
    lstCateg.forEach(function(cat){
        var featCat = featBaciaCountPtos.filter(ee.Filter.eq('Categoria', cat));
        Map.addLayer(featCat, {color: dictnumbPtos[cat]}, dictnumbPtos[cat]);    
    })
}else{
    featBaciaPtos = featBaciaPtos.map(setPercents);
    var lstRed = featBaciaPtos.reduceColumns(ee.Reducer.toList(5), ['nunivotto3', 'nPoints', 'nPointsWrong','percent', 'CategoriaAcc']).get('list');
    print("shaow all attribute", lstRed);
    lstCateg.forEach(function(cat){
        var featCat = featBaciaPtos.filter(ee.Filter.eq('CategoriaAcc', cat));
        Map.addLayer(featCat, {color: dictCat[cat]}, dictAcc[cat]);    
    })
}


// Paint all the polygon edges with the same number and width, display.
var outline = ee.Image().byte().paint({
  featureCollection: featBaciaPtos,
  color: 1,
  width: 1.5
});
Map.addLayer(outline, {palette: '#1C1C1C'}, 'limitBacias');

// var cc = 0;
// var ImMapIBGE = null;
// var lstClass = null;
// atribMaps.forEach(function(atrib){
//     if (atrib === "USO2000"){
//         ImMapIBGE = shpIBGE.select([atrib]).reduceToImage([atrib], ee.Reducer.first());
//         lstClass = shpIBGE.reduceColumns(ee.Reducer.toList(), [atrib]).get('list');
//         lstClass = ee.List(lstClass).distinct();
//         print("reducer ", lstClass);
//         ImMapIBGE = ImMapIBGE.remap(lstCCIbge, lstCCMapb);
//         ImMapIBGE = ImMapIBGE.select(["remapped"], [bandasMaps[cc]]);
//         print(bandasMaps[cc], ImMapIBGE);
        
//     }else{
//         var mapTmp = shpIBGE.select([atrib]).reduceToImage([atrib], ee.Reducer.first());
//         mapTmp = mapTmp.remap(lstCCIbge, lstCCMapb);
//         mapTmp = mapTmp.select(["remapped"], [bandasMaps[cc]]);
//         print(bandasMaps[cc], ImMapIBGE)
//         ImMapIBGE = ImMapIBGE.addBands(mapTmp);
//         lstClass = shpIBGE.reduceColumns(ee.Reducer.toList(), [atrib]).get('list');
//         lstClass = ee.List(lstClass).distinct();
//         print("reducer ", lstClass);
        
//     }

//     var mapCol8 = col8.select(bandasMaps[cc]).remap(class_in, class_out);
//     var igual_Class = mapCol8.eq(ImMapIBGE.select(bandasMaps[cc])).remap([1],[2]);    
//     var mask_final = limitBioma.blend(igual_Class);   

//     if (atrib === "USO2000"){
//         class_mask_final = mask_final.rename('Coinc_' + lstYears[cc]) 
//     }else{
//         class_mask_final = class_mask_final.addBands(mask_final.rename('Coinc_' + lstYears[cc])); 
//     }
//     cc = cc + 1;
// })


// Map.addLayer(mapCol8, vis.cobertura , "col8 " +  atrib, false);
// Map.addLayer(ImMapIBGE.select(bandasMaps[cc]), vis.cobertura , "IBGE " + atrib, false);
// Map.addLayer(mask_final, vis.diferencia, 'Coinc_'+ atrib, false)