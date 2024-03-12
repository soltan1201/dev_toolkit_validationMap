#!/usr/bin/env python2
# -*- coding: utf-8 -*-

'''
#SCRIPT DE CLASSIFICACAO POR BACIA
#Produzido por Geodatin - Dados e Geoinformacao
#DISTRIBUIDO COM GPLv2
'''

import ee 
import gee
import json
import csv
import sys
import collections
collections.Callable = collections.abc.Callable
try:
    ee.Initialize()
    print('The Earth Engine package initialized successfully!')
except ee.EEException as e:
    print('The Earth Engine package failed to initialize!')
except:
    print("Unexpected error:", sys.exc_info()[0])
    raise

path_asset = "projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1"
# path_asset = "projects/mapbiomas-workspace/public/collection7_1/mapbiomas_collection71_integration_v1"
param = {
    'lsBiomas': ['CAATINGA'],
    'asset_bacias': 'projects/mapbiomas-arida/ALERTAS/auxiliar/bacias_hidrografica_caatinga',
    'assetBiomas' : 'projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil',
    'assetpointLapig': 'projects/mapbiomas-workspace/VALIDACAO/mapbiomas_85k_col3_points_w_edge_and_edited_v2',    
    'limit_bacias': "users/CartasSol/shapes/bacias_limit",
    'assetCol': path_asset ,
    # 'assetCol6': path_asset + "class_filtered/maps_caat_col6_v2_4",
    'classMapB': [3, 4, 5, 9,12,13,15,18,19,20,21,22,23,24,25,26,29,30,31,32,33,36,37,38,39,40,41,42,43,44,45],
    'classNew': [3, 4, 3, 3,12,12,21,21,21,21,21,22,22,22,22,33,29,22,33,12,33, 21,33,33,21,21,21,21,21,21,21],
    'inBacia': False,
    'pts_remap' : {
        "FORMAÇÃO FLORESTAL": 3,
        "FORMAÇÃO SAVÂNICA": 4,        
        "MANGUE": 3,
        "RESTINGA HERBÁCEA": 3,
        "FLORESTA PLANTADA": 9,
        "FLORESTA INUNDÁVEL": 3,
        "CAMPO ALAGADO E ÁREA PANTANOSA": 10,
        "APICUM": 10,
        "FORMAÇÃO CAMPESTRE": 10,
        "AFLORAMENTO ROCHOSO": 10,
        "OUTRA FORMAÇÃO NÃO FLORESTAL":10,
        "PASTAGEM": 15,
        "CANA": 18,
        "LAVOURA TEMPORÁRIA": 18,
        "LAVOURA PERENE": 18,
        "MINERAÇÃO": 22,
        "PRAIA E DUNA": 22,
        "INFRAESTRUTURA URBANA": 22,
        "VEGETAÇÃO URBANA": 22,
        "OUTRA ÁREA NÃO VEGETADA": 22,
        "RIO, LAGO E OCEANO": 33,
        "AQUICULTURA": 33,
        "NÃO OBSERVADO": 27       
    },
    'anoInicial': 1985,
    'anoFinal': 2022,  # 2019
    'numeroTask': 6,
    'numeroLimit': 2,
    'conta' : {
        '0': 'caatinga05'              
    },
    'lsProp': ['ESTADO','LON','LAT','PESO_AMOS','PROB_AMOS','REGIAO','TARGET_FID','UF'],
    "amostrarImg": False,
    'isImgCol': False
}

