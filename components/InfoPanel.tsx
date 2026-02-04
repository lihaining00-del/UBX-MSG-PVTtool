import React from 'react';
import { NavPvtData, FixType } from '../types';
import { MapPin, Navigation, Activity, Satellite, ShieldCheck, Clock } from 'lucide-react';

interface InfoPanelProps {
  data: NavPvtData | null;
}

const getFixTypeName = (type: number): string => {
  return FixType[type] || 'UNKNOWN';
};

const StatItem = ({ label, value, unit, icon: Icon, color = "text-slate-600" }: any) => (
  <div className="flex items-center p-3 bg-white rounded-lg shadow-sm border border-slate-200">
    <div className={`p-2 rounded-full bg-slate-100 mr-3 ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-slate-800">
        {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
      </p>
    </div>
  </div>
);

export const InfoPanel: React.FC<InfoPanelProps> = ({ data }) => {
  if (!data) return (
    <div className="h-full flex items-center justify-center text-slate-400 p-10 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
      <p>No valid data parsed yet. Enter UBX Hex string to view stats.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <StatItem 
        label="Fix Type" 
        value={getFixTypeName(data.fixType)} 
        unit={`(ID: ${data.fixType})`}
        icon={Navigation}
        color={data.fixType === 3 ? "text-green-600" : "text-amber-500"}
      />
      <StatItem 
        label="UTC Time" 
        value={data.timestamp} 
        unit=""
        icon={Clock}
      />
      <StatItem 
        label="Satellites" 
        value={data.numSV} 
        unit="SVs"
        icon={Satellite}
      />
      
      <StatItem 
        label="Latitude" 
        value={data.lat.toFixed(7)} 
        unit="°"
        icon={MapPin}
      />
      <StatItem 
        label="Longitude" 
        value={data.lon.toFixed(7)} 
        unit="°"
        icon={MapPin}
      />
       <StatItem 
        label="Altitude (MSL)" 
        value={(data.hMSL / 1000).toFixed(2)} 
        unit="m"
        icon={Activity}
      />

      <StatItem 
        label="Ground Speed" 
        value={(data.gSpeed / 1000 * 3.6).toFixed(2)} 
        unit="km/h"
        icon={Activity}
      />
      <StatItem 
        label="Heading" 
        value={data.headMot.toFixed(1)} 
        unit="°"
        icon={Navigation}
      />
       <StatItem 
        label="Pos Accuracy (3D)" 
        value={Math.sqrt(Math.pow(data.hAcc,2) + Math.pow(data.vAcc,2)).toFixed(0)} 
        unit="mm"
        icon={ShieldCheck}
      />
    </div>
  );
};