#!/usr/bin/env python2
# -*- coding: utf-8 -*-

'''
#SCRIPT DE CLASSIFICACAO POR BACIA
#Produzido por Geodatin - Dados e Geoinformacao
#DISTRIBUIDO COM GPLv2
'''

import pandas as pd 
import glob
import os 
import sys
import matplotlib.pyplot as plt
from tqdm import tqdm, tqdm_pandas
# import tqdm.pandas
tqdm_pandas(tqdm())
# from tqdm.auto import tqdm  # for notebooks

def setCoordenada(row):
    coord = row['.geo']
    coord = coord.replace('{"type":"Point","coordinates":[', '')
    coord = coord.replace(']}', '')
    coords = coord.split(",")
    latitude = coords[1]
    longitude = coords[0]
    row['latitude'] = latitude
    row['longitude'] = longitude
    row['coord_lat'] = round(float(latitude), 14)
    row['coord_lat'] = round(float(longitude), 14)

    return row

def setCoordenadaIBGE(row):
    coord = row['.geo']
    coord = coord.replace('{"geodesic":false,"type":"Point","coordinates":[', '')
    coord = coord.replace(']}', '')
    coords = coord.split(",")
    latitude = float(coords[1])
    longitude = float(coords[0])
    row['latitude'] = latitude
    row['longitude'] = longitude
    row['coord_lat'] = round(float(latitude), 14)
    row['coord_lat'] = round(float(longitude), 14)

    return row

def setdiferenciasCol8(row):
    for year in range(1985, 2023):
        classRef = row["CLASS_" + str(year)]
        classCC = row["classification_" + str(year)]
        if classCC == classRef:
            row['refCC_' + str(year)] = 1
        else:
            row['refCC_' + str(year)] = 0

    return row

def setdiferenciasIBGE(row):
    list_anos = [ "2000","2010", "2012", "2014","2016", "2018", "2020"];
    for year in list_anos:
        classRef = row["CLASS_" + year]
        classCC = row["classification_" + year]
        if classCC == classRef:
            row['refIBGE_' + year] = 1
        else:
            row['refIBGE_' + year] = 0

    return row

npathCol8 = 'others/occTab_corr_Caatinga_mapbiomas_collection80_integration_v1.csv'
npathCol8c = 'others/occTab_corr_Caatinga_mapbiomas_collection80_coord.csv'
npathIBGE = 'others/occTab_corr_IBGE_Caatinga.csv'
npathIBGEc = 'others/occTab_corr_IBGE_Caatinga_coord.csv'
print("path of table IBGE ", npathIBGE)
lstYear = [str(kk) for kk in range(1985, 2023)]
print("lista de anos \n ")
print(lstYear)
sys.exit()
if os.path.exists(npathCol8c):
    dfCol8 = pd.read_csv(npathCol8c)
else:
    dfCol8 = pd.read_csv(npathCol8)
    dfCol8 = dfCol8.drop(['system:index'], axis=1)
    print("dataframe  Col 8 ", dfCol8.shape)
    print("value = ", dfCol8[dfCol8['.geo'] == '{"type":"Point","coordinates":[-43.56797681617091,-15.005325414051777]}']['CLASS_2020'].values[0])


    # sys.exit()
    dfCol8 = dfCol8.progress_apply(setCoordenada, axis= 1)
    dfCol8 = dfCol8.drop(['.geo'], axis=1)
    dfCol8 = dfCol8.progress_apply(setdiferenciasCol8, axis= 1)
    print(dfCol8.head())
    dfCol8.to_csv(npathCol8c)

if os.path.exists(npathIBGEc):
    dfIBGE = pd.read_csv(npathIBGEc)
else:
    dfIBGE = pd.read_csv(npathIBGE)
    dfIBGE = dfIBGE.drop(['system:index'], axis=1)
    print("dataframe  Col 8 ", dfIBGE.shape)

    dfIBGE = dfIBGE.progress_apply(setCoordenadaIBGE, axis= 1)
    dfIBGE = dfIBGE.drop(['.geo'], axis=1)
    dfIBGE = dfIBGE.progress_apply(setdiferenciasIBGE, axis= 1)
    print(dfIBGE.head())
    dfIBGE.to_csv(npathIBGEc)

print("count coord IBGE = ", len(dfIBGE['latitude'].unique()))
print("count coord Col8 = ", len(dfCol8['latitude'].unique()))

sys.exit()
def mergeTables(row):
    latitude = row['latitude']
    longitude = row['longitude']

    dfIBGEtmp = dfIBGE[(dfIBGE['latitude'] == latitude) & (dfIBGE['longitude'] == longitude)]
    list_anos = [ "2000","2010", "2012", "2014","2016", "2018", "2020"];
    valor = 0
    for year in list_anos:
        nameCC = 'refIBGE_' + year        
        try:
            valor = dfIBGEtmp[nameCC].values[0]
        except:
            if dfIBGEtmp[nameCC].shape[0] > 0:
                valor = dfIBGEtmp[nameCC].values
            else:
                print("temos um erro em ", dfIBGEtmp)
        row[nameCC] = valor

    return row

dfCol8 = dfCol8.progress_apply(mergeTables, axis= 1)
print(dfCol8.head())

dfCol8.to_csv('others/occTab_dif_Ref_Caat_mapbiomas_col80_IBGE.csv')