def change_value_class(feat):

    pts_remap = ee.Dictionary({
        "FORMAÇÃO FLORESTAL": 3,
        "FORMAÇÃO SAVÂNICA": 4,        
        "MANGUE": 3,
        "RESTINGA HERBÁCEA": 3,
        "FLORESTA PLANTADA": 9,
        "FLORESTA INUNDÁVEL": 3,
        "CAMPO ALAGADO E ÁREA PANTANOSA": 10,
        "APICUM": 10,
        "FORMAÇÃO CAMPESTRE": 10,
        "AFLORAMENTO ROCHOSO": 10,
        "OUTRA FORMAÇÃO NÃO FLORESTAL":10,
        "PASTAGEM": 15,
        "CANA": 18,
        "LAVOURA TEMPORÁRIA": 18,
        "LAVOURA PERENE": 18,
        "MINERAÇÃO": 22,
        "PRAIA E DUNA": 22,
        "INFRAESTRUTURA URBANA": 22,
        "VEGETAÇÃO URBANA": 22,
        "OUTRA ÁREA NÃO VEGETADA": 22,
        "RIO, LAGO E OCEANO": 33,
        "AQUICULTURA": 33,
        "NÃO OBSERVADO": 27      
    }) 

    prop_select = [
        'BIOMA', 'CARTA','DECLIVIDAD','ESTADO','JOIN_ID','PESO_AMOS'
        ,'POINTEDITE','PROB_AMOS','REGIAO','TARGET_FID','UF', 'LON', 'LAT']
    
    feat_tmp = feat.select(prop_select)

    for year in range(1985, 2023):
        nam_class = "CLASS_" + str(year)
        set_class = "CLASS_" + str(year)
        valor_class = ee.String(feat.get(nam_class))
        feat_tmp = feat_tmp.set(set_class, pts_remap.get(valor_class))
    
    return feat_tmp

bioma250mil = ee.FeatureCollection(param['assetBiomas'])\
                    .filter(ee.Filter.eq('Bioma', 'Caatinga')).geometry()

#lista de anos
list_anos = [str(k) for k in range(param['anoInicial'],param['anoFinal'] + 1)]

print('lista de anos', list_anos)
lsAllprop = param['lsProp'].copy()
for ano in list_anos:
    band = 'CLASS_' + str(ano)
    lsAllprop.append(band) 

ptsTrue = ee.FeatureCollection(param['assetpointLapig']).filterBounds(bioma250mil)

pointTrue = ptsTrue.map(lambda feat: change_value_class(feat))
print("Carregamos {} points ".format(9738))  # pointTrue.size().getInfo()
print(pointTrue.first().getInfo())
# ftcol poligonos com as bacias da caatinga
ftcol_bacias = ee.FeatureCollection(param['asset_bacias'])
limite_bacias = ee.FeatureCollection(param['limit_bacias']).geometry()

#nome das bacias que fazem parte do bioma
nameBacias = [
      '741', '7421','7422','744','745','746','751','752',  # '7492',
      '753', '754','755','756','757','758','759','7621','7622','763',
      '764','765','766','767','771','772','773', '7741','7742','775',
      '776','76111','76116','7612','7613','7614','7615',  # '777','778',
      '7616','7617','7618','7619'
]
# '7491',

#========================METODOS=============================
def gerenciador(cont, param):
    #0, 18, 36, 54]
    #=====================================#
    # gerenciador de contas para controlar# 
    # processos task no gee               #
    #=====================================#
    numberofChange = [kk for kk in param['conta'].keys()]

    if str(cont) in numberofChange:
        
        gee.switch_user(param['conta'][str(cont)])
        gee.init()        
        gee.tasks(n= param['numeroTask'], return_list= True)        
    
    elif cont > param['numeroLimit']:
        cont = 0
    
    cont += 1    
    return cont

#exporta a imagem classificada para o asset
def processoExportar(ROIsFeat, nameT, porAsset):  

    if porAsset:
        optExp = {
          'collection': ROIsFeat, 
          'description': nameT, 
          'assetId':"users/mapbiomascaatinga04/" + nameT          
        }
        task = ee.batch.Export.table.toAsset(**optExp)
        task.start() 
        print("salvando ... " + nameT + "..!")
    else:
        optExp = {
            'collection': ROIsFeat, 
            'description': nameT, 
            'folder':"ptosCol7"          
            }
        task = ee.batch.Export.table.toDrive(**optExp)
        task.start() 
        print("salvando ... " + nameT + "..!")
        # print(task.status())
    
pointAcc = ee.FeatureCollection([])
mapClasses = ee.List([])

if param['inBacia']:    
    print("##########  CARREGOU A VERSAO 4 ###############")
    mapClass = ee.ImageCollection(param['assetCol']).filter(
                        ee.Filter.eq('version', '5'))
else:
    if param['isImgCol']:
        for yy in range(1985, 2023):
            nmIm = 'CAATINGA-' + str(yy) + '-2'
            imTmp = ee.Image(param['assetCol'] + nmIm).rename("classification_" + str(yy))

            if yy == 1985:
                mapClass = imTmp.byte()
            else:
                mapClass = mapClass.addBands(imTmp.byte())

    else:
        print("coletando no mapa final da coleção 8.0")
        mapClass = ee.Image(param['assetCol']).byte()

