'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Search, ZoomIn, ZoomOut, RotateCcw, Layers, MapPin, Train, AlertTriangle, Info, X, ChevronDown, ChevronUp,  } from 'lucide-react';

// Backend integration: GET /api/network/stations and /api/network/edges for live data

interface Station {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  division: string;
  zone: string;
  activeBlocks: number;
  scheduledTrains: number;
  type: 'major' | 'junction' | 'regular';
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

// Approximate geographic layout for NR stations on a 