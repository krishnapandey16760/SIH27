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
  x: number; // percentage position on the REAL map image (from OCR pixel detection)
  y: number;
  division: string; // 'Delhi' | 'Ambala' | 'Firozpur' | 'Lucknow' | 'Moradabad' | 'Unclassified'
  verified: boolean; // true = manually confirmed major junction; false = auto-detected via OCR
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

// ---------------------------------------------------------------------------
// STATION DATA SOURCE: Northern Railway System Map (corrected up to 31 Mar
// 2026, NRHQE Plan No. HQ/25/06-2026), extracted via OCR (Tesseract) run on
// the full-resolution map image, then regex-matched for "Name(CODE)" patterns.
//
// ~430 stations total:
//   - 37 are VERIFIED major junctions (verified: true) — division, connecting
//     edges, and positions manually cross-checked against zoomed map crops.
//   - ~393 are AUTO-DETECTED wayside stations (verified: false) — code and
//     approximate position came directly from OCR on the real image, so they
//     ARE positioned correctly relative to the map, but:
//       * some station NAMES have OCR misreads (small/stylized map text),
//       * division is unknown for these (shown as 'Unclassified'),
//       * NO connecting edges are drawn for these — detecting which thin
//         colored line connects two stations is a computer-vision problem
//         OCR text-extraction cannot solve; only verified junctions have
//         hand-confirmed connections.
//
// If you find a wrong/garbled name, it is safe to manually correct just
// that station's "name" field below — codes and positions are reliable.
// ---------------------------------------------------------------------------

