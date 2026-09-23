'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Search, ZoomIn, ZoomOut, RotateCcw, Filter,
  Train, AlertTriangle, ShieldCheck, Wrench, X, MapPin, Layers
} from 'lucide-react';

interface Station {
  id: string;
  code: string;
  name: string;
  x: number; // percentage (0 - 100)
  y: number;
  division: string;
  verified: boolean;
  activeBlocks?: number;
  scheduledTrains?: number;
}

interface Edge {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  lineType: 'UP' | 'DOWN' | 'BOTH';
  status: 'clear' | 'block-active' | 'conflict' | 'maintenance-done';
  blockId?: string;
  dept?: 'Civil' | 'OHE' | 'S&T';
}

const INITIAL_STATIONS: Station[] = [
  // ----------------------------------------------------
  // SECTION 1: JAMMU & KASHMIR (USBRL & VALLEY)
  // ----------------------------------------------------
  { id: 'BRML', code: 'BRML', name: 'Baramulla', x: 22.63, y: 3.03, division: 'Jammu', verified: true, scheduledTrains: 16 },
  { id: 'SXZM', code: 'SXZM', name: 'Sopore', x: 23.28, y: 2.67, division: 'Jammu', verified: true },
  { id: 'HME', code: 'HME', name: 'Hamre', x: 24.18, y: 3.17, division: 'Jammu', verified: true },
  { id: 'PTTN', code: 'PTTN', name: 'Pattan', x: 24.48, y: 3.66, division: 'Jammu', verified: true },
  { id: 'MZMA', code: 'MZMA', name: 'Mazhom', x: 24.58, y: 4.16, division: 'Jammu', verified: true },
  { id: 'NDAM', code: 'NDAM', name: 'Nadigam', x: 25.03, y: 4.3, division: 'Jammu', verified: false },
  { id: 'BDGM', code: 'BDGM', name: 'Budgam', x: 25.48, y: 4.23, division: 'Jammu', verified: true, scheduledTrains: 24 },
  { id: 'SINA', code: 'SINA', name: 'Srinagar', x: 26.08, y: 3.18, division: 'Jammu', verified: true, scheduledTrains: 28 },
  { id: 'PMPE', code: 'PMPE', name: 'Pampore', x: 26.43, y: 4.3, division: 'Jammu', verified: false },
  { id: 'KAPE', code: 'KAPE', name: 'Kakapora', x: 26.63, y: 4.8, division: 'Jammu', verified: false },
  { id: 'RPAP', code: 'RPAP', name: 'Ratnipora', x: 26.93, y: 5.15, division: 'Jammu', verified: false },
  { id: 'ATPA', code: 'ATPA', name: 'Awantipura', x: 27.28, y: 5.43, division: 'Jammu', verified: false },
  { id: 'PJGM', code: 'PJGM', name: 'Panzgam', x: 27.38, y: 5.86, division: 'Jammu', verified: false },
  { id: 'BJBA', code: 'BJBA', name: 'Bijbehara', x: 27.48, y: 6.25, division: 'Jammu', verified: false },
  { id: 'ANT', code: 'ANT', name: 'Anantnag', x: 27.58, y: 7.2, division: 'Jammu', verified: true, scheduledTrains: 24 },
  { id: 'SDUA', code: 'SDUA', name: 'Sadura', x: 27.53, y: 7.91, division: 'Jammu', verified: false },
  { id: 'QG', code: 'QG', name: 'Qazigund', x: 27.28, y: 8.62, division: 'Jammu', verified: true, scheduledTrains: 22 },
  { id: 'HRSB', code: 'HRSB', name: 'Hiller Shahabad', x: 27.73, y: 8.9, division: 'Jammu', verified: false },
  { id: 'BAHL', code: 'BAHL', name: 'Banihal', x: 27.78, y: 9.33, division: 'Jammu', verified: true, scheduledTrains: 20 },
  { id: 'KARI', code: 'KARI', name: 'Khari', x: 27.88, y: 10.04, division: 'Jammu', verified: false },
  { id: 'SMBR', code: 'SMBR', name: 'Sumber', x: 27.83, y: 10.86, division: 'Jammu', verified: false },
  { id: 'SVDN', code: 'SGDN', name: 'Sangaldan', x: 27.83, y: 11.42, division: 'Jammu', verified: false },
  { id: 'SWKE', code: 'SWKE', name: 'Sawalkote', x: 27.63, y: 12.06, division: 'Jammu', verified: false },
  { id: 'DUCA', code: 'DUGA', name: 'Dugga', x: 26.98, y: 13.48, division: 'Jammu', verified: false },
  { id: 'BAKK', code: 'BAKK', name: 'Bakkal', x: 26.63, y: 13.9, division: 'Jammu', verified: false },
  { id: 'REASI', code: 'REAI', name: 'Reasi', x: 26.03, y: 14.25, division: 'Jammu', verified: false },
  { id: 'SVDK', code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra', x: 25.92, y: 14.82, division: 'Jammu', verified: true, scheduledTrains: 38 },
  { id: 'CRWL', code: 'CRWL', name: 'Chak Rakhwal', x: 27.38, y: 15.39, division: 'Jammu', verified: false },
  { id: 'MCTM', code: 'MCTM', name: 'Martyr Capt. Tushar Mahajan', x: 28.28, y: 15.53, division: 'Jammu', verified: true, scheduledTrains: 34 },
  { id: 'RMJK', code: 'RMJK', name: 'Ramnagar Road', x: 28.23, y: 16.75, division: 'Jammu', verified: false },
  { id: 'MNVL', code: 'MNVL', name: 'Manwal', x: 27.13, y: 17.1, division: 'Jammu', verified: false },
  { id: 'SGRR', code: 'SGRR', name: 'Sangar', x: 26.68, y: 17.17, division: 'Jammu', verified: false },
  { id: 'BLA', code: 'BLA', name: 'Bajalta', x: 26.18, y: 17.45, division: 'Jammu', verified: false },
  { id: 'JAT', code: 'JAT', name: 'Jammu Tawi', x: 25.68, y: 17.74, division: 'Jammu', verified: true, scheduledTrains: 72 },
  { id: 'BBMN', code: 'BBMN', name: 'Bari Brahman', x: 25.98, y: 18.3, division: 'Jammu', verified: false },
  { id: 'VJPJ', code: 'VJPJ', name: 'Vijaypur Jammu', x: 26.38, y: 18.8, division: 'Jammu', verified: false },
  { id: 'SMBX', code: 'SMBX', name: 'Samba', x: 26.83, y: 19.08, division: 'Jammu', verified: false },
  { id: 'GHGL', code: 'GHGL', name: 'Ghagwal', x: 27.28, y: 19.65, division: 'Jammu', verified: false },
  { id: 'HRNR', code: 'HRNR', name: 'Hira Nagar', x: 27.98, y: 20.57, division: 'Jammu', verified: false },
  { id: 'CKDL', code: 'CKDL', name: 'Chak Dayala', x: 28.53, y: 20.99, division: 'Jammu', verified: false },
  { id: 'CHNR', code: 'CHNR', name: 'Chhan Arorian', x: 29.03, y: 21.35, division: 'Jammu', verified: false },
  { id: 'BDHY', code: 'BDHY', name: 'Budhi', x: 29.63, y: 21.56, division: 'Jammu', verified: false },
  { id: 'KTHU', code: 'KTHU', name: 'Kathua', x: 30.13, y: 22.18, division: 'Jammu', verified: true, scheduledTrains: 46 },
  { id: 'MDPB', code: 'MDPB', name: 'Madhopur Punjab', x: 30.43, y: 22.82, division: 'Jammu', verified: false },
  { id: 'SJNP', code: 'SJNP', name: 'Sujanpur', x: 30.63, y: 23.17, division: 'Jammu', verified: false },
  { id: 'PTK', code: 'PTK', name: 'Pathankot Jn', x: 31.13, y: 23.19, division: 'Jammu', verified: true, scheduledTrains: 68 },
  { id: 'PTKC', code: 'PTKC', name: 'Pathankot Cantt', x: 31.33, y: 23.75, division: 'Jammu', verified: true, scheduledTrains: 55 },
  { id: 'BHRL', code: 'BHRL', name: 'Bharoli Jn', x: 30.83, y: 23.47, division: 'Jammu', verified: false },

  // ----------------------------------------------------
  // SECTION 2: KANGRA VALLEY (NARROW GAUGE LINE)
  // ----------------------------------------------------
  { id: 'DLSR', code: 'DLSR', name: 'Dalhousie Road', x: 31.58, y: 23.09, division: 'Jammu', verified: false },
  { id: 'NUPR', code: 'NUPR', name: 'Nurpur Road', x: 32.48, y: 23.44, division: 'Jammu', verified: false },
  { id: 'BLDL', code: 'BLDL', name: 'Balledapirlarath', x: 33.03, y: 23.87, division: 'Jammu', verified: false },
  { id: 'JWLS', code: 'JWLS', name: 'Jawanwala Shehar', x: 33.43, y: 24.5, division: 'Jammu', verified: false },
  { id: 'MGRP', code: 'MGRP', name: 'Meghrajpura', x: 33.73, y: 25.13, division: 'Jammu', verified: false },
  { id: 'BRHL', code: 'BRHL', name: 'Barial Himachal', x: 34.13, y: 25.85, division: 'Jammu', verified: false },
  { id: 'GULR', code: 'GULR', name: 'Guler', x: 34.63, y: 26.49, division: 'Jammu', verified: false },
  { id: 'TRPL', code: 'TRPL', name: 'Tripal', x: 35.28, y: 26.56, division: 'Jammu', verified: false },
  { id: 'KPLR', code: 'KPLR', name: 'Kopar Lahar', x: 35.78, y: 26.2, division: 'Jammu', verified: false },
  { id: 'KGMR', code: 'KGMR', name: 'Kangra Mandir', x: 36.33, y: 25.92, division: 'Jammu', verified: false },
  { id: 'NGRT', code: 'NGRT', name: 'Nagrota', x: 36.93, y: 25.78, division: 'Jammu', verified: false },
  { id: 'CMMG', code: 'CMMG', name: 'Chamunda Marg', x: 37.23, y: 25.85, division: 'Jammu', verified: false },
  { id: 'PLMX', code: 'PLMX', name: 'Palampur Himachal', x: 38.08, y: 26.27, division: 'Jammu', verified: false },
  { id: 'BJPL', code: 'BJPL', name: 'Baijnath Paprola', x: 39.28, y: 27.12, division: 'Jammu', verified: true, scheduledTrains: 12 },
  { id: 'JDNX', code: 'JDNX', name: 'Joginder Nagar', x: 39.93, y: 26.49, division: 'Jammu', verified: true, scheduledTrains: 8 },

  // ----------------------------------------------------
  // SECTION 3: PUNJAB MAINWAYS & BRANCH CORRIDORS
  // ----------------------------------------------------
  { id: 'SRM', code: 'SRM', name: 'Sarna', x: 30.47, y: 23.81, division: 'Firozpur', verified: false },
  { id: 'JK', code: 'JK', name: 'Jakolari', x: 30.28, y: 24.16, division: 'Firozpur', verified: false },
  { id: 'PMQ', code: 'PMQ', name: 'Parmanand', x: 29.92, y: 24.6, division: 'Firozpur', verified: false },
  { id: 'DNN', code: 'DNN', name: 'Dina Nagar', x: 29.57, y: 24.96, division: 'Firozpur', verified: false },
  { id: 'GSP', code: 'GSP', name: 'Gurdaspur', x: 29.22, y: 25.24, division: 'Firozpur', verified: false },
  { id: 'BAT', code: 'BAT', name: 'Batala Jn', x: 27.22, y: 27.94, division: 'Firozpur', verified: true, scheduledTrains: 36 },
  { id: 'DBNK', code: 'DBNK', name: 'Dera Baba Nanak', x: 25.48, y: 26.37, division: 'Firozpur', verified: true, scheduledTrains: 10 },
  { id: 'VKA', code: 'VKA', name: 'Verka Jn', x: 25.28, y: 29.45, division: 'Firozpur', verified: true, scheduledTrains: 42 },
  { id: 'ATARI', code: 'ATT', name: 'Atari Sham Singh', x: 22.78, y: 30.22, division: 'Firozpur', verified: true, scheduledTrains: 8 },
  { id: 'ASR', code: 'ASR', name: 'Amritsar Jn', x: 24.63, y: 29.94, division: 'Firozpur', verified: true, scheduledTrains: 135 },
  { id: 'BGTN', code: 'BGTN', name: 'Bhagtanwala', x: 24.83, y: 30.65, division: 'Firozpur', verified: false },
  { id: 'TNA', code: 'TTO', name: 'Tarn Taran Jn', x: 25.13, y: 31.64, division: 'Firozpur', verified: true, scheduledTrains: 30 },
  { id: 'KEMK', code: 'KEMK', name: 'Khem Karan', x: 22.33, y: 34.4, division: 'Firozpur', verified: true, scheduledTrains: 10 },
  { id: 'BEAS', code: 'BEAS', name: 'Beas Jn', x: 27.43, y: 31.03, division: 'Firozpur', verified: true, scheduledTrains: 88 },
  { id: 'JUC', code: 'JUC', name: 'Jalandhar City', x: 30.28, y: 33.24, division: 'Firozpur', verified: true, scheduledTrains: 110 },
  { id: 'JRC', code: 'JRC', name: 'Jalandhar Cantt', x: 30.78, y: 33.52, division: 'Firozpur', verified: true, scheduledTrains: 94 },
  { id: 'HSX', code: 'HSX', name: 'Hoshiarpur', x: 33.08, y: 31.1, division: 'Firozpur', verified: true, scheduledTrains: 18 },
  { id: 'PGW', code: 'PGW', name: 'Phagwara Jn', x: 31.68, y: 34.15, division: 'Ambala', verified: false },
  { id: 'PHR', code: 'PHR', name: 'Phillaur Jn', x: 39.93, y: 36.34, division: 'Firozpur', verified: true, scheduledTrains: 52 },
  { id: 'NSS', code: 'NSS', name: 'Nawanshahr Doaba', x: 34.73, y: 35.42, division: 'Firozpur', verified: true, scheduledTrains: 14 },
  { id: 'RHU', code: 'RHU', name: 'Rahon', x: 34.58, y: 36.2, division: 'Firozpur', verified: false },
  { id: 'NKD', code: 'NRO', name: 'Nakodar Jn', x: 29.73, y: 35.63, division: 'Firozpur', verified: true, scheduledTrains: 26 },
  { id: 'LNK', code: 'LNK', name: 'Lohian Khas Jn', x: 27.53, y: 35.14, division: 'Firozpur', verified: true, scheduledTrains: 30 },
  { id: 'SQR', code: 'SQR', name: 'Sultanpur Lodhi', x: 27.68, y: 34.71, division: 'Firozpur', verified: false },
  { id: 'FZR', code: 'FZR', name: 'Firozpur Cantt Jn', x: 22.18, y: 37.47, division: 'Firozpur', verified: true, scheduledTrains: 58 },
  { id: 'FZP', code: 'FZP', name: 'Firozpur City', x: 21.98, y: 36.91, division: 'Firozpur', verified: false },
  { id: 'FDK', code: 'FDK', name: 'Faridkot', x: 23.38, y: 39.81, division: 'Firozpur', verified: false },
  { id: 'KKP', code: 'KKP', name: 'Kotkapura Jn', x: 23.98, y: 41.15, division: 'Firozpur', verified: true, scheduledTrains: 36 },
  { id: 'MKS', code: 'MKS', name: 'Muktsar', x: 21.08, y: 42.43, division: 'Firozpur', verified: false },
  { id: 'FKA', code: 'FKA', name: 'Fazilka Jn', x: 17.23, y: 42.36, division: 'Firozpur', verified: true, scheduledTrains: 24 },
  { id: 'ABS', code: 'ABS', name: 'Abohar Jn', x: 17.73, y: 45.19, division: 'Firozpur', verified: true, scheduledTrains: 32 },
  { id: 'BTI', code: 'BTI', name: 'Bathinda Jn', x: 24.63, y: 44.9, division: 'Firozpur', verified: true, scheduledTrains: 92 },

  // ----------------------------------------------------
  // SECTION 4: AMBALA, CHANDIGARH, SHIMLA & HARYANA
  // ----------------------------------------------------
  { id: 'LDH', code: 'LDH', name: 'Ludhiana Jn', x: 32.33, y: 37.93, division: 'Ambala', verified: true, scheduledTrains: 155 },
  { id: 'KNN', code: 'KNN', name: 'Khanna', x: 35.68, y: 40.05, division: 'Ambala', verified: false },
  { id: 'SIR', code: 'SIR', name: 'Sirhind Jn', x: 36.98, y: 40.9, division: 'Ambala', verified: true, scheduledTrains: 78 },
  { id: 'NMDA', code: 'NMDA', name: 'New Morinda', x: 37.73, y: 39.13, division: 'Ambala', verified: false },
  { id: 'RPAR', code: 'RPAR', name: 'Rupnagar', x: 38.28, y: 36.51, division: 'Ambala', verified: false },
  { id: 'ANSB', code: 'ANSB', name: 'Anandpur Sahib', x: 37.73, y: 34.46, division: 'Ambala', verified: true, scheduledTrains: 26 },
  { id: 'NNGL', code: 'NLDM', name: 'Nangal Dam', x: 36.98, y: 33.54, division: 'Ambala', verified: false },
  { id: 'DLPC', code: 'DLPC', name: 'Daulatpur Chowk', x: 34.08, y: 28.5, division: 'Ambala', verified: true, scheduledTrains: 16 },
  { id: 'CDG', code: 'CDG', name: 'Chandigarh Jn', x: 40.33, y: 39.69, division: 'Ambala', verified: true, scheduledTrains: 85 },
  { id: 'KLK', code: 'KLK', name: 'Kalka', x: 41.13, y: 38.66, division: 'Ambala', verified: true, scheduledTrains: 40 },
  { id: 'SOL', code: 'SOL', name: 'Solan', x: 42.68, y: 37.81, division: 'Ambala', verified: false },
  { id: 'SML', code: 'SML', name: 'Shimla', x: 43.68, y: 35.83, division: 'Ambala', verified: true, scheduledTrains: 14 },
  { id: 'RPJ', code: 'RPJ', name: 'Rajpura Jn', x: 38.28, y: 42.13, division: 'Ambala', verified: true, scheduledTrains: 65 },
  { id: 'PTA', code: 'PTA', name: 'Patiala', x: 36.58, y: 43.94, division: 'Ambala', verified: true, scheduledTrains: 48 },
  { id: 'DUI', code: 'DUI', name: 'Dhuri Jn', x: 32.23, y: 43.3, division: 'Ambala', verified: true, scheduledTrains: 52 },
  { id: 'SAG', code: 'SAG', name: 'Sangrur', x: 32.13, y: 44.65, division: 'Ambala', verified: false },
  { id: 'JHL', code: 'JHL', name: 'Jakhal Jn', x: 31.88, y: 49.55, division: 'Delhi', verified: true, scheduledTrains: 44 },
  { id: 'JIND', code: 'JIND', name: 'Jind Jn', x: 35.73, y: 54.74, division: 'Delhi', verified: true, scheduledTrains: 48 },
  { id: 'ROK', code: 'ROK', name: 'Rohtak Jn', x: 37.68, y: 58.99, division: 'Delhi', verified: true, scheduledTrains: 65 },
  { id: 'UMB', code: 'UMB', name: 'Ambala Cantt Jn', x: 39.93, y: 43.7, division: 'Ambala', verified: true, scheduledTrains: 165 },
  { id: 'UBC', code: 'UBC', name: 'Ambala City', x: 39.58, y: 43.35, division: 'Ambala', verified: false },
  { id: 'KKDE', code: 'KKDE', name: 'Kurukshetra Jn', x: 40.23, y: 47.81, division: 'Delhi', verified: true, scheduledTrains: 75 },
  { id: 'PNP', code: 'PNP', name: 'Panipat Jn', x: 41.23, y: 54.25, division: 'Delhi', verified: true, scheduledTrains: 94 },
  { id: 'SNP', code: 'SNP', name: 'Sonipat', x: 41.63, y: 58.35, division: 'Delhi', verified: false },

  // ----------------------------------------------------
  // SECTION 5: DELHI AREA & DIRECT REACH
  // ----------------------------------------------------
  { id: 'DLI', code: 'DLI', name: 'Delhi Jn (Old Delhi)', x: 43.09, y: 62.18, division: 'Delhi', verified: true, scheduledTrains: 185 },
  { id: 'NDLS', code: 'NDLS', name: 'New Delhi', x: 43.15, y: 63.45, division: 'Delhi', verified: true, scheduledTrains: 245 },
  { id: 'HNZM', code: 'NZM', name: 'Hazrat Nizamuddin', x: 43.58, y: 63.42, division: 'Delhi', verified: true, scheduledTrains: 140 },
  { id: 'DEC', code: 'DEC', name: 'Delhi Cantt', x: 42.53, y: 62.49, division: 'Delhi', verified: true, scheduledTrains: 60 },
  { id: 'GGN', code: 'GGN', name: 'Gurgaon', x: 41.88, y: 63.72, division: 'Delhi', verified: true, scheduledTrains: 55 },
  { id: 'GHH', code: 'GHH', name: 'Garhi Harsaru Jn', x: 40.78, y: 64.14, division: 'Delhi', verified: true, scheduledTrains: 40 },
  { id: 'RE', code: 'RE', name: 'Rewari Jn', x: 37.63, y: 65.76, division: 'Delhi', verified: true, scheduledTrains: 80 },
  { id: 'GZB', code: 'GZB', name: 'Ghaziabad Jn', x: 45.03, y: 61.44, division: 'Delhi', verified: true, scheduledTrains: 210 },
  { id: 'MTC', code: 'MTC', name: 'Meerut City Jn', x: 47.1, y: 58, division: 'Delhi', verified: true, scheduledTrains: 78 },
  { id: 'MUT', code: 'MUT', name: 'Meerut Cantt', x: 47.25, y: 57.43, division: 'Delhi', verified: false },
  { id: 'MZN', code: 'MZN', name: 'Muzaffarnagar Jn', x: 47.38, y: 53.4, division: 'Delhi', verified: true, scheduledTrains: 86 },
  { id: 'DBD', code: 'DBD', name: 'Deoband', x: 46.88, y: 51.33, division: 'Delhi', verified: false },
  { id: 'TPZ', code: 'TPZ', name: 'Tapri Jn', x: 46.28, y: 48.8, division: 'Ambala', verified: true, scheduledTrains: 42 },
  { id: 'SRE', code: 'SRE', name: 'Saharanpur Jn', x: 46.28, y: 48.16, division: 'Ambala', verified: true, scheduledTrains: 120 },
  { id: 'YJUD', code: 'YJUD', name: 'Yamunanagar-Jagadhri', x: 44.23, y: 46.6, division: 'Ambala', verified: true, scheduledTrains: 82 },
  { id: 'HPU', code: 'HPU', name: 'Hapur Jn', x: 48.28, y: 60.76, division: 'Delhi', verified: true, scheduledTrains: 70 },
  { id: 'GMS', code: 'GMS', name: 'Garhmuktesar', x: 50.03, y: 60.27, division: 'Moradabad', verified: false },
  { id: 'GJL', code: 'GJL', name: 'Gajraula Jn', x: 51.73, y: 59.84, division: 'Moradabad', verified: true, scheduledTrains: 52 },

  // ----------------------------------------------------
  // SECTION 6: MORADABAD DIVISION & UTTARAKHAND
  // ----------------------------------------------------
  { id: 'RK', code: 'RK', name: 'Roorkee', x: 49.18, y: 49.75, division: 'Moradabad', verified: true, scheduledTrains: 76 },
  { id: 'LRJ', code: 'LRJ', name: 'Laksar Jn', x: 50.68, y: 51.09, division: 'Moradabad', verified: true, scheduledTrains: 65 },
  { id: 'HW', code: 'HW', name: 'Haridwar', x: 51.03, y: 48.64, division: 'Moradabad', verified: true, scheduledTrains: 74 },
  { id: 'RWL', code: 'RWL', name: 'Raiwala Jn', x: 51.38, y: 47.81, division: 'Moradabad', verified: true, scheduledTrains: 42 },
  { id: 'DDN', code: 'DDN', name: 'Dehradun', x: 50.28, y: 44.56, division: 'Moradabad', verified: true, scheduledTrains: 34 },
  { id: 'YNRK', code: 'YNRK', name: 'Yog Nagri Rishikesh', x: 51.83, y: 46.11, division: 'Moradabad', verified: true, scheduledTrains: 22 },
  { id: 'NBD', code: 'NBD', name: 'Najibabad Jn', x: 52.88, y: 52.34, division: 'Moradabad', verified: true, scheduledTrains: 58 },
  { id: 'KTW', code: 'KTW', name: 'Kotdwara', x: 54.73, y: 50.99, division: 'Moradabad', verified: false },
  { id: 'NGG', code: 'NGG', name: 'Nagina', x: 53.48, y: 53.8, division: 'Moradabad', verified: false },
  { id: 'DPR', code: 'DPR', name: 'Dhampur', x: 54.28, y: 55.14, division: 'Moradabad', verified: false },
  { id: 'SEO', code: 'SEO', name: 'Seohara', x: 54.83, y: 56.06, division: 'Moradabad', verified: false },
  { id: 'KNT', code: 'KNT', name: 'Kanth', x: 55.23, y: 57.33, division: 'Moradabad', verified: false },
  { id: 'MB', code: 'MB', name: 'Moradabad Jn', x: 56.28, y: 59.66, division: 'Moradabad', verified: true, scheduledTrains: 175 },
  { id: 'KGB', code: 'KGB', name: 'Katghar Jn', x: 56.68, y: 59.8, division: 'Moradabad', verified: false },
  { id: 'RJK', code: 'RJK', name: 'Raja Ka Sahaspur Jn', x: 56.58, y: 62.06, division: 'Moradabad', verified: true, scheduledTrains: 38 },
  { id: 'CH', code: 'CH', name: 'Chandausi Jn', x: 56.28, y: 64.64, division: 'Moradabad', verified: true, scheduledTrains: 42 },
  { id: 'RMU', code: 'RMU', name: 'Rampur Jn', x: 58.63, y: 60.25, division: 'Moradabad', verified: true, scheduledTrains: 64 },
  { id: 'BE', code: 'BE', name: 'Bareilly Jn', x: 61.68, y: 65.01, division: 'Moradabad', verified: true, scheduledTrains: 145 },
  { id: 'BRYC', code: 'BRYC', name: 'Bareilly Cantt', x: 61.98, y: 65.64, division: 'Moradabad', verified: false },
  { id: 'PMR', code: 'PMR', name: 'Pitamberpur', x: 62.58, y: 66.71, division: 'Moradabad', verified: false },
  { id: 'TLH', code: 'TLH', name: 'Tilhar', x: 64.18, y: 68.69, division: 'Moradabad', verified: false },
  { id: 'SPN', code: 'SPN', name: 'Shahjahanpur Jn', x: 65.83, y: 69.96, division: 'Moradabad', verified: true, scheduledTrains: 90 },
  { id: 'ROZA', code: 'ROZA', name: 'Roza Jn', x: 66.53, y: 70.6, division: 'Moradabad', verified: true, scheduledTrains: 45 },

  // ----------------------------------------------------
  // SECTION 7: LUCKNOW DIVISION
  // ----------------------------------------------------
  { id: 'AJI', code: 'AJI', name: 'Anjhi Shahabad', x: 66.58, y: 72.79, division: 'Moradabad', verified: false },
  { id: 'HRI', code: 'HRI', name: 'Hardoi', x: 68.23, y: 75.77, division: 'Lucknow', verified: true, scheduledTrains: 80 },
  { id: 'BLM', code: 'BLM', name: 'Balamau Jn', x: 70.23, y: 78.17, division: 'Lucknow', verified: true, scheduledTrains: 50 },
  { id: 'SPC', code: 'SPC', name: 'Sitapur City Jn', x: 72.48, y: 73.71, division: 'Lucknow', verified: true, scheduledTrains: 32 },
  { id: 'SAN', code: 'SAN', name: 'Sandila', x: 71.13, y: 78.95, division: 'Lucknow', verified: false },
  { id: 'LKO', code: 'LKO', name: 'Lucknow Charbagh', x: 73.88, y: 81.12, division: 'Lucknow', verified: true, scheduledTrains: 215 },
  { id: 'BBK', code: 'BBK', name: 'Barabanki Jn', x: 76.78, y: 80.27, division: 'Lucknow', verified: true, scheduledTrains: 95 },
  { id: 'RBL', code: 'RBL', name: 'Raebareli Jn', x: 77.38, y: 87.45, division: 'Lucknow', verified: true, scheduledTrains: 62 },
  { id: 'UCR', code: 'UCR', name: 'Unchahar Jn', x: 77.98, y: 90.35, division: 'Lucknow', verified: true, scheduledTrains: 36 },
  { id: 'AYC', code: 'AYC', name: 'Ayodhya Cantt', x: 84.68, y: 81.88, division: 'Lucknow', verified: true, scheduledTrains: 75 },
  { id: 'AY', code: 'AY', name: 'Ayodhya Dham', x: 85.78, y: 82.31, division: 'Lucknow', verified: true, scheduledTrains: 85 },
  { id: 'ABP', code: 'ABP', name: 'Akbarpur Jn', x: 88.53, y: 85.35, division: 'Lucknow', verified: true, scheduledTrains: 42 },
  { id: 'SLN', code: 'SLN', name: 'Sultanpur Jn', x: 84.38, y: 87.33, division: 'Lucknow', verified: true, scheduledTrains: 58 },
  { id: 'PBH', code: 'MBDP', name: 'Maa Belha Devi Dham Pratapgarh', x: 83.88, y: 90.87, division: 'Lucknow', verified: true, scheduledTrains: 66 },
  { id: 'JNU', code: 'JNU', name: 'Jaunpur Jn', x: 89.88, y: 92.01, division: 'Lucknow', verified: true, scheduledTrains: 70 },
  { id: 'ZBD', code: 'ZBD', name: 'Zafarabad Jn', x: 89.73, y: 92.06, division: 'Lucknow', verified: true, scheduledTrains: 38 }
];

export const INITIAL_EDGES: Edge[] = [
  // USBRL Valley Edge Sequence
  { id: 'e-brml-sxzm', from: 'BRML', to: 'SXZM', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sxzm-hme', from: 'SXZM', to: 'HME', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-hme-pttn', from: 'HME', to: 'PTTN', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pttn-mzma', from: 'PTTN', to: 'MZMA', distanceKm: 9, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mzma-ndam', from: 'MZMA', to: 'NDAM', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ndam-bdgm', from: 'NDAM', to: 'BDGM', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bdgm-sina', from: 'BDGM', to: 'SINA', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sina-pmpe', from: 'SINA', to: 'PMPE', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pmpe-kape', from: 'PMPE', to: 'KAPE', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kape-rpap', from: 'KAPE', to: 'RPAP', distanceKm: 4, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rpap-atpa', from: 'RPAP', to: 'ATPA', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-atpa-pjgm', from: 'ATPA', to: 'PJGM', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pjgm-bjba', from: 'PJGM', to: 'BJBA', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bjba-ant', from: 'BJBA', to: 'ANT', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ant-sdua', from: 'ANT', to: 'SDUA', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sdua-qg', from: 'SDUA', to: 'QG', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-qg-hrsb', from: 'QG', to: 'HRSB', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-hrsb-bahl', from: 'HRSB', to: 'BAHL', distanceKm: 12, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bahl-kari', from: 'BAHL', to: 'KARI', distanceKm: 14, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kari-smbr', from: 'KARI', to: 'SMBR', distanceKm: 14, lineType: 'BOTH', status: 'clear' },
  { id: 'e-smbr-svdn', from: 'SMBR', to: 'SVDN', distanceKm: 19, lineType: 'BOTH', status: 'clear' },
  { id: 'e-svdn-swke', from: 'SVDN', to: 'SWKE', distanceKm: 18, lineType: 'BOTH', status: 'clear' },
  { id: 'e-swke-duca', from: 'SWKE', to: 'DUCA', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-duca-bakk', from: 'DUCA', to: 'BAKK', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bakk-reasi', from: 'BAKK', to: 'REASI', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-reasi-svdk', from: 'REASI', to: 'SVDK', distanceKm: 17, lineType: 'BOTH', status: 'clear' },
  { id: 'e-svdk-crwl', from: 'SVDK', to: 'CRWL', distanceKm: 15, lineType: 'BOTH', status: 'clear' },
  { id: 'e-crwl-mctm', from: 'CRWL', to: 'MCTM', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mctm-rmjk', from: 'MCTM', to: 'RMJK', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rmjk-mnvl', from: 'RMJK', to: 'MNVL', distanceKm: 12, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mnvl-sgrr', from: 'MNVL', to: 'SGRR', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sgrr-bla', from: 'SGRR', to: 'BLA', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bla-jat', from: 'BLA', to: 'JAT', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-jat-bbmn', from: 'JAT', to: 'BBMN', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bbmn-vjpj', from: 'BBMN', to: 'VJPJ', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-vjpj-smbx', from: 'VJPJ', to: 'SMBX', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-smbx-ghgl', from: 'SMBX', to: 'GHGL', distanceKm: 9, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ghgl-hrnr', from: 'GHGL', to: 'HRNR', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-hrnr-ckdl', from: 'HRNR', to: 'CKDL', distanceKm: 4, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ckdl-chnr', from: 'CKDL', to: 'CHNR', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-chnr-bdhy', from: 'CHNR', to: 'BDHY', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bdhy-kthu', from: 'BDHY', to: 'KTHU', distanceKm: 12, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kthu-mdpb', from: 'KTHU', to: 'MDPB', distanceKm: 15, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mdpb-sjnp', from: 'MDPB', to: 'SJNP', distanceKm: 4, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sjnp-ptk', from: 'SJNP', to: 'PTK', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ptk-ptkc', from: 'PTK', to: 'PTKC', distanceKm: 4, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ptk-bhrl', from: 'PTK', to: 'BHRL', distanceKm: 3, lineType: 'BOTH', status: 'clear' },

  // Kangra Valley Narrow Gauge Route
  { id: 'e-ptk-dlsr', from: 'PTK', to: 'DLSR', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-dlsr-nupr', from: 'DLSR', to: 'NUPR', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nupr-bldl', from: 'NUPR', to: 'BLDL', distanceKm: 14, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bldl-jwls', from: 'BLDL', to: 'JWLS', distanceKm: 12, lineType: 'BOTH', status: 'clear' },
  { id: 'e-jwls-mgrp', from: 'JWLS', to: 'MGRP', distanceKm: 14, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mgrp-brhl', from: 'MGRP', to: 'BRHL', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-brhl-gulr', from: 'BRHL', to: 'GULR', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-gulr-trpl', from: 'GULR', to: 'TRPL', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-trpl-kplr', from: 'TRPL', to: 'KPLR', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kplr-kgmr', from: 'KPLR', to: 'KGMR', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kgmr-ngrt', from: 'KGMR', to: 'NGRT', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ngrt-cmmg', from: 'NGRT', to: 'CMMG', distanceKm: 4, lineType: 'BOTH', status: 'clear' },
  { id: 'e-cmmg-plmx', from: 'CMMG', to: 'PLMX', distanceKm: 15, lineType: 'BOTH', status: 'clear' },
  { id: 'e-plmx-bjpl', from: 'PLMX', to: 'BJPL', distanceKm: 14, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bjpl-jdnx', from: 'BJPL', to: 'JDNX', distanceKm: 22, lineType: 'BOTH', status: 'clear' },

  // Punjab Corridors
  { id: 'e-bhrl-srm', from: 'BHRL', to: 'SRM', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-srm-jk', from: 'SRM', to: 'JK', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-jk-pmq', from: 'JK', to: 'PMQ', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pmq-dnn', from: 'PMQ', to: 'DNN', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-dnn-gsp', from: 'DNN', to: 'GSP', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-gsp-bat', from: 'GSP', to: 'BAT', distanceKm: 36, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bat-dbnk', from: 'BAT', to: 'DBNK', distanceKm: 32, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bat-vka', from: 'BAT', to: 'VKA', distanceKm: 31, lineType: 'BOTH', status: 'clear' },
  { id: 'e-vka-asr', from: 'VKA', to: 'ASR', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-asr-att', from: 'ASR', to: 'ATARI', distanceKm: 25, lineType: 'BOTH', status: 'clear' },
  { id: 'e-asr-bgtn', from: 'ASR', to: 'BGTN', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bgtn-tna', from: 'BGTN', to: 'TNA', distanceKm: 20, lineType: 'BOTH', status: 'clear' },
  { id: 'e-tna-kemk', from: 'TNA', to: 'KEMK', distanceKm: 48, lineType: 'BOTH', status: 'clear' },
  { id: 'e-asr-beas', from: 'ASR', to: 'BEAS', distanceKm: 42, lineType: 'BOTH', status: 'clear' },
  { id: 'e-beas-juc', from: 'BEAS', to: 'JUC', distanceKm: 36, lineType: 'BOTH', status: 'clear' },
  { id: 'e-juc-hsx', from: 'JUC', to: 'HSX', distanceKm: 43, lineType: 'BOTH', status: 'clear' },
  { id: 'e-juc-jrc', from: 'JUC', to: 'JRC', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-jrc-pgw', from: 'JRC', to: 'PGW', distanceKm: 16, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pgw-phr', from: 'PGW', to: 'PHR', distanceKm: 22, lineType: 'BOTH', status: 'clear' },
  { id: 'e-phr-ldh', from: 'PHR', to: 'LDH', distanceKm: 13, lineType: 'BOTH', status: 'clear' },
  { id: 'e-phr-nss', from: 'PHR', to: 'NSS', distanceKm: 30, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nss-rhu', from: 'NSS', to: 'RHU', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-juc-nkd', from: 'JUC', to: 'NKD', distanceKm: 32, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nkd-lnk', from: 'NKD', to: 'LNK', distanceKm: 28, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lnk-sqr', from: 'LNK', to: 'SQR', distanceKm: 12, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lnk-fzr', from: 'LNK', to: 'FZR', distanceKm: 65, lineType: 'UP', status: 'clear' },
  { id: 'e-fzr-fzp', from: 'FZR', to: 'FZP', distanceKm: 4, lineType: 'BOTH', status: 'clear' },
  { id: 'e-fzp-fdk', from: 'FZP', to: 'FDK', distanceKm: 28, lineType: 'BOTH', status: 'clear' },
  { id: 'e-fdk-kkp', from: 'FDK', to: 'KKP', distanceKm: 13, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kkp-mks', from: 'KKP', to: 'MKS', distanceKm: 26, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mks-fka', from: 'MKS', to: 'FKA', distanceKm: 42, lineType: 'BOTH', status: 'clear' },
  { id: 'e-fka-abs', from: 'FKA', to: 'ABS', distanceKm: 32, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kkp-bti', from: 'KKP', to: 'BTI', distanceKm: 43, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bti-abs', from: 'BTI', to: 'ABS', distanceKm: 76, lineType: 'BOTH', status: 'clear' },

  // Trunk Line Ambala - Kalka / Delhi
  { id: 'e-ldh-knn', from: 'LDH', to: 'KNN', distanceKm: 43, lineType: 'BOTH', status: 'clear' },
  { id: 'e-knn-sir', from: 'KNN', to: 'SIR', distanceKm: 17, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sir-nmda', from: 'SIR', to: 'NMDA', distanceKm: 24, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nmda-rpar', from: 'NMDA', to: 'RPAR', distanceKm: 16, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rpar-ansb', from: 'RPAR', to: 'ANSB', distanceKm: 35, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ansb-nngl', from: 'ANSB', to: 'NNGL', distanceKm: 16, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nngl-dlpc', from: 'NNGL', to: 'DLPC', distanceKm: 42, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sir-rpj', from: 'SIR', to: 'RPJ', distanceKm: 25, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rpj-cdg', from: 'RPJ', to: 'CDG', distanceKm: 38, lineType: 'BOTH', status: 'clear' },
  { id: 'e-cdg-klk', from: 'CDG', to: 'KLK', distanceKm: 28, lineType: 'BOTH', status: 'clear' },
  { id: 'e-klk-sol', from: 'KLK', to: 'SOL', distanceKm: 39, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sol-sml', from: 'SOL', to: 'SML', distanceKm: 56, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rpj-pta', from: 'RPJ', to: 'PTA', distanceKm: 27, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pta-dui', from: 'PTA', to: 'DUI', distanceKm: 53, lineType: 'BOTH', status: 'clear' },
  { id: 'e-dui-sag', from: 'DUI', to: 'SAG', distanceKm: 16, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sag-jhl', from: 'SAG', to: 'JHL', distanceKm: 51, lineType: 'BOTH', status: 'clear' },
  { id: 'e-jhl-jind', from: 'JHL', to: 'JIND', distanceKm: 72, lineType: 'BOTH', status: 'clear' },
  { id: 'e-jind-rok', from: 'JIND', to: 'ROK', distanceKm: 57, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rok-dli', from: 'ROK', to: 'DLI', distanceKm: 70, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rpj-ubc', from: 'RPJ', to: 'UBC', distanceKm: 20, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ubc-umb', from: 'UBC', to: 'UMB', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-cdg-umb', from: 'CDG', to: 'UMB', distanceKm: 45, lineType: 'BOTH', status: 'clear' },
  { id: 'e-umb-kkde', from: 'UMB', to: 'KKDE', distanceKm: 42, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kkde-pnp', from: 'KKDE', to: 'PNP', distanceKm: 67, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pnp-snp', from: 'PNP', to: 'SNP', distanceKm: 44, lineType: 'BOTH', status: 'clear' },
  { id: 'e-snp-dli', from: 'SNP', to: 'DLI', distanceKm: 44, lineType: 'BOTH', status: 'clear' },

  // Saharanpur, Meerut & Moradabad
  { id: 'e-umb-yjud', from: 'UMB', to: 'YJUD', distanceKm: 51, lineType: 'BOTH', status: 'clear' },
  { id: 'e-yjud-sre', from: 'YJUD', to: 'SRE', distanceKm: 30, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sre-tpz', from: 'SRE', to: 'TPZ', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-tpz-dbd', from: 'TPZ', to: 'DBD', distanceKm: 28, lineType: 'BOTH', status: 'clear' },
  { id: 'e-dbd-mzn', from: 'DBD', to: 'MZN', distanceKm: 24, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mzn-mut', from: 'MZN', to: 'MUT', distanceKm: 52, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mut-mtc', from: 'MUT', to: 'MTC', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mtc-gzb', from: 'MTC', to: 'GZB', distanceKm: 47, lineType: 'BOTH', status: 'clear' },
  { id: 'e-tpz-rk', from: 'TPZ', to: 'RK', distanceKm: 35, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rk-lrj', from: 'RK', to: 'LRJ', distanceKm: 19, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lrj-hw', from: 'LRJ', to: 'HW', distanceKm: 27, lineType: 'BOTH', status: 'clear' },
  { id: 'e-hw-rwl', from: 'HW', to: 'RWL', distanceKm: 11, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rwl-ddn', from: 'RWL', to: 'DDN', distanceKm: 41, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rwl-ynrk', from: 'RWL', to: 'YNRK', distanceKm: 12, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lrj-nbd', from: 'LRJ', to: 'NBD', distanceKm: 42, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nbd-ktw', from: 'NBD', to: 'KTW', distanceKm: 24, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nbd-ngg', from: 'NBD', to: 'NGG', distanceKm: 22, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ngg-dpr', from: 'NGG', to: 'DPR', distanceKm: 17, lineType: 'BOTH', status: 'clear' },
  { id: 'e-dpr-seo', from: 'DPR', to: 'SEO', distanceKm: 14, lineType: 'BOTH', status: 'clear' },
  { id: 'e-seo-knt', from: 'SEO', to: 'KNT', distanceKm: 16, lineType: 'BOTH', status: 'clear' },
  { id: 'e-knt-mb', from: 'KNT', to: 'MB', distanceKm: 29, lineType: 'BOTH', status: 'clear' },

  // Delhi Core Connections
  { id: 'e-dli-ndls', from: 'DLI', to: 'NDLS', distanceKm: 4, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ndls-hnzm', from: 'NDLS', to: 'HNZM', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ndls-dec', from: 'NDLS', to: 'DEC', distanceKm: 15, lineType: 'BOTH', status: 'clear' },
  { id: 'e-dec-ggn', from: 'DEC', to: 'GGN', distanceKm: 17, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ggn-ghh', from: 'GGN', to: 'GHH', distanceKm: 10, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ghh-re', from: 'GHH', to: 'RE', distanceKm: 43, lineType: 'BOTH', status: 'clear' },
  { id: 'e-dli-gzb', from: 'DLI', to: 'GZB', distanceKm: 20, lineType: 'BOTH', status: 'clear' },
  { id: 'e-gzb-hpu', from: 'GZB', to: 'HPU', distanceKm: 37, lineType: 'BOTH', status: 'clear' },
  { id: 'e-hpu-gms', from: 'HPU', to: 'GMS', distanceKm: 31, lineType: 'BOTH', status: 'clear' },
  { id: 'e-gms-gjl', from: 'GMS', to: 'GJL', distanceKm: 21, lineType: 'BOTH', status: 'clear' },
  { id: 'e-gjl-mb', from: 'GJL', to: 'MB', distanceKm: 53, lineType: 'BOTH', status: 'clear' },

  // Moradabad to Lucknow Segment
  { id: 'e-mb-kgb', from: 'MB', to: 'KGB', distanceKm: 4, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kgb-rjk', from: 'KGB', to: 'RJK', distanceKm: 21, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rjk-ch', from: 'RJK', to: 'CH', distanceKm: 27, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kgb-rmu', from: 'KGB', to: 'RMU', distanceKm: 24, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rmu-be', from: 'RMU', to: 'BE', distanceKm: 63, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ch-be', from: 'CH', to: 'BE', distanceKm: 67, lineType: 'BOTH', status: 'clear' },
  { id: 'e-be-bryc', from: 'BE', to: 'BRYC', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bryc-pmr', from: 'BRYC', to: 'PMR', distanceKm: 15, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pmr-tlh', from: 'PMR', to: 'TLH', distanceKm: 33, lineType: 'BOTH', status: 'clear' },
  { id: 'e-tlh-spn', from: 'TLH', to: 'SPN', distanceKm: 23, lineType: 'BOTH', status: 'clear' },
  { id: 'e-spn-roza', from: 'SPN', to: 'ROZA', distanceKm: 8, lineType: 'BOTH', status: 'clear' },
  { id: 'e-roza-aji', from: 'ROZA', to: 'AJI', distanceKm: 22, lineType: 'BOTH', status: 'clear' },
  { id: 'e-aji-hri', from: 'AJI', to: 'HRI', distanceKm: 39, lineType: 'BOTH', status: 'clear' },
  { id: 'e-hri-blm', from: 'HRI', to: 'BLM', distanceKm: 38, lineType: 'BOTH', status: 'clear' },
  { id: 'e-blm-spc', from: 'BLM', to: 'SPC', distanceKm: 67, lineType: 'BOTH', status: 'clear' },
  { id: 'e-blm-san', from: 'BLM', to: 'SAN', distanceKm: 21, lineType: 'BOTH', status: 'clear' },
  { id: 'e-san-lko', from: 'SAN', to: 'LKO', distanceKm: 48, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lko-bbk', from: 'LKO', to: 'BBK', distanceKm: 29, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bbk-ayc', from: 'BBK', to: 'AYC', distanceKm: 99, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ayc-ay', from: 'AYC', to: 'AY', distanceKm: 7, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ay-abp', from: 'AY', to: 'ABP', distanceKm: 55, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lko-rbl', from: 'LKO', to: 'RBL', distanceKm: 78, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rbl-ucr', from: 'RBL', to: 'UCR', distanceKm: 38, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lko-sln', from: 'LKO', to: 'SLN', distanceKm: 140, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sln-pbh', from: 'SLN', to: 'PBH', distanceKm: 40, lineType: 'BOTH', status: 'clear' },
  { id: 'e-pbh-jnu', from: 'PBH', to: 'JNU', distanceKm: 60, lineType: 'BOTH', status: 'clear' },
  { id: 'e-jnu-zbd', from: 'JNU', to: 'ZBD', distanceKm: 6, lineType: 'BOTH', status: 'clear' }
];

export default function NetworkGraphClient() {
  const [stations] = useState<Station[]>(INITIAL_STATIONS);
  const [edges] = useState<Edge[]>(INITIAL_EDGES);
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showAllStations, setShowAllStations] = useState<boolean>(true);

  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const MAP_WIDTH = 9934;
  const MAP_HEIGHT = 7017;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 6));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.4));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      if (!showAllStations && !station.verified) return false;
      const matchesDivision = selectedDivision === 'ALL' || station.division === selectedDivision;
      const matchesSearch = station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDivision && matchesSearch;
    });
  }, [stations, selectedDivision, searchTerm, showAllStations]);

  const getEdgeColor = (status: Edge['status']) => {
    switch (status) {
      case 'clear': return '#10B981';
      case 'block-active': return '#EF4444';
      case 'conflict': return '#F59E0B';
      case 'maintenance-done': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  return (
    <div className="relative w-full h-[85vh] bg-slate-950 text-slate-100 rounded-xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden">

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/90 border-b border-slate-800 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide">NORTHERN RAILWAY LIVE TOPOLOGY</h2>
            <p className="text-xs text-slate-400">{filteredStations.length} of {stations.length} Station Nodes • Full Map Grid</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search station or code (e.g. SRE, SVDK)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-red-500 w-56"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Divisions</option>
              <option value="Delhi">Delhi</option>
              <option value="Ambala">Ambala</option>
              <option value="Firozpur">Firozpur</option>
              <option value="Lucknow">Lucknow</option>
              <option value="Moradabad">Moradabad</option>
            </select>
          </div>

          <button
            onClick={() => setShowAllStations(prev => !prev)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${showAllStations
                ? 'bg-red-600/20 border-red-500/40 text-red-300'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {showAllStations ? 'All Stations' : 'Major Junctions Only'}
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-1">
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition" title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Pan/Zoom Interactive Map Surface */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-slate-950 flex items-center justify-center select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          className="relative transition-transform duration-75 ease-out origin-center flex-shrink-0"
          style={{
            width: '2000px',
            aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}`,
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
          }}
        >
          {/* Base System Map */}
          <img
            src="/nr-system-map.png"
            alt="Northern Railway System Map"
            className="w-full h-full object-fill block pointer-events-none"
          />

          {/* SVG Micro-line Tracks */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {edges.map(edge => {
              const fromSt = stations.find(s => s.id === edge.from);
              const toSt = stations.find(s => s.id === edge.to);
              if (!fromSt || !toSt) return null;
              const fromVisible = filteredStations.some(s => s.id === fromSt.id);
              const toVisible = filteredStations.some(s => s.id === toSt.id);
              if (!fromVisible || !toVisible) return null;

              return (
                <line
                  key={edge.id}
                  x1={`${fromSt.x}`}
                  y1={`${fromSt.y}`}
                  x2={`${toSt.x}`}
                  y2={`${toSt.y}`}
                  stroke={getEdgeColor(edge.status)}
                  strokeWidth="0.14"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={edge.status === 'block-active' ? '2.5 1.5' : 'none'}
                />
              );
            })}
          </svg>

          {/* Calibrated Small Node Markers */}
          <div className="absolute inset-0 pointer-events-none">
            {filteredStations.map(station => (
              <div
                key={station.id}
                onClick={(e) => { e.stopPropagation(); setSelectedStation(station); }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto"
                style={{ left: `${station.x}%`, top: `${station.y}%` }}
              >
                {/* Station Node Dot */}
                <div className={`relative flex items-center justify-center rounded-full border transition-transform duration-150 ${station.verified ? 'w-1.5 h-1.5 border-black/90' : 'w-1 h-1 border-slate-700'
                  } ${(station.activeBlocks ?? 0) > 0
                    ? 'bg-red-500 border-white shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse scale-125'
                    : station.verified
                      ? 'bg-amber-400 group-hover:scale-150 group-hover:bg-amber-300'
                      : 'bg-slate-400 group-hover:scale-125'
                  }`}>
                  {station.verified && (
                    <span className="w-0.5 h-0.5 rounded-full bg-black/80"></span>
                  )}
                </div>

                {/* Station Micro Label */}
                {station.verified && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-700/80 px-0.5 py-[0.5px] rounded text-[6px] font-mono font-bold text-slate-200 whitespace-nowrap shadow pointer-events-none group-hover:z-30 group-hover:bg-slate-900">
                    {station.code}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pop-up Info Window */}
      {selectedStation && (
        <div className="absolute right-4 bottom-14 w-80 bg-slate-900/95 border border-slate-700 rounded-xl p-4 shadow-2xl z-20 backdrop-blur-md animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <h3 className="font-bold text-sm">{selectedStation.name} ({selectedStation.code})</h3>
            </div>
            <button onClick={() => setSelectedStation(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Division:</span>
              <span className="font-medium text-slate-200">{selectedStation.division}</span>
            </div>
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Map Coordinates:</span>
              <span className="font-mono text-slate-300">x: {selectedStation.x}%, y: {selectedStation.y}%</span>
            </div>
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Classification:</span>
              <span className={`font-medium uppercase ${selectedStation.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                {selectedStation.verified ? 'Major Junction' : 'Intermediate Waypoint'}
              </span>
            </div>
            {selectedStation.verified && (
              <>
                <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Active Blocks:</span>
                  <span className={`font-bold ${(selectedStation.activeBlocks ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedStation.activeBlocks ?? 0} Block(s)
                  </span>
                </div>
                <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Daily Trains:</span>
                  <span className="font-medium text-slate-200">{selectedStation.scheduledTrains ?? '—'}</span>
                </div>
              </>
            )}
          </div>

          {selectedStation.verified && (
            <button
              onClick={() => alert(`Fetching live telemetry and interlocking status for ${selectedStation.name}...`)}
              className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-medium text-xs py-2 rounded-lg transition shadow-lg shadow-red-600/20"
            >
              Request Section Clear / Inspect Telemetry
            </button>
          )}
        </div>
      )}

      {/* Legend Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 z-10">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Clear Line</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Block Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Conflict Warning</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Maintenance Done</span>
        </div>
        <div>Drag to Pan • Zoom in to inspect intermediate track waypoints</div>
      </div>

    </div>
  );
}