pointAll = ee.FeatureCollection([])
lsNameClass = [kk for kk in param['pts_remap'].keys()]
lsValClass = [kk for kk in param['pts_remap'].values()]
exportarAsset = True
extra = param['assetCol'].split('/')
sizeFC = 0
for cc, _nbacia in enumerate(nameBacias[:]):    
    nameImg = 'mapbiomas_collection80_integration_v1' 
    print("processando img == " + nameImg + " em bacia *** " + _nbacia)
    baciaTemp = ftcol_bacias.filter(ee.Filter.eq('nunivotto3', _nbacia)).geometry()    
    g_bacia_biome = bioma250mil.intersection(baciaTemp)
    
    # print("cortou a imagem em {} metros quadrados ".format(g_bacia_biome.area(0.1).getInfo()))
    # mapClassTemp = mapClass.clip(g_bacia_biome).byte() 
    
    pointTrueTemp = pointTrue.filterBounds(g_bacia_biome)
    ptoSize = pointTrueTemp.size().getInfo()
    print(cc, " - ", _nbacia, " pointTrueTemp ", ptoSize)  
    sizeFC += ptoSize

    if param['inBacia']:
        mapClassBacia = ee.Image(mapClass.filter(ee.Filter.eq('id_bacia', _nbacia)).first())
        pointAccTemp = mapClassBacia.sampleRegions(
            collection= pointTrueTemp, 
            properties= lsAllprop, 
            scale= 30, 
            tileScale= 2, 
            geometries= True)
    else:        
        pointAccTemp = mapClass.sampleRegions(
            collection= pointTrueTemp, 
            properties= lsAllprop, 
            scale= 30,  
            geometries= True)

    pointAccTemp = pointAccTemp.map(lambda Feat: Feat.set('bacia', _nbacia))
    if exportarAsset == False:
        name = 'occTab_corr_Caatinga_' + _nbacia + "_" + extra[-1]
        processoExportar(pointAccTemp, name, exportarAsset)

    pointAll = ee.Algorithms.If(  
                    ee.Algorithms.IsEqual(ee.Number(ptoSize).eq(0), 1),
                    pointAll,
                    ee.FeatureCollection(pointAll).merge(pointAccTemp)
                )

# pointAll = ee.FeatureCollection(pointAll).flatten()
# pointAll = pointAll.filter(ee.Filter.notNull(['CLASS_1990']))
name = 'occTab_corr_Caatinga_' + extra[-1]
processoExportar(pointAll, name, exportarAsset)
print()
print("numero de ptos ", sizeFC)
"""
    # refazendo os labels das classes 
    param['lsProp'].append('bacia')
    newPropCh = param['lsProp'] + ['reference', 'classification']
    for cc, ano in enumerate(list_anos):    
        
        labelRef = 'CLASS_' + str(ano)
        print("label de referencia : " + labelRef)
        labelCla = 'classification_' + str(ano)
        print("label da classification : " + labelCla)
        
        
        newProp = param['lsProp'] + [labelRef, labelCla]
        print("lista de propeties", newProp) 
        print("nova ls propeties", newPropCh)       

        FeatTemp = pointAccTemp.select(newProp)
        # print(FeatTemp.first().getInfo())
        FeatTemp = FeatTemp.filter(ee.Filter.notNull([labelCla]))
        
        # tam = FeatTemp.size().getInfo() 

        # if tam > 0:
        # FeatTemp = FeatTemp.remap(lsNameClass, lsValClass, labelRef)   
        FeatTemp = FeatTemp.select(newProp, newPropCh)

        FeatTemp = FeatTemp.map(lambda  Feat: Feat.set('year', str(ano)))
        print(FeatTemp.first().getInfo())

        pointAll = pointAll.merge(FeatTemp)

    
    name = 'occTab_corr_Caatinga_' + _nbacia + "_" + extra[-1]
    processoExportar(pointAll, name)
        #pointAcc = pointAcc.merge(pointAccTemp)
    


    ## Revisando todos as Bacias que foram feitas 

    # cont = 0
    # cont = gerenciador(cont, param)
"""   