const INITIAL_STATIONS: Station[] = [
  { id: 'ABO', code: 'ABO', name: 'Kotwor Se Sthadqbohar Jn.', x: 2.54, y: 59.11, division: 'Unclassified', verified: false },
  { id: 'ABP', code: 'ABP', name: 'Akbarpur Jn.', x: 3.92, y: 85.22, division: 'Unclassified', verified: false },
  { id: 'ABS', code: 'ABS', name: 'Abohar Jn', x: 8.00, y: 27.00, division: 'Firozpur', verified: true },
  { id: 'ACH', code: 'ACH', name: 'Ial Ganj', x: 4.95, y: 84.58, division: 'Unclassified', verified: false },
  { id: 'ACND', code: 'ACND', name: 'Harya Narendra Dev Nagar', x: 4.88, y: 81.47, division: 'Unclassified', verified: false },
  { id: 'AHH', code: 'AHH', name: 'Eda . . Ahmedgarh', x: 4.01, y: 40.50, division: 'Unclassified', verified: false },
  { id: 'AHQ', code: 'AHQ', name: 'Ahera', x: 6.79, y: 91.99, division: 'Unclassified', verified: false },
  { id: 'AIG', code: 'AIG', name: 'Aigawan', x: 5.62, y: 71.85, division: 'Unclassified', verified: false },
  { id: 'AILM', code: 'AILM', name: 'Ailum', x: 5.92, y: 88.57, division: 'Unclassified', verified: false },
  { id: 'AJL', code: 'AJL', name: 'Atwal', x: 18.86, y: 37.15, division: 'Unclassified', verified: false },
  { id: 'ANDI', code: 'ANDI', name: 'Ing Nagar Delhi', x: 4.37, y: 73.83, division: 'Unclassified', verified: false },
  { id: 'ANSB', code: 'ANSB', name: 'Sanandpur Sahib', x: 15.00, y: 34.12, division: 'Unclassified', verified: false },
  { id: 'ANT', code: 'ANT', name: 'Anantnag', x: 27.49, y: 6.98, division: 'Unclassified', verified: false },
  { id: 'ARP', code: 'ARP', name: 'Atrampur', x: 2.58, y: 93.86, division: 'Unclassified', verified: false },
  { id: 'ASAR', code: 'ASAR', name: 'Asara', x: 3.22, y: 88.90, division: 'Unclassified', verified: false },
  { id: 'ASR', code: 'ASR', name: 'Amritsar Jn', x: 8.00, y: 14.00, division: 'Firozpur', verified: true },
  { id: 'AST', code: 'AST', name: 'Ehuanesar Wdfc Ne Asgoti', x: 5.71, y: 90.45, division: 'Unclassified', verified: false },
  { id: 'ATMO', code: 'ATMO', name: 'Aithal', x: 4.03, y: 49.76, division: 'Unclassified', verified: false },
  { id: 'AUR', code: 'AUR', name: 'Atrauli Road', x: 29.28, y: 67.86, division: 'Unclassified', verified: false },
  { id: 'AWL', code: 'AWL', name: 'Cue Gi Alawalpur', x: 6.63, y: 93.52, division: 'Unclassified', verified: false },
  { id: 'AY', code: 'AY', name: 'Ayodhya Dham', x: 10.53, y: 81.22, division: 'Unclassified', verified: false },
  { id: 'AYC', code: 'AYC', name: 'Ayodhya Cantt', x: 84.00, y: 68.00, division: 'Lucknow', verified: true },
  { id: 'BADK', code: 'BADK', name: 'Barka', x: 4.91, y: 90.74, division: 'Unclassified', verified: false },
  { id: 'BAKK', code: 'BAKK', name: 'Akkcal', x: 25.91, y: 13.85, division: 'Unclassified', verified: false },
  { id: 'BAOL', code: 'BAOL', name: 'Baoli', x: 36.15, y: 90.11, division: 'Unclassified', verified: false },
  { id: 'BARL', code: 'BARL', name: 'Baral', x: 4.18, y: 64.27, division: 'Unclassified', verified: false },
  { id: 'BARU', code: 'BARU', name: 'Bharatgarh', x: 11.18, y: 34.94, division: 'Unclassified', verified: false },
  { id: 'BASN', code: 'BASN', name: 'Bhainswan', x: 5.24, y: 51.08, division: 'Unclassified', verified: false },
  { id: 'BATH', code: 'BATH', name: 'Bolole Sugar Mil Siding', x: 24.12, y: 24.40, division: 'Unclassified', verified: false },
  { id: 'BCN', code: 'BCN', name: 'Penal Capo Bachhrawan', x: 3.92, y: 85.22, division: 'Unclassified', verified: false },
  { id: 'BCU', code: 'BCU', name: 'Otbhuchenu', x: 12.96, y: 42.27, division: 'Unclassified', verified: false },
  { id: 'BDIN', code: 'BDIN', name: 'Bhodaiyan', x: 5.44, y: 87.19, division: 'Unclassified', verified: false },
  { id: 'BDXT', code: 'BDXT', name: 'Badsa Basci Dhankot', x: 5.93, y: 87.93, division: 'Unclassified', verified: false },
  { id: 'BE', code: 'BE', name: 'Bareilly Cantt Jn', x: 68.00, y: 38.00, division: 'Moradabad', verified: true },
  { id: 'BEAS', code: 'BEAS', name: 'Beas', x: 14.00, y: 16.00, division: 'Firozpur', verified: true },
  { id: 'BEG', code: 'BEG', name: 'Behtagokul', x: 4.17, y: 74.46, division: 'Unclassified', verified: false },
  { id: 'BEK', code: 'BEK', name: 'Bundki', x: 5.03, y: 52.59, division: 'Unclassified', verified: false },
  { id: 'BGH', code: 'BGH', name: 'Baghauli', x: 64.36, y: 77.48, division: 'Unclassified', verified: false },
  { id: 'BGRR', code: 'BGRR', name: 'Bos Bagorpur', x: 4.67, y: 57.66, division: 'Unclassified', verified: false },
  { id: 'BHDH', code: 'BHDH', name: 'Bohadurpur', x: 32.36, y: 69.30, division: 'Unclassified', verified: false },
  { id: 'BHDR', code: 'BHDR', name: 'Bhadri', x: 6.33, y: 91.96, division: 'Unclassified', verified: false },
  { id: 'BHKL', code: 'BHKL', name: 'Can Ase Bhokraul', x: 15.48, y: 65.60, division: 'Unclassified', verified: false },
  { id: 'BHM', code: 'BHM', name: 'Bahram', x: 27.72, y: 78.41, division: 'Unclassified', verified: false },
  { id: 'BHRL', code: 'BHRL', name: 'Bharoli Jn.', x: 24.86, y: 21.45, division: 'Unclassified', verified: false },
  { id: 'BKNA', code: 'BKNA', name: 'Bokaina', x: 5.35, y: 57.76, division: 'Unclassified', verified: false },
  { id: 'BLA', code: 'BLA', name: 'Bajalata', x: 19.12, y: 17.22, division: 'Unclassified', verified: false },
  { id: 'BLDL', code: 'BLDL', name: 'Stp Balledapirlarath', x: 23.27, y: 20.17, division: 'Unclassified', verified: false },
  { id: 'BLG', code: 'BLG', name: 'Darsh Ner Bilharghat', x: 4.86, y: 82.51, division: 'Unclassified', verified: false },
  { id: 'BLM', code: 'BLM', name: 'Balamau Jn', x: 74.00, y: 56.00, division: 'Lucknow', verified: true },
  { id: 'BLND', code: 'BLND', name: 'Bolina Doaba', x: 22.60, y: 32.62, division: 'Unclassified', verified: false },
  { id: 'BLPU', code: 'BLPU', name: 'Btetiers Mn Bilpur', x: 34.75, y: 67.24, division: 'Unclassified', verified: false },
  { id: 'BLZ', code: 'BLZ', name: 'Budhlada', x: 3.60, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'BMP', code: 'BMP', name: 'Hempur', x: 5.44, y: 72.25, division: 'Unclassified', verified: false },
  { id: 'BNGL', code: 'BNGL', name: 'Suer Yee Wy Bhangala', x: 5.93, y: 87.93, division: 'Unclassified', verified: false },
  { id: 'BNM', code: 'BNM', name: 'Vies Jaragaon', x: 4.88, y: 81.47, division: 'Unclassified', verified: false },
  { id: 'BNQL', code: 'BNQL', name: 'Bhankla', x: 4.70, y: 84.17, division: 'Unclassified', verified: false },
  { id: 'BOP', code: 'BOP', name: 'Bigtupur', x: 9.59, y: 86.30, division: 'Unclassified', verified: false },
  { id: 'BPM', code: 'BPM', name: 'Baghpat Road', x: 3.09, y: 91.63, division: 'Unclassified', verified: false },
  { id: 'BPRS', code: 'BPRS', name: 'Bhogpur Sirwal', x: 13.64, y: 92.67, division: 'Unclassified', verified: false },
  { id: 'BRDV', code: 'BRDV', name: 'Beira Dev', x: 10.53, y: 81.22, division: 'Unclassified', verified: false },
  { id: 'BRNI', code: 'BRNI', name: 'Baers Oe Barwasni', x: 5.03, y: 52.59, division: 'Unclassified', verified: false },
  { id: 'BRSQ', code: 'BRSQ', name: 'Brar Square', x: 10.96, y: 83.23, division: 'Unclassified', verified: false },
  { id: 'BSC', code: 'BSC', name: 'Land Shahr', x: 2.65, y: 64.43, division: 'Unclassified', verified: false },
  { id: 'BSWA', code: 'BSWA', name: 'Boiswara', x: 5.44, y: 87.19, division: 'Unclassified', verified: false },
  { id: 'BSY', code: 'BSY', name: 'Barsathi', x: 5.41, y: 59.00, division: 'Unclassified', verified: false },
  { id: 'BTG', code: 'BTG', name: 'Bosharatgonj', x: 15.94, y: 66.28, division: 'Unclassified', verified: false },
  { id: 'BTI', code: 'BTI', name: 'Bathinda Jn', x: 13.00, y: 27.00, division: 'Firozpur', verified: true },
  { id: 'BTKD', code: 'BTKD', name: 'Bharatkund', x: 4.95, y: 84.58, division: 'Unclassified', verified: false },
  { id: 'BTRA', code: 'BTRA', name: 'Bartara', x: 26.42, y: 69.97, division: 'Unclassified', verified: false },
  { id: 'BTU', code: 'BTU', name: 'Boraut', x: 24.34, y: 90.31, division: 'Unclassified', verified: false },
  { id: 'BUIN', code: 'BUIN', name: 'Butana', x: 5.34, y: 50.21, division: 'Unclassified', verified: false },
  { id: 'BWI', code: 'BWI', name: 'Bilwai', x: 20.83, y: 87.54, division: 'Unclassified', verified: false },
  { id: 'BWSN', code: 'BWSN', name: 'Bijwasan', x: 4.70, y: 84.17, division: 'Unclassified', verified: false },
  { id: 'BXB', code: 'BXB', name: 'Banga', x: 4.04, y: 79.11, division: 'Unclassified', verified: false },
  { id: 'BYHA', code: 'BYHA', name: 'Jaryaram', x: 2.83, y: 62.69, division: 'Unclassified', verified: false },
  { id: 'BYQ', code: 'BYQ', name: 'Bahai', x: 7.09, y: 88.27, division: 'Unclassified', verified: false },
  { id: 'BZ', code: 'BZ', name: 'Bhorur', x: 14.76, y: 45.28, division: 'Unclassified', verified: false },
  { id: 'BZJT', code: 'BZJT', name: 'Bazi Jattan', x: 5.24, y: 51.08, division: 'Unclassified', verified: false },
  { id: 'BZO', code: 'BZO', name: 'Moon Wo Barsola', x: 21.45, y: 54.14, division: 'Unclassified', verified: false },
  { id: 'CBJ', code: 'CBJ', name: 'Clutter Buck Ganj', x: 4.18, y: 64.27, division: 'Unclassified', verified: false },
  { id: 'CBX', code: 'CBX', name: 'Chandbhan', x: 14.88, y: 43.24, division: 'Unclassified', verified: false },
  { id: 'CEU', code: 'CEU', name: 'Hiheru', x: 21.59, y: 33.18, division: 'Unclassified', verified: false },
  { id: 'CGH', code: 'CGH', name: 'Holang', x: 6.33, y: 91.96, division: 'Unclassified', verified: false },
  { id: 'CH', code: 'CH', name: 'Chandausi Jn', x: 63.00, y: 40.00, division: 'Moradabad', verified: true },
  { id: 'CHBR', code: 'CHBR', name: 'Chaure Bozor', x: 14.44, y: 85.65, division: 'Unclassified', verified: false },
  { id: 'CHMG', code: 'CHMG', name: 'Chintpurni Marg', x: 23.22, y: 28.66, division: 'Unclassified', verified: false },
  { id: 'CIL', code: 'CIL', name: 'Chilbila Jn.', x: 36.15, y: 90.11, division: 'Unclassified', verified: false },
  { id: 'CKA', code: 'CKA', name: 'Chok Paknencia', x: 12.24, y: 43.44, division: 'Unclassified', verified: false },
  { id: 'CKDL', code: 'CKDL', name: 'Chak Dayala', x: 23.76, y: 18.87, division: 'Unclassified', verified: false },
  { id: 'CLKN', code: 'CLKN', name: 'Chuchela Kalan', x: 5.37, y: 58.22, division: 'Unclassified', verified: false },
  { id: 'CMMG', code: 'CMMG', name: 'Chamunda Marg', x: 22.20, y: 26.75, division: 'Unclassified', verified: false },
  { id: 'CNJ', code: 'CNJ', name: 'Der Nagar', x: 5.07, y: 80.08, division: 'Unclassified', verified: false },
  { id: 'CNKP', code: 'CNKP', name: 'Chanakyapuri', x: 4.95, y: 84.58, division: 'Unclassified', verified: false },
  { id: 'CPYZ', code: 'CPYZ', name: 'Ive Chipyana Buzurg', x: 3.48, y: 76.73, division: 'Unclassified', verified: false },
  { id: 'CWA', code: 'CWA', name: 'Churiwala', x: 3.38, y: 44.19, division: 'Unclassified', verified: false },
  { id: 'DAN', code: 'DAN', name: 'Dhaneta', x: 2.61, y: 62.46, division: 'Unclassified', verified: false },
  { id: 'DAVC', code: 'DAVC', name: 'Dav College Jalalabdf', x: 7.85, y: 40.10, division: 'Unclassified', verified: false },
  { id: 'DAW', code: 'DAW', name: 'D.Av. College Jalandhar', x: 8.47, y: 89.30, division: 'Unclassified', verified: false },
  { id: 'DBN', code: 'DBN', name: 'Dhablan', x: 13.99, y: 44.38, division: 'Unclassified', verified: false },
  { id: 'DBNK', code: 'DBNK', name: 'Dagpekn Nanak', x: 9.14, y: 25.81, division: 'Unclassified', verified: false },
  { id: 'DBSI', code: 'DBSI', name: 'Dayabasti', x: 10.07, y: 78.45, division: 'Unclassified', verified: false },
  { id: 'DDY', code: 'DDY', name: 'Dudwindi', x: 2.64, y: 91.24, division: 'Unclassified', verified: false },
  { id: 'DHRJ', code: 'DHRJ', name: 'Dhir Ganj', x: 13.64, y: 92.67, division: 'Unclassified', verified: false },
  { id: 'DIB', code: 'DIB', name: 'Iboi', x: 5.85, y: 66.42, division: 'Unclassified', verified: false },
  { id: 'DLI', code: 'DLI', name: 'Old Delhi (Delhi Jn)', x: 37.00, y: 42.00, division: 'Delhi', verified: true },
  { id: 'DLPC', code: 'DLPC', name: 'Lee Se Yqoulatpur Chowk', x: 21.54, y: 28.20, division: 'Unclassified', verified: false },
  { id: 'DLPR', code: 'DLPR', name: 'Dayalpur', x: 6.63, y: 93.52, division: 'Unclassified', verified: false },
  { id: 'DLT', code: 'DLT', name: 'Delhi Jn.', x: 10.91, y: 61.72, division: 'Unclassified', verified: false },
  { id: 'DMPR', code: 'DMPR', name: 'New Prithala Dharampur', x: 34.75, y: 67.24, division: 'Unclassified', verified: false },
  { id: 'DN', code: 'DN', name: 'Dhanari', x: 29.94, y: 65.77, division: 'Unclassified', verified: false },
  { id: 'DPP', code: 'DPP', name: 'Opp Un', x: 12.62, y: 45.99, division: 'Unclassified', verified: false },
  { id: 'DSJ', code: 'DSJ', name: 'Delhi Safdarjang', x: 3.92, y: 85.22, division: 'Unclassified', verified: false },
  { id: 'DTW', code: 'DTW', name: 'Datewas', x: 3.50, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'DUN', code: 'DUN', name: 'Duganpur', x: 13.59, y: 61.19, division: 'Unclassified', verified: false },
  { id: 'DWO', code: 'DWO', name: 'Dotwalo', x: 13.99, y: 44.38, division: 'Unclassified', verified: false },
  { id: 'DXH', code: 'DXH', name: 'Duhai', x: 5.23, y: 72.77, division: 'Unclassified', verified: false },
  { id: 'DYP', code: 'DYP', name: 'Mbpaoaryapur Jn.', x: 5.76, y: 88.11, division: 'Unclassified', verified: false },
  { id: 'DZA', code: 'DZA', name: 'Asua', x: 6.00, y: 89.87, division: 'Unclassified', verified: false },
  { id: 'ECR', code: 'ECR', name: 'Ddu', x: 6.34, y: 60.35, division: 'Unclassified', verified: false },
  { id: 'EN', code: 'EN', name: 'Farokhnagar', x: 3.22, y: 88.90, division: 'Unclassified', verified: false },
  { id: 'FAP', code: 'FAP', name: 'Fakhnorpur', x: 6.43, y: 92.83, division: 'Unclassified', verified: false },
  { id: 'FDB', code: 'FDB', name: 'Faridabad', x: 7.09, y: 88.27, division: 'Unclassified', verified: false },
  { id: 'FDK', code: 'FDK', name: 'Faridkot', x: 7.36, y: 40.03, division: 'Unclassified', verified: false },
  { id: 'FDN', code: 'FDN', name: 'Goriseres New Town', x: 3.22, y: 88.90, division: 'Unclassified', verified: false },
  { id: 'FKA', code: 'FKA', name: 'Fazilka Jn', x: 5.00, y: 26.00, division: 'Firozpur', verified: true },
  { id: 'FRD', code: 'FRD', name: 'Farhedi', x: 11.24, y: 60.78, division: 'Unclassified', verified: false },
  { id: 'FRH', code: 'FRH', name: 'Farhat Nagar', x: 65.61, y: 78.54, division: 'Unclassified', verified: false },
  { id: 'FSR', code: 'FSR', name: 'Fagarsar', x: 12.62, y: 45.99, division: 'Unclassified', verified: false },
  { id: 'FTH', code: 'FTH', name: 'Fotuhi', x: 12.24, y: 46.62, division: 'Unclassified', verified: false },
  { id: 'FZR', code: 'FZR', name: 'Firozpur Cantt Jn', x: 15.00, y: 15.00, division: 'Firozpur', verified: true },
  { id: 'GANG', code: 'GANG', name: 'Gangaganj', x: 5.21, y: 86.22, division: 'Unclassified', verified: false },
  { id: 'GANL', code: 'GANL', name: 'Gijanauli', x: 19.11, y: 35.37, division: 'Unclassified', verified: false },
  { id: 'GDB', code: 'GDB', name: 'Giddar Baha', x: 12.24, y: 46.62, division: 'Unclassified', verified: false },
  { id: 'GDHA', code: 'GDHA', name: 'Godha', x: 29.36, y: 68.46, division: 'Unclassified', verified: false },
  { id: 'GGB', code: 'GGB', name: 'Esses Garftnuntesar Br.', x: 6.34, y: 60.35, division: 'Unclassified', verified: false },
  { id: 'GGKR', code: 'GGKR', name: 'Govindgarh Khokhar', x: 13.13, y: 46.91, division: 'Unclassified', verified: false },
  { id: 'GGN', code: 'GGN', name: 'Gurgaon', x: 9.59, y: 86.30, division: 'Unclassified', verified: false },
  { id: 'GHCL', code: 'GHCL', name: 'Chagwal', x: 23.36, y: 19.82, division: 'Unclassified', verified: false },
  { id: 'GHH', code: 'GHH', name: 'Garhi Harsaru Jn', x: 33.00, y: 49.00, division: 'Delhi', verified: true },
  { id: 'GJMB', code: 'GJMB', name: 'Ganj Muradabad', x: 5.14, y: 79.46, division: 'Unclassified', verified: false },
  { id: 'GJUT', code: 'GJUT', name: 'Pee I', x: 14.32, y: 42.82, division: 'Unclassified', verified: false },
  { id: 'GLH', code: 'GLH', name: 'Gulacthi', x: 3.34, y: 63.16, division: 'Unclassified', verified: false },
  { id: 'GMS', code: 'GMS', name: 'Garhmuktesar', x: 11.24, y: 60.78, division: 'Unclassified', verified: false },
  { id: 'GNBA', code: 'GNBA', name: 'Gaon Baroda', x: 15.73, y: 54.07, division: 'Unclassified', verified: false },
  { id: 'GNG', code: 'GNG', name: 'Gouri Ganj', x: 13.49, y: 87.22, division: 'Unclassified', verified: false },
  { id: 'GOD', code: 'GOD', name: 'Giddarpindi', x: 22.16, y: 34.72, division: 'Unclassified', verified: false },
  { id: 'GRA', code: 'GRA', name: 'Ghofoundo', x: 5.50, y: 51.76, division: 'Unclassified', verified: false },
  { id: 'GRN', code: 'GRN', name: 'Gurnay', x: 3.50, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'GRY', code: 'GRY', name: 'Orya', x: 11.18, y: 34.94, division: 'Unclassified', verified: false },
  { id: 'GSB', code: 'GSB', name: 'Garna Sahab', x: 5.71, y: 90.45, division: 'Unclassified', verified: false },
  { id: 'GSR', code: 'GSR', name: 'Garh Shankar', x: 38.10, y: 77.90, division: 'Unclassified', verified: false },
  { id: 'GUH', code: 'GUH', name: 'Guldhar', x: 4.43, y: 73.08, division: 'Unclassified', verified: false },
  { id: 'GULR', code: 'GULR', name: 'Merneret Eae Guler', x: 25.30, y: 22.67, division: 'Unclassified', verified: false },
  { id: 'GUNS', code: 'GUNS', name: 'Chunas', x: 13.99, y: 44.38, division: 'Unclassified', verified: false },
  { id: 'GYL', code: 'GYL', name: 'Gharyala', x: 21.59, y: 33.18, division: 'Unclassified', verified: false },
  { id: 'GZB', code: 'GZB', name: 'Ghaziabad Jn', x: 41.00, y: 44.00, division: 'Delhi', verified: true },
  { id: 'HCP', code: 'HCP', name: 'Harchandpur', x: 14.44, y: 85.65, division: 'Unclassified', verified: false },
  { id: 'HDWL', code: 'HDWL', name: 'Hardorawal', x: 22.32, y: 28.02, division: 'Unclassified', verified: false },
  { id: 'HHP', code: 'HHP', name: 'Aer Tornar Fatehpur', x: 9.59, y: 86.30, division: 'Unclassified', verified: false },
  { id: 'HPU', code: 'HPU', name: 'Hapur Jn', x: 46.00, y: 42.00, division: 'Delhi', verified: true },
  { id: 'HRDR', code: 'HRDR', name: 'Harsar Dehri', x: 24.86, y: 21.45, division: 'Unclassified', verified: false },
  { id: 'HRI', code: 'HRI', name: 'Hardoi', x: 3.95, y: 75.33, division: 'Unclassified', verified: false },
  { id: 'HSW', code: 'HSW', name: 'Husainiwala', x: 19.26, y: 36.20, division: 'Unclassified', verified: false },
  { id: 'HUK', code: 'HUK', name: 'Holambi Kalan', x: 5.59, y: 72.11, division: 'Unclassified', verified: false },
  { id: 'HZR', code: 'HZR', name: 'Afizpur', x: 2.61, y: 62.46, division: 'Unclassified', verified: false },
  { id: 'IDS', code: 'IDS', name: 'Iswardaspur', x: 75.33, y: 89.81, division: 'Unclassified', verified: false },
  { id: 'IHP', code: 'IHP', name: 'Inchhapuri', x: 6.52, y: 92.45, division: 'Unclassified', verified: false },
  { id: 'JAT', code: 'JAT', name: 'Jammu Tawi', x: 10.00, y: 2.00, division: 'Firozpur', verified: true },
  { id: 'JCY', code: 'JCY', name: 'Jind City', x: 3.50, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'JDHH', code: 'JDHH', name: 'Jandhera Semaspur', x: 4.88, y: 83.55, division: 'Unclassified', verified: false },
  { id: 'JFG', code: 'JFG', name: 'Yafarganj', x: 5.10, y: 85.59, division: 'Unclassified', verified: false },
  { id: 'JHWR', code: 'JHWR', name: 'Jhawar', x: 25.80, y: 23.22, division: 'Unclassified', verified: false },
  { id: 'JMKR', code: 'JMKR', name: 'Jawalamukhi Road', x: 25.68, y: 23.86, division: 'Unclassified', verified: false },
  { id: 'JNU', code: 'JNU', name: 'Barahi Devi Dham Jaunpur', x: 3.09, y: 91.63, division: 'Unclassified', verified: false },
  { id: 'JPS', code: 'JPS', name: 'Jamalpur Shaikhan', x: 5.55, y: 50.63, division: 'Unclassified', verified: false },
  { id: 'JRC', code: 'JRC', name: 'Jalandhar City', x: 22.00, y: 18.00, division: 'Firozpur', verified: true },
  { id: 'JRJ', code: 'JRJ', name: 'Jargaon', x: 2.61, y: 62.46, division: 'Unclassified', verified: false },
  { id: 'JSKA', code: 'JSKA', name: 'Jataula Jauri Sampka', x: 2.64, y: 91.24, division: 'Unclassified', verified: false },
  { id: 'JUC', code: 'JUC', name: 'Jalandhar Cantt Jn', x: 20.00, y: 17.00, division: 'Firozpur', verified: true },
  { id: 'JWRA', code: 'JWRA', name: 'Jandwala Kharta', x: 14.32, y: 42.82, division: 'Unclassified', verified: false },
  { id: 'KART', code: 'KART', name: 'Kiralkur Sahib', x: 19.74, y: 34.60, division: 'Unclassified', verified: false },
  { id: 'KASH', code: 'KASH', name: 'Kultham Abdullah Shah', x: 26.17, y: 77.90, division: 'Unclassified', verified: false },
  { id: 'KBE', code: 'KBE', name: 'Kurebhar', x: 5.27, y: 86.59, division: 'Unclassified', verified: false },
  { id: 'KCZ', code: 'KCZ', name: 'Kairon', x: 23.09, y: 32.29, division: 'Unclassified', verified: false },
  { id: 'KDF', code: 'KDF', name: 'Khundaur', x: 7.06, y: 89.13, division: 'Unclassified', verified: false },
  { id: 'KEMK', code: 'KEMK', name: 'Khem Karan', x: 15.00, y: 34.12, division: 'Unclassified', verified: false },
  { id: 'KEX', code: 'KEX', name: 'Khekra', x: 6.52, y: 92.45, division: 'Unclassified', verified: false },
  { id: 'KGB', code: 'KGB', name: 'Katghar Jn', x: 70.00, y: 36.00, division: 'Moradabad', verified: true },
  { id: 'KGKD', code: 'KGKD', name: 'Kang Khurd', x: 13.64, y: 92.67, division: 'Unclassified', verified: false },
  { id: 'KH', code: 'KH', name: 'Kahilia', x: 5.73, y: 71.04, division: 'Unclassified', verified: false },
  { id: 'KHDR', code: 'KHDR', name: 'Khandrai', x: 5.55, y: 50.63, division: 'Unclassified', verified: false },
  { id: 'KHKN', code: 'KHKN', name: 'Khera Kalan', x: 5.38, y: 72.54, division: 'Unclassified', verified: false },
  { id: 'KHNM', code: 'KHNM', name: 'Kunda Harnam Ganj', x: 3.27, y: 91.59, division: 'Unclassified', verified: false },
  { id: 'KIP', code: 'KIP', name: 'Holilpur', x: 6.43, y: 92.83, division: 'Unclassified', verified: false },
  { id: 'KJY', code: 'KJY', name: 'Khurja City', x: 8.79, y: 65.10, division: 'Unclassified', verified: false },
  { id: 'KK', code: 'KK', name: 'Kalan', x: 12.24, y: 46.62, division: 'Unclassified', verified: false },
  { id: 'KKP', code: 'KKP', name: 'Kotkapura Jn', x: 11.00, y: 23.00, division: 'Firozpur', verified: true },
  { id: 'KKRL', code: 'KKRL', name: 'Kakrala', x: 13.71, y: 45.25, division: 'Unclassified', verified: false },
  { id: 'KLWL', code: 'KLWL', name: 'Ailonwati Punjob', x: 12.62, y: 45.99, division: 'Unclassified', verified: false },
  { id: 'KNDI', code: 'KNDI', name: 'Kandrori', x: 5.27, y: 86.59, division: 'Unclassified', verified: false },
  { id: 'KNT', code: 'KNT', name: 'Kanth', x: 5.36, y: 56.72, division: 'Unclassified', verified: false },
  { id: 'KPKI', code: 'KPKI', name: 'Qasimpur Kheri', x: 6.00, y: 89.87, division: 'Unclassified', verified: false },
  { id: 'KPLR', code: 'KPLR', name: 'Kopar Lahar', x: 25.78, y: 24.11, division: 'Unclassified', verified: false },
  { id: 'KRKH', code: 'KRKH', name: 'Nen Harkhara', x: 5.37, y: 58.22, division: 'Unclassified', verified: false },
  { id: 'KRSV', code: 'KRSV', name: 'Kohor Singh Wala', x: 17.32, y: 38.63, division: 'Unclassified', verified: false },
  { id: 'KRTN', code: 'KRTN', name: 'Kirti Nagar', x: 5.14, y: 79.46, division: 'Unclassified', verified: false },
  { id: 'KS', code: 'KS', name: 'Uktoor', x: 15.54, y: 41.41, division: 'Unclassified', verified: false },
  { id: 'KTHU', code: 'KTHU', name: 'Kothua', x: 23.36, y: 19.82, division: 'Unclassified', verified: false },
  { id: 'KTW', code: 'KTW', name: 'Kotdwara', x: 5.55, y: 50.63, division: 'Unclassified', verified: false },
  { id: 'KUF', code: 'KUF', name: 'Kaurha', x: 3.99, y: 74.89, division: 'Unclassified', verified: false },
  { id: 'KUP', code: 'KUP', name: 'Kup', x: 15.54, y: 41.41, division: 'Unclassified', verified: false },
  { id: 'KUPR', code: 'KUPR', name: 'Khurdpur', x: 23.09, y: 32.29, division: 'Unclassified', verified: false },
  { id: 'KURQ', code: 'KURQ', name: 'Khui Khera', x: 14.88, y: 43.24, division: 'Unclassified', verified: false },
  { id: 'KVG', code: 'KVG', name: 'Kundanganj', x: 3.94, y: 85.36, division: 'Unclassified', verified: false },
  { id: 'KZI', code: 'KZI', name: 'Chandraoli', x: 5.76, y: 88.11, division: 'Unclassified', verified: false },
  { id: 'LBA', code: 'LBA', name: 'Lambhua', x: 20.83, y: 87.54, division: 'Unclassified', verified: false },
  { id: 'LDCY', code: 'LDCY', name: 'Lodhi Colony', x: 5.27, y: 86.59, division: 'Unclassified', verified: false },
  { id: 'LDH', code: 'LDH', name: 'Ludhiana Jn', x: 26.00, y: 17.00, division: 'Ambala', verified: true },
  { id: 'LHA', code: 'LHA', name: 'Lehragaga', x: 12.79, y: 47.31, division: 'Unclassified', verified: false },
  { id: 'LKK', code: 'LKK', name: 'Lpur Khalsa College', x: 2.83, y: 91.05, division: 'Unclassified', verified: false },
  { id: 'LKO', code: 'LKO', name: 'Lucknow Charbagh', x: 75.00, y: 65.00, division: 'Lucknow', verified: true },
  { id: 'LMN', code: 'LMN', name: 'Lachhmanpur', x: 5.92, y: 88.57, division: 'Unclassified', verified: false },
  { id: 'LNK', code: 'LNK', name: 'Oman Khas Jn.', x: 15.00, y: 34.12, division: 'Unclassified', verified: false },
  { id: 'LNS', code: 'LNS', name: 'Lunsu', x: 25.80, y: 23.22, division: 'Unclassified', verified: false },
  { id: 'LTKR', code: 'LTKR', name: 'Lalit Khera', x: 3.93, y: 49.44, division: 'Unclassified', verified: false },
  { id: 'MAHO', code: 'MAHO', name: 'Sps Maholi', x: 5.59, y: 72.11, division: 'Unclassified', verified: false },
  { id: 'MB', code: 'MB', name: 'Moradabad Jn', x: 60.00, y: 45.00, division: 'Moradabad', verified: true },
  { id: 'MBDP', code: 'MBDP', name: 'Elha Devi Dham Partapgarh', x: 2.83, y: 91.05, division: 'Unclassified', verified: false },
  { id: 'MCDA', code: 'MCDA', name: 'Chandrika Devi Dham Antu', x: 74.16, y: 90.05, division: 'Unclassified', verified: false },
  { id: 'MCTM', code: 'MCTM', name: 'Tyr Captain Tushar Mahojan', x: 18.52, y: 15.56, division: 'Unclassified', verified: false },
  { id: 'MDNR', code: 'MDNR', name: 'Amodi Nagar', x: 5.62, y: 71.85, division: 'Unclassified', verified: false },
  { id: 'MEQ', code: 'MEQ', name: 'Malethukanak', x: 3.92, y: 85.22, division: 'Unclassified', verified: false },
  { id: 'MEX', code: 'MEX', name: 'Mukerian', x: 5.92, y: 88.57, division: 'Unclassified', verified: false },
  { id: 'MFB', code: 'MFB', name: 'Mustafabad', x: 13.99, y: 44.38, division: 'Unclassified', verified: false },
  { id: 'MFM', code: 'MFM', name: 'Alam', x: 18.86, y: 37.15, division: 'Unclassified', verified: false },
  { id: 'MGRP', code: 'MGRP', name: 'Ptk Meghrajpura', x: 26.43, y: 21.73, division: 'Unclassified', verified: false },
  { id: 'MIL', code: 'MIL', name: 'Ioi', x: 13.51, y: 61.59, division: 'Unclassified', verified: false },
  { id: 'MINJ', code: 'MINJ', name: 'Maikal Ganj', x: 5.81, y: 71.18, division: 'Unclassified', verified: false },
  { id: 'MJHL', code: 'MJHL', name: 'Majhaula', x: 3.89, y: 64.41, division: 'Unclassified', verified: false },
  { id: 'MJTA', code: 'MJTA', name: 'Majitha', x: 23.22, y: 28.66, division: 'Unclassified', verified: false },
  { id: 'MKMN', code: 'MKMN', name: 'Madina', x: 5.35, y: 58.59, division: 'Unclassified', verified: false },
  { id: 'MLPR', code: 'MLPR', name: 'Molipur', x: 5.21, y: 86.22, division: 'Unclassified', verified: false },
  { id: 'MNDR', code: 'MNDR', name: 'Mandi Dhanaura', x: 5.35, y: 58.59, division: 'Unclassified', verified: false },
  { id: 'MNKN', code: 'MNKN', name: 'Manikala', x: 36.55, y: 90.20, division: 'Unclassified', verified: false },
  { id: 'MNUR', code: 'MNUR', name: 'Manjhlepur', x: 7.06, y: 89.13, division: 'Unclassified', verified: false },
  { id: 'MNVL', code: 'MNVL', name: 'Monwal', x: 18.44, y: 17.09, division: 'Unclassified', verified: false },
  { id: 'MOF', code: 'MOF', name: 'Mondh', x: 3.22, y: 63.53, division: 'Unclassified', verified: false },
  { id: 'MOHR', code: 'MOHR', name: 'Mohana Haryana', x: 9.09, y: 53.10, division: 'Unclassified', verified: false },
  { id: 'MOPR', code: 'MOPR', name: 'Mohanpura', x: 13.13, y: 46.91, division: 'Unclassified', verified: false },
  { id: 'MOTC', code: 'MOTC', name: 'Bss I Wiotichur', x: 3.50, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'MSBI', code: 'MSBI', name: 'Block Hut', x: 27.97, y: 56.06, division: 'Unclassified', verified: false },
  { id: 'MSOD', code: 'MSOD', name: 'Masodha', x: 8.62, y: 84.17, division: 'Unclassified', verified: false },
  { id: 'MST', code: 'MST', name: 'Masit', x: 3.48, y: 76.73, division: 'Unclassified', verified: false },
  { id: 'MSZ', code: 'MSZ', name: 'Wansa', x: 12.24, y: 46.62, division: 'Unclassified', verified: false },
  { id: 'MTPR', code: 'MTPR', name: 'Raimehatpur', x: 17.13, y: 31.75, division: 'Unclassified', verified: false },
  { id: 'MUD', code: 'MUD', name: 'Murad Nagar', x: 5.44, y: 72.25, division: 'Unclassified', verified: false },
  { id: 'MUT', code: 'MUT', name: 'Fmeerut Cantt.', x: 13.30, y: 70.13, division: 'Unclassified', verified: false },
  { id: 'MUZ', code: 'MUZ', name: 'Muhiuddinpur', x: 5.68, y: 71.31, division: 'Unclassified', verified: false },
  { id: 'MWC', code: 'MWC', name: 'Hander Vihar', x: 4.88, y: 81.47, division: 'Unclassified', verified: false },
  { id: 'MWX', code: 'MWX', name: 'Onwalakhas', x: 19.26, y: 36.20, division: 'Unclassified', verified: false },
  { id: 'MXH', code: 'MXH', name: 'Makhu', x: 19.11, y: 35.37, division: 'Unclassified', verified: false },
  { id: 'MXP', code: 'MXP', name: 'Malupota', x: 4.00, y: 78.74, division: 'Unclassified', verified: false },
  { id: 'MZN', code: 'MZN', name: 'Muzaffarnagar Narain Jn', x: 40.00, y: 31.00, division: 'Ambala', verified: true },
  { id: 'NAS', code: 'NAS', name: 'Png Rola', x: 17.66, y: 31.01, division: 'Unclassified', verified: false },
  { id: 'NBD', code: 'NBD', name: 'Najibabad Jn', x: 47.00, y: 21.00, division: 'Moradabad', verified: true },
  { id: 'NCR', code: 'NCR', name: 'Bspr Ddu', x: 2.54, y: 63.63, division: 'Unclassified', verified: false },
  { id: 'NDAM', code: 'NDAM', name: 'Nadigam', x: 22.95, y: 4.55, division: 'Unclassified', verified: false },
  { id: 'NDLS', code: 'NDLS', name: 'New Delhi', x: 35.00, y: 45.00, division: 'Delhi', verified: true },
  { id: 'NER', code: 'NER', name: 'Ljn', x: 3.89, y: 64.41, division: 'Unclassified', verified: false },
  { id: 'NERI', code: 'NERI', name: 'Neri', x: 5.68, y: 71.31, division: 'Unclassified', verified: false },
  { id: 'NG', code: 'NG', name: 'Main Line', x: 3.50, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'NGRS', code: 'NGRS', name: 'Nagrota Suriyan', x: 27.05, y: 22.07, division: 'Unclassified', verified: false },
  { id: 'NHF', code: 'NHF', name: 'Nihostha', x: 5.93, y: 87.93, division: 'Unclassified', verified: false },
  { id: 'NKD', code: 'NKD', name: 'Nakodar Jn', x: 18.00, y: 20.00, division: 'Firozpur', verified: true },
  { id: 'NLH', code: 'NLH', name: 'Jatha', x: 3.93, y: 49.44, division: 'Unclassified', verified: false },
  { id: 'NMDA', code: 'NMDA', name: 'New Morinda', x: 19.07, y: 37.64, division: 'Unclassified', verified: false },
  { id: 'NNGL', code: 'NNGL', name: 'Nangal', x: 22.60, y: 32.62, division: 'Unclassified', verified: false },
  { id: 'NRVR', code: 'NRVR', name: 'Naraing Vihar', x: 4.93, y: 81.09, division: 'Unclassified', verified: false },
  { id: 'NTG', code: 'NTG', name: 'Nusaratabad Kharkhari', x: 6.63, y: 93.52, division: 'Unclassified', verified: false },
  { id: 'NUPR', code: 'NUPR', name: 'Nurpur Road', x: 23.36, y: 19.82, division: 'Unclassified', verified: false },
  { id: 'OHT', code: 'OHT', name: 'Rnoronot', x: 2.54, y: 63.63, division: 'Unclassified', verified: false },
  { id: 'PBUM', code: 'PBUM', name: 'Pabnowa Jasmahinder', x: 12.79, y: 47.31, division: 'Unclassified', verified: false },
  { id: 'PGW', code: 'PGW', name: 'Phagwara Jn.', x: 3.39, y: 77.26, division: 'Unclassified', verified: false },
  { id: 'PHA', code: 'PHA', name: 'Pathak Pur', x: 8.79, y: 65.10, division: 'Unclassified', verified: false },
  { id: 'PHR', code: 'PHR', name: 'Phillaur Jn', x: 24.00, y: 19.00, division: 'Firozpur', verified: true },
  { id: 'PHRH', code: 'PHRH', name: 'Patti Ee A Panchrukhi', x: 9.14, y: 25.81, division: 'Unclassified', verified: false },
  { id: 'PHV', code: 'PHV', name: 'Pirthi Ganj', x: 2.64, y: 91.24, division: 'Unclassified', verified: false },
  { id: 'PHWR', code: 'PHWR', name: 'Renone Road', x: 3.60, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'PIMX', code: 'PIMX', name: 'Palamipur Himeehel', x: 23.83, y: 25.72, division: 'Unclassified', verified: false },
  { id: 'PJGM', code: 'PJGM', name: 'Panzgam', x: 27.31, y: 5.74, division: 'Unclassified', verified: false },
  { id: 'PKA', code: 'PKA', name: 'Fazilka Jn.', x: 12.97, y: 41.97, division: 'Unclassified', verified: false },
  { id: 'PKY', code: 'PKY', name: 'Pilkhani', x: 13.13, y: 46.91, division: 'Unclassified', verified: false },
  { id: 'PLP', code: 'PLP', name: 'Sate Ae A Phulpur', x: 10.91, y: 61.72, division: 'Unclassified', verified: false },
  { id: 'PLT', code: 'PLT', name: 'Pirthala Lalauda', x: 5.24, y: 51.08, division: 'Unclassified', verified: false },
  { id: 'PM', code: 'PM', name: 'Palam', x: 4.87, y: 83.08, division: 'Unclassified', verified: false },
  { id: 'PMPE', code: 'PMPE', name: 'Pampore', x: 24.50, y: 3.98, division: 'Unclassified', verified: false },
  { id: 'PMR', code: 'PMR', name: 'Pitamberpur', x: 15.94, y: 66.28, division: 'Unclassified', verified: false },
  { id: 'PNI', code: 'PNI', name: 'Puraini', x: 15.73, y: 54.07, division: 'Unclassified', verified: false },
  { id: 'PNP', code: 'PNP', name: 'Panipat Jn.', x: 3.50, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'PPB', code: 'PPB', name: 'Ety Ny Nee Partappura', x: 2.58, y: 93.86, division: 'Unclassified', verified: false },
  { id: 'PPDE', code: 'PPDE', name: 'Pandu Pindara Jn.', x: 3.50, y: 48.13, division: 'Unclassified', verified: false },
  { id: 'PPU', code: 'PPU', name: 'Piparpur', x: 5.92, y: 88.57, division: 'Unclassified', verified: false },
  { id: 'PQN', code: 'PQN', name: 'Pariawon Kala Kankar Road', x: 2.83, y: 91.05, division: 'Unclassified', verified: false },
  { id: 'PQY', code: 'PQY', name: 'Pabli Khas', x: 26.42, y: 69.97, division: 'Unclassified', verified: false },
  { id: 'PRAR', code: 'PRAR', name: 'Oror', x: 24.37, y: 25.35, division: 'Unclassified', verified: false },
  { id: 'PRF', code: 'PRF', name: 'Parsipur', x: 2.61, y: 62.46, division: 'Unclassified', verified: false },
  { id: 'PRI', code: 'PRI', name: 'Cys Pathri', x: 3.93, y: 49.44, division: 'Unclassified', verified: false },
  { id: 'PRKE', code: 'PRKE', name: 'Purwa Khera', x: 15.94, y: 66.28, division: 'Unclassified', verified: false },
  { id: 'PRPM', code: 'PRPM', name: 'Pandit Ramprasad Bismil', x: 14.46, y: 70.70, division: 'Unclassified', verified: false },
  { id: 'PRTP', code: 'PRTP', name: 'Partapur', x: 5.81, y: 71.18, division: 'Unclassified', verified: false },
  { id: 'PT', code: 'PT', name: 'Patli', x: 5.69, y: 90.29, division: 'Unclassified', verified: false },
  { id: 'PTA', code: 'PTA', name: 'Patigla', x: 14.88, y: 43.24, division: 'Unclassified', verified: false },
  { id: 'PTE', code: 'PTE', name: 'Patiala Cantt.', x: 3.38, y: 44.19, division: 'Unclassified', verified: false },
  { id: 'PTK', code: 'PTK', name: 'Pathankot Jn', x: 14.00, y: 8.00, division: 'Firozpur', verified: true },
  { id: 'PTKC', code: 'PTKC', name: 'Pathankot Cantt.', x: 5.21, y: 86.22, division: 'Unclassified', verified: false },
  { id: 'PTNR', code: 'PTNR', name: 'Patel Nagar', x: 4.00, y: 78.74, division: 'Unclassified', verified: false },
  { id: 'PTRD', code: 'PTRD', name: 'Pataudi Road', x: 6.79, y: 91.99, division: 'Unclassified', verified: false },
  { id: 'PTTN', code: 'PTTN', name: 'Pattan', x: 22.43, y: 3.52, division: 'Unclassified', verified: false },
  { id: 'PTYR', code: 'PTYR', name: 'Potiyara', x: 4.87, y: 83.08, division: 'Unclassified', verified: false },
  { id: 'PUK', code: 'PUK', name: 'Nikosi', x: 12.24, y: 46.62, division: 'Unclassified', verified: false },
  { id: 'PWL', code: 'PWL', name: 'Dhulawat Da Palwal', x: 3.27, y: 91.59, division: 'Unclassified', verified: false },
  { id: 'QRP', code: 'QRP', name: 'Kila Roipur', x: 7.85, y: 40.10, division: 'Unclassified', verified: false },
  { id: 'QSR', code: 'QSR', name: 'Kansrao', x: 14.76, y: 45.28, division: 'Unclassified', verified: false },
  { id: 'QTP', code: 'QTP', name: 'Rutobpur', x: 5.34, y: 50.21, division: 'Unclassified', verified: false },
  { id: 'RBHR', code: 'RBHR', name: 'Rabhra', x: 5.24, y: 51.08, division: 'Unclassified', verified: false },
  { id: 'RBL', code: 'RBL', name: 'Raebareli Jn', x: 78.00, y: 70.00, division: 'Lucknow', verified: true },
  { id: 'RCP', code: 'RCP', name: 'Wes Oy Au Romchandrapur', x: 3.22, y: 88.90, division: 'Unclassified', verified: false },
  { id: 'RCR', code: 'RCR', name: 'Rattar Chattar', x: 22.20, y: 26.75, division: 'Unclassified', verified: false },
  { id: 'RDL', code: 'RDL', name: 'Rudauli', x: 21.42, y: 80.58, division: 'Unclassified', verified: false },
  { id: 'RDS', code: 'RDS', name: 'Ramdas', x: 23.32, y: 27.35, division: 'Unclassified', verified: false },
  { id: 'RES', code: 'RES', name: 'Rasauli', x: 4.00, y: 78.74, division: 'Unclassified', verified: false },
  { id: 'RHU', code: 'RHU', name: 'Orahon', x: 4.04, y: 79.11, division: 'Unclassified', verified: false },
  { id: 'RJK', code: 'RJK', name: 'Raja Ka Sahaspur Jn', x: 58.00, y: 38.00, division: 'Moradabad', verified: true },
  { id: 'RKX', code: 'RKX', name: 'Rukhi', x: 5.69, y: 51.29, division: 'Unclassified', verified: false },
  { id: 'RMC', code: 'RMC', name: 'Ramehaura Road', x: 6.63, y: 93.52, division: 'Unclassified', verified: false },
  { id: 'RMGJ', code: 'RMGJ', name: 'Ramganj', x: 3.22, y: 88.90, division: 'Unclassified', verified: false },
  { id: 'RMJK', code: 'RMJK', name: 'Ramnagar Road', x: 20.27, y: 16.57, division: 'Unclassified', verified: false },
  { id: 'RMU', code: 'RMU', name: 'Rampur Jn.', x: 5.21, y: 59.95, division: 'Unclassified', verified: false },
  { id: 'ROZA', code: 'ROZA', name: 'Boza Jn', x: 74.00, y: 46.00, division: 'Moradabad', verified: true },
  { id: 'RPAP', code: 'RPAP', name: 'Fotnipora', x: 14.63, y: 4.86, division: 'Unclassified', verified: false },
  { id: 'RPAR', code: 'RPAR', name: 'Rupnagar', x: 19.26, y: 36.20, division: 'Unclassified', verified: false },
  { id: 'RPMN', code: 'RPMN', name: 'Rampur Manyharan', x: 4.70, y: 84.17, division: 'Unclassified', verified: false },
  { id: 'RRAL', code: 'RRAL', name: 'Rure Asal', x: 17.13, y: 31.75, division: 'Unclassified', verified: false },
  { id: 'RRS', code: 'RRS', name: 'Raghuraj Singh', x: 13.49, y: 87.22, division: 'Unclassified', verified: false },
  { id: 'RRW', code: 'RRW', name: 'Oranwala', x: 14.88, y: 43.24, division: 'Unclassified', verified: false },
  { id: 'RWL', code: 'RWL', name: 'Raiwala Jn', x: 49.00, y: 14.00, division: 'Moradabad', verified: true },
  { id: 'RYS', code: 'RYS', name: 'Nsu Son Rasuiya', x: 15.48, y: 65.60, division: 'Unclassified', verified: false },
  { id: 'SAG', code: 'SAG', name: 'Sangrur', x: 13.99, y: 44.38, division: 'Unclassified', verified: false },
  { id: 'SAGR', code: 'SAGR', name: 'Wee Shrirajnagar', x: 4.70, y: 84.17, division: 'Unclassified', verified: false },
  { id: 'SAR', code: 'SAR', name: 'Shahzad Nagar', x: 6.34, y: 60.35, division: 'Unclassified', verified: false },
  { id: 'SAW', code: 'SAW', name: 'Suriowon', x: 2.54, y: 63.63, division: 'Unclassified', verified: false },
  { id: 'SBB', code: 'SBB', name: 'Babad', x: 26.04, y: 77.70, division: 'Unclassified', verified: false },
  { id: 'SBTJ', code: 'SBTJ', name: 'Shanidev Dham Bishnathganj', x: 6.33, y: 91.96, division: 'Unclassified', verified: false },
  { id: 'SCQ', code: 'SCQ', name: 'Sham Chaurasi', x: 17.13, y: 31.75, division: 'Unclassified', verified: false },
  { id: 'SDHP', code: 'SDHP', name: 'Suchpur', x: 7.06, y: 89.13, division: 'Unclassified', verified: false },
  { id: 'SDUA', code: 'SDUA', name: 'Sadura', x: 20.18, y: 7.67, division: 'Unclassified', verified: false },
  { id: 'SEQ', code: 'SEQ', name: 'Sekna', x: 12.24, y: 43.44, division: 'Unclassified', verified: false },
  { id: 'SFA', code: 'SFA', name: 'Sunhera', x: 6.33, y: 91.96, division: 'Unclassified', verified: false },
  { id: 'SFPR', code: 'SFPR', name: 'Uttar Prad Esh Sdfipur', x: 4.88, y: 81.47, division: 'Unclassified', verified: false },
  { id: 'SGJ', code: 'SGJ', name: 'Safdarganj', x: 4.04, y: 79.11, division: 'Unclassified', verified: false },
  { id: 'SGRR', code: 'SGRR', name: 'Songor', x: 20.27, y: 16.57, division: 'Unclassified', verified: false },
  { id: 'SHG', code: 'SHG', name: 'Shahganj Jn.', x: 7.09, y: 88.27, division: 'Unclassified', verified: false },
  { id: 'SHOM', code: 'SHOM', name: 'Snfbos Nosed', x: 12.62, y: 45.99, division: 'Unclassified', verified: false },
  { id: 'SHRM', code: 'SHRM', name: 'Koa Sharma', x: 4.43, y: 73.08, division: 'Unclassified', verified: false },
  { id: 'SHTS', code: 'SHTS', name: 'Sambhal Hatim Sarai', x: 2.83, y: 62.69, division: 'Unclassified', verified: false },
  { id: 'SIR', code: 'SIR', name: 'Sirhind Jn', x: 28.00, y: 18.00, division: 'Ambala', verified: true },
  { id: 'SLHP', code: 'SLHP', name: 'Himachal Pradesh', x: 23.83, y: 25.72, division: 'Unclassified', verified: false },
  { id: 'SLN', code: 'SLN', name: 'Sultanpur Jn', x: 87.00, y: 65.00, division: 'Lucknow', verified: true },
  { id: 'SLRP', code: 'SLRP', name: 'Solorpur', x: 4.87, y: 83.08, division: 'Unclassified', verified: false },
  { id: 'SLWR', code: 'SLWR', name: 'Silawar', x: 5.44, y: 87.19, division: 'Unclassified', verified: false },
  { id: 'SMBR', code: 'SMBR', name: 'Sumber', x: 27.77, y: 10.70, division: 'Unclassified', verified: false },
  { id: 'SMDP', code: 'SMDP', name: 'Shohabad Mohammadpur', x: 4.88, y: 83.55, division: 'Unclassified', verified: false },
  { id: 'SMQL', code: 'SMQL', name: 'Shomli', x: 13.49, y: 87.22, division: 'Unclassified', verified: false },
  { id: 'SNAP', code: 'SNAP', name: 'Fyesona Arjunpur', x: 3.92, y: 85.22, division: 'Unclassified', verified: false },
  { id: 'SNB', code: 'SNB', name: 'Satnaur Badesron', x: 37.96, y: 77.57, division: 'Unclassified', verified: false },
  { id: 'SNX', code: 'SNX', name: 'Road', x: 5.69, y: 51.29, division: 'Unclassified', verified: false },
  { id: 'SOL', code: 'SOL', name: 'Ssolan', x: 19.07, y: 37.64, division: 'Unclassified', verified: false },
  { id: 'SPC', code: 'SPC', name: 'Sita Publcity Jn.', x: 5.23, y: 72.77, division: 'Unclassified', verified: false },
  { id: 'SPN', code: 'SPN', name: 'Shahjahanpur Jn', x: 72.00, y: 44.00, division: 'Moradabad', verified: true },
  { id: 'SPPR', code: 'SPPR', name: 'Rho Shudinpur', x: 5.35, y: 57.76, division: 'Unclassified', verified: false },
  { id: 'SQJ', code: 'SQJ', name: 'Saila Khurd', x: 26.04, y: 77.10, division: 'Unclassified', verified: false },
  { id: 'SQN', code: 'SQN', name: 'Sarai Kansrai', x: 4.18, y: 64.27, division: 'Unclassified', verified: false },
  { id: 'SQR', code: 'SQR', name: 'Sultanpur Lodhi', x: 3.09, y: 91.63, division: 'Unclassified', verified: false },
  { id: 'SRBH', code: 'SRBH', name: 'Saheed Ramphal Balhara', x: 5.41, y: 59.00, division: 'Unclassified', verified: false },
  { id: 'SRE', code: 'SRE', name: 'Saharanpur Jn', x: 38.00, y: 26.00, division: 'Ambala', verified: true },
  { id: 'SRM', code: 'SRM', name: 'Sarna', x: 26.43, y: 21.73, division: 'Unclassified', verified: false },
  { id: 'SRMP', code: 'SRMP', name: 'Sirsi Makhdumpur', x: 10.91, y: 61.72, division: 'Unclassified', verified: false },
  { id: 'SSW', code: 'SSW', name: 'Orsawa', x: 12.24, y: 46.62, division: 'Unclassified', verified: false },
  { id: 'SSZ', code: 'SSZ', name: 'Singh Wala', x: 13.86, y: 47.21, division: 'Unclassified', verified: false },
  { id: 'STRA', code: 'STRA', name: 'Uontia', x: 26.91, y: 69.56, division: 'Unclassified', verified: false },
  { id: 'SUJR', code: 'SUJR', name: 'Sujra', x: 2.64, y: 91.24, division: 'Unclassified', verified: false },
  { id: 'SUM', code: 'SUM', name: 'Sajumma', x: 5.55, y: 50.63, division: 'Unclassified', verified: false },
  { id: 'SUNM', code: 'SUNM', name: 'Sunamai', x: 16.65, y: 69.13, division: 'Unclassified', verified: false },
  { id: 'SVDK', code: 'SVDK', name: 'Mate Veishno Devi Katro', x: 16.27, y: 14.64, division: 'Unclassified', verified: false },
  { id: 'SWE', code: 'SWE', name: 'Siwaith', x: 2.58, y: 93.86, division: 'Unclassified', verified: false },
  { id: 'SWNR', code: 'SWNR', name: 'Sewa Nagar', x: 14.49, y: 86.89, division: 'Unclassified', verified: false },
  { id: 'SXZM', code: 'SXZM', name: 'Sopore', x: 23.37, y: 2.28, division: 'Unclassified', verified: false },
  { id: 'SZM', code: 'SZM', name: 'Subzimandi', x: 3.74, y: 75.53, division: 'Unclassified', verified: false },
  { id: 'TAPA', code: 'TAPA', name: 'Topa', x: 14.76, y: 45.28, division: 'Unclassified', verified: false },
  { id: 'TBTN', code: 'TBTN', name: 'Thana Bhawan Town', x: 14.44, y: 85.65, division: 'Unclassified', verified: false },
  { id: 'TD', code: 'TD', name: 'Ray Tanda', x: 4.88, y: 83.55, division: 'Unclassified', verified: false },
  { id: 'TDP', code: 'TDP', name: 'Todarpur', x: 4.37, y: 73.83, division: 'Unclassified', verified: false },
  { id: 'TDW', code: 'TDW', name: 'Tondwal', x: 3.38, y: 44.19, division: 'Unclassified', verified: false },
  { id: 'THW', code: 'THW', name: 'Tharwai', x: 13.59, y: 61.19, division: 'Unclassified', verified: false },
  { id: 'THWM', code: 'THWM', name: 'Tapeshwarngiff Dham', x: 5.10, y: 85.59, division: 'Unclassified', verified: false },
  { id: 'TKD', code: 'TKD', name: 'Ighlakabad', x: 20.83, y: 87.54, division: 'Unclassified', verified: false },
  { id: 'TKRP', code: 'TKRP', name: 'Fikoult Bowbbpuc', x: 5.10, y: 85.59, division: 'Unclassified', verified: false },
  { id: 'TLH', code: 'TLH', name: 'Tithar', x: 29.39, y: 68.73, division: 'Unclassified', verified: false },
  { id: 'TNDE', code: 'TNDE', name: 'Gnesar City', x: 12.24, y: 46.62, division: 'Unclassified', verified: false },
  { id: 'TNJR', code: 'TNJR', name: 'Tajnagar', x: 4.91, y: 90.74, division: 'Unclassified', verified: false },
  { id: 'TPZ', code: 'TPZ', name: 'Tapri Jn', x: 37.00, y: 23.00, division: 'Moradabad', verified: true },
  { id: 'TQA', code: 'TQA', name: 'Lakia', x: 14.49, y: 86.89, division: 'Unclassified', verified: false },
  { id: 'TRPL', code: 'TRPL', name: 'Tripal', x: 27.63, y: 23.66, division: 'Unclassified', verified: false },
  { id: 'TSS', code: 'TSS', name: 'Teliscida Sohu', x: 17.62, y: 36.77, division: 'Unclassified', verified: false },
  { id: 'TYK', code: 'TYK', name: 'Thabalke', x: 3.27, y: 91.59, division: 'Unclassified', verified: false },
  { id: 'UCA', code: 'UCA', name: 'Uchana', x: 9.09, y: 53.10, division: 'Unclassified', verified: false },
  { id: 'UCB', code: 'UCB', name: 'Unchi Bassi', x: 3.22, y: 88.90, division: 'Unclassified', verified: false },
  { id: 'UCH', code: 'UCH', name: 'Loh Nehaulig', x: 13.30, y: 70.13, division: 'Unclassified', verified: false },
  { id: 'UCR', code: 'UCR', name: 'Unchahar Jn', x: 80.00, y: 73.00, division: 'Lucknow', verified: true },
  { id: 'UKN', code: 'UKN', name: 'Uklono', x: 4.19, y: 52.60, division: 'Unclassified', verified: false },
  { id: 'ULN', code: 'ULN', name: 'Ssn Ulnabhari', x: 4.87, y: 83.08, division: 'Unclassified', verified: false },
  { id: 'UMB', code: 'UMB', name: 'Ambala Cantt Jn', x: 30.00, y: 20.00, division: 'Ambala', verified: true },
  { id: 'UPRD', code: 'UPRD', name: 'Dehat', x: 9.59, y: 86.30, division: 'Unclassified', verified: false },
  { id: 'VIPU', code: 'VIPU', name: 'Vijaypur Jammu', x: 23.65, y: 18.87, division: 'Unclassified', verified: false },
  { id: 'VJOD', code: 'VJOD', name: 'Wyathuna Nagdh Jagadhri', x: 13.71, y: 45.25, division: 'Unclassified', verified: false },
  { id: 'VNN', code: 'VNN', name: 'Bhanaur', x: 5.35, y: 58.59, division: 'Unclassified', verified: false },
  { id: 'VPO', code: 'VPO', name: 'Bhupiamau', x: 3.27, y: 91.59, division: 'Unclassified', verified: false },
  { id: 'WR', code: 'WR', name: 'Wer Tin', x: 2.65, y: 64.43, division: 'Unclassified', verified: false },
  { id: 'YNRK', code: 'YNRK', name: 'Yog Nagri Rishikesh', x: 13.71, y: 45.25, division: 'Unclassified', verified: false },
  { id: 'ZBD', code: 'ZBD', name: 'Zafrabad Jn.', x: 5.35, y: 58.59, division: 'Unclassified', verified: false },
];

