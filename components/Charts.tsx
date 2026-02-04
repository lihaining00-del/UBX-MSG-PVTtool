import React from 'react';
import { NavPvtData } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

interface ChartsProps {
  history: NavPvtData[];
}

export const Charts: React.FC<ChartsProps> = ({ history }) => {
  if (history.length === 0) return null;

  // Prepare data for charts
  const timeSeriesData = history.map((pt, idx) => ({
    time: pt.timestamp.split(' ')[1], // HH:MM:SS
    alt: pt.hMSL / 1000, // meters
    speed: pt.gSpeed / 1000 * 3.6, // km/h
    sv: pt.numSV,
    idx: idx
  }));

  // Scatter plot data - we need to normalize lat/lon to meters relative to the first point to show drift/movement effectively
  // otherwise small changes are lost in the large degree numbers
  const firstPt = history[0];
  const scatterData = history.map(pt => ({
    // Crude approximation: 1 deg lat ~ 111km, 1 deg lon ~ 111km * cos(lat)
    // Converting difference to meters for X/Y
    x: (pt.lon - firstPt.lon) * 111320 * Math.cos(firstPt.lat * Math.PI / 180),
    y: (pt.lat - firstPt.lat) * 110574,
    speed: pt.gSpeed
  }));

  return (
    <div className="space-y-6">
      
      {/* Row 1: Altitude & Speed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Altitude Profile (MSL)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{fontSize: 10}} stroke="#64748b" />
                <YAxis unit=" m" width={50} tick={{fontSize: 10}} stroke="#64748b" domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Line type="monotone" dataKey="alt" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Altitude" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Ground Speed</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{fontSize: 10}} stroke="#64748b" />
                <YAxis unit=" km/h" width={50} tick={{fontSize: 10}} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Line type="monotone" dataKey="speed" stroke="#ed1c24" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Speed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Relative Position Plot */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">2D Position Plot (Relative Meters)</h3>
           <span className="text-xs text-slate-400">Relative to first point</span>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" dataKey="x" name="East" unit="m" stroke="#64748b" tick={{fontSize: 10}} />
              <YAxis type="number" dataKey="y" name="North" unit="m" stroke="#64748b" tick={{fontSize: 10}} />
              <ZAxis type="number" dataKey="speed" range={[20, 100]} name="Speed" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Scatter name="Position" data={scatterData} fill="#8884d8" shape="circle" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};