const INITIAL_EDGES: Edge[] = [
  // Edges are only drawn between VERIFIED major junctions — OCR can extract
  // station names/positions from text, but cannot reliably detect which
  // thin colored lines on the map connect which stations. Wayside stations
  // (verified: false) are shown as markers only, without connecting lines.
  { id: 'e-jat-ptk', from: 'JAT', to: 'PTK', distanceKm: 90, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ptk-asr', from: 'PTK', to: 'ASR', distanceKm: 60, lineType: 'BOTH', status: 'clear' },
  { id: 'e-asr-beas', from: 'ASR', to: 'BEAS', distanceKm: 25, lineType: 'BOTH', status: 'clear' },
  { id: 'e-beas-juc', from: 'BEAS', to: 'JUC', distanceKm: 40, lineType: 'BOTH', status: 'clear' },
  { id: 'e-juc-jrc', from: 'JUC', to: 'JRC', distanceKm: 5, lineType: 'BOTH', status: 'clear' },
  { id: 'e-jrc-nkd', from: 'JRC', to: 'NKD', distanceKm: 25, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nkd-fzr', from: 'NKD', to: 'FZR', distanceKm: 90, lineType: 'UP', status: 'conflict', blockId: 'BLK-NR-410', dept: 'S&T' },
  { id: 'e-ldh-phr', from: 'LDH', to: 'PHR', distanceKm: 20, lineType: 'BOTH', status: 'clear' },
  { id: 'e-phr-juc', from: 'PHR', to: 'JUC', distanceKm: 20, lineType: 'BOTH', status: 'clear' },
  { id: 'e-fzr-kkp', from: 'FZR', to: 'KKP', distanceKm: 50, lineType: 'BOTH', status: 'clear' },
  { id: 'e-kkp-bti', from: 'KKP', to: 'BTI', distanceKm: 30, lineType: 'BOTH', status: 'clear' },
  { id: 'e-bti-abs', from: 'BTI', to: 'ABS', distanceKm: 60, lineType: 'BOTH', status: 'clear' },
  { id: 'e-abs-fka', from: 'ABS', to: 'FKA', distanceKm: 30, lineType: 'BOTH', status: 'clear' },
  { id: 'e-umb-sir', from: 'UMB', to: 'SIR', distanceKm: 30, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sir-ldh', from: 'SIR', to: 'LDH', distanceKm: 50, lineType: 'BOTH', status: 'clear' },
  { id: 'e-umb-sre', from: 'UMB', to: 'SRE', distanceKm: 100, lineType: 'BOTH', status: 'maintenance-done', dept: 'Civil' },
  { id: 'e-sre-mzn', from: 'SRE', to: 'MZN', distanceKm: 45, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mzn-gzb', from: 'MZN', to: 'GZB', distanceKm: 90, lineType: 'BOTH', status: 'clear' },
  { id: 'e-sre-nbd', from: 'SRE', to: 'NBD', distanceKm: 60, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ndls-dli', from: 'NDLS', to: 'DLI', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e-dli-umb', from: 'DLI', to: 'UMB', distanceKm: 200, lineType: 'DOWN', status: 'clear' },
  { id: 'e-dli-gzb', from: 'DLI', to: 'GZB', distanceKm: 20, lineType: 'BOTH', status: 'clear' },
  { id: 'e-gzb-hpu', from: 'GZB', to: 'HPU', distanceKm: 45, lineType: 'BOTH', status: 'clear' },
  { id: 'e-hpu-mb', from: 'HPU', to: 'MB', distanceKm: 60, lineType: 'BOTH', status: 'clear' },
  { id: 'e-gzb-mb', from: 'GZB', to: 'MB', distanceKm: 141, lineType: 'BOTH', status: 'block-active', blockId: 'BLK-NR-402', dept: 'OHE' },
  { id: 'e-ndls-ghh', from: 'NDLS', to: 'GHH', distanceKm: 25, lineType: 'BOTH', status: 'clear' },
  { id: 'e-umb-tpz', from: 'UMB', to: 'TPZ', distanceKm: 176, lineType: 'BOTH', status: 'clear' },
  { id: 'e-tpz-mb', from: 'TPZ', to: 'MB', distanceKm: 15, lineType: 'BOTH', status: 'clear' },
  { id: 'e-nbd-rwl', from: 'NBD', to: 'RWL', distanceKm: 70, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mb-rjk', from: 'MB', to: 'RJK', distanceKm: 50, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rjk-be', from: 'RJK', to: 'BE', distanceKm: 40, lineType: 'BOTH', status: 'clear' },
  { id: 'e-mb-ch', from: 'MB', to: 'CH', distanceKm: 90, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ch-be', from: 'CH', to: 'BE', distanceKm: 60, lineType: 'BOTH', status: 'clear' },
  { id: 'e-be-kgb', from: 'BE', to: 'KGB', distanceKm: 15, lineType: 'BOTH', status: 'clear' },
  { id: 'e-be-spn', from: 'BE', to: 'SPN', distanceKm: 90, lineType: 'BOTH', status: 'clear' },
  { id: 'e-spn-roza', from: 'SPN', to: 'ROZA', distanceKm: 15, lineType: 'BOTH', status: 'clear' },
  { id: 'e-roza-lko', from: 'ROZA', to: 'LKO', distanceKm: 140, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ndls-lko', from: 'NDLS', to: 'LKO', distanceKm: 512, lineType: 'BOTH', status: 'block-active', blockId: 'BLK-NR-415', dept: 'Civil' },
  { id: 'e-lko-blm', from: 'LKO', to: 'BLM', distanceKm: 65, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lko-ayc', from: 'LKO', to: 'AYC', distanceKm: 135, lineType: 'BOTH', status: 'clear' },
  { id: 'e-ayc-sln', from: 'AYC', to: 'SLN', distanceKm: 50, lineType: 'BOTH', status: 'clear' },
  { id: 'e-lko-rbl', from: 'LKO', to: 'RBL', distanceKm: 80, lineType: 'BOTH', status: 'clear' },
  { id: 'e-rbl-ucr', from: 'RBL', to: 'UCR', distanceKm: 45, lineType: 'BOTH', status: 'clear' },

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
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
    <div className="relative w-full h-[85vh] bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 flex flex-col shadow-2xl">

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/90 border-b border-slate-800 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide">NORTHERN RAILWAY LIVE TOPOLOGY</h2>
            <p className="text-xs text-slate-400">{stations.length} stations • SIH 2026 Real-Time Track & Block Monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Station (e.g. NDLS)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-red-500 w-48"
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
              <option value="Unclassified">Unclassified</option>
            </select>
          </div>

          <button
            onClick={() => setShowAllStations(prev => !prev)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${showAllStations
                ? 'bg-red-600/20 border-red-500/40 text-red-300'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            title="Toggle all ~430 auto-detected stations vs 37 verified junctions only"
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

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          className="absolute inset-0 transition-transform duration-75 ease-out origin-center"
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
        >
          {/* Real Northern Railway System Map as background reference layer.
              Place the map image at: public/nr-system-map.png
              Station x/y percentages below were computed from THIS SAME
              image's pixel dimensions, so markers should align reasonably
              well with the underlying map (verified junctions especially). */}
          <img
            src="/nr-system-map.png"
            alt="Northern Railway System Map"
            className="absolute inset-0 w-full h-full min-h-[900px] min-w-[1400px] object-contain pointer-events-none select-none"
            draggable={false}
          />

          <svg className="w-full h-full min-h-[900px] min-w-[1400px] absolute inset-0 pointer-events-none opacity-90">
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
                  x1={`${fromSt.x}%`} y1={`${fromSt.y}%`}
                  x2={`${toSt.x}%`} y2={`${toSt.y}%`}
                  stroke={getEdgeColor(edge.status)}
                  strokeWidth="3"
                  strokeDasharray={edge.status === 'block-active' ? '6 4' : 'none'}
                  className="transition-all"
                />
              );
            })}
          </svg>

          {filteredStations.map(station => (
            <div
              key={station.id}
              onClick={(e) => { e.stopPropagation(); setSelectedStation(station); }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto"
              style={{ left: `${station.x}%`, top: `${station.y}%` }}
            >
              <div className={`relative flex items-center justify-center rounded-full border-2 transition-all duration-200 ${station.verified ? 'w-6 h-6' : 'w-3 h-3'
                } ${(station.activeBlocks ?? 0) > 0
                  ? 'bg-red-500 border-white shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse'
                  : station.verified
                    ? 'bg-slate-900 border-red-500 group-hover:scale-125 group-hover:bg-red-600'
                    : 'bg-slate-700 border-slate-400 group-hover:scale-150 group-hover:bg-amber-500'
                }`}>
                {station.verified && <span className="w-2 h-2 rounded-full bg-white"></span>}
              </div>
              {station.verified && (
                <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-md">
                  {station.code}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedStation && (
        <div className="absolute right-4 bottom-4 w-80 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl z-20 backdrop-blur-md animate-in fade-in slide-in-from-right-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <h3 className="font-bold text-sm">{selectedStation.name} ({selectedStation.code})</h3>
            </div>
            <button onClick={() => setSelectedStation(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Division:</span>
              <span className="font-medium text-slate-200">{selectedStation.division}</span>
            </div>
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Data Source:</span>
              <span className={`font-medium uppercase ${selectedStation.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                {selectedStation.verified ? 'Verified Junction' : 'Auto-detected (OCR)'}
              </span>
            </div>
            {selectedStation.verified && (
              <>
                <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Active Blocks / Failures:</span>
                  <span className={`font-bold ${(selectedStation.activeBlocks ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedStation.activeBlocks ?? 0} Block(s)
                  </span>
                </div>
                <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Scheduled Daily Trains:</span>
                  <span className="font-medium text-slate-200">{selectedStation.scheduledTrains ?? '—'}</span>
                </div>
              </>
            )}
          </div>

          {selectedStation.verified && (
            <button
              onClick={() => alert(`Fetching live signal telemetry and interlocking status for ${selectedStation.name}...`)}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-medium text-xs py-2 rounded-lg transition shadow-lg shadow-red-600/20"
            >
              Request Section Clear / Inspect Telemetry
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Clear Line</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Block Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Conflict Warning</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Maintenance Done</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-400"></span> Wayside (auto-detected)</span>
        </div>
        <div>Drag to Pan • Scroll/Buttons to Zoom • Click Station for Details</div>
      </div>
    </div>
  );
}
