import React, { useState, useCallback, useRef } from 'react';
import { parseNavPvt, parseBinaryUbx } from './services/ubxParser';
import { NavPvtData } from './types';
import { InfoPanel } from './components/InfoPanel';
import { Charts } from './components/Charts';
import { Terminal, Database, Trash2, PlayCircle, AlertCircle, Upload, Download } from 'lucide-react';

// Sample data for demonstration
const SAMPLE_HEX = "B5 62 01 07 5C 00 A0 73 9B 16 E2 07 05 13 0D 05 19 39 30 08 34 5D FF FF 03 37 0F 13 42 AB 75 19 02 7A F2 23 8C 15 00 00 F8 37 00 00 F6 13 00 00 8C 19 00 00 FF 00 00 00 6D 00 00 00 78 00 00 00 3C 02 00 00 00 00 00 00 C4 01 00 00 E1 5C 16 00 64 00 00 00 00 00 00 00 00 00 00 00 5D DB";

const App: React.FC = () => {
  const [inputHex, setInputHex] = useState<string>('');
  const [parseHistory, setParseHistory] = useState<NavPvtData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Text Parsing
  const handleParse = useCallback(() => {
    setError(null);
    if (!inputHex.trim()) return;

    // Split input by newlines to handle potential multi-line pastes
    const lines = inputHex.split('\n');
    const newPackets: NavPvtData[] = [];
    let lastError = null;

    lines.forEach(line => {
        if(line.trim().length > 0) {
            const result = parseNavPvt(line);
            if (result.success && result.data) {
                newPackets.push(result.data);
            } else {
                lastError = result.error;
            }
        }
    });

    if (newPackets.length > 0) {
      setParseHistory(prev => [...prev, ...newPackets].sort((a,b) => a.iTOW - b.iTOW));
      setInputHex('');
    } else if (lastError) {
      setError(lastError);
    }
  }, [inputHex]);

  // File Upload Handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const packets = parseBinaryUbx(buffer);
        
        if (packets.length > 0) {
           setParseHistory(prev => [...prev, ...packets].sort((a,b) => a.iTOW - b.iTOW));
        } else {
           setError("No valid UBX-NAV-PVT packets found in this file.");
        }
      } catch (err) {
        setError("Failed to parse file.");
        console.error(err);
      } finally {
        setLoading(false);
        // Reset input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setError("Error reading file.");
      setLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // CSV Export (Convert to ASCII sentences)
  const exportToCSV = () => {
    if (parseHistory.length === 0) return;

    const headers = [
      "iTOW", "Timestamp", "FixType", "NumSV", 
      "Lon", "Lat", "Height_MSL", "hAcc", "vAcc",
      "VelN", "VelE", "VelD", "GroundSpeed", "Heading", "pDOP"
    ];

    const rows = parseHistory.map(d => [
      d.iTOW,
      d.timestamp,
      d.fixType,
      d.numSV,
      d.lon.toFixed(7),
      d.lat.toFixed(7),
      d.hMSL,
      d.hAcc,
      d.vAcc,
      d.velN,
      d.velE,
      d.velD,
      d.gSpeed,
      d.headMot.toFixed(2),
      d.pDOP.toFixed(2)
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ubx_data_export_${new Date().toISOString().slice(0,19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadSample = useCallback(() => {
    setInputHex(SAMPLE_HEX);
  }, []);

  const clearHistory = useCallback(() => {
    setParseHistory([]);
    setError(null);
  }, []);

  const latestData = parseHistory.length > 0 ? parseHistory[parseHistory.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".ubx,.bin,.log" 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-lg border-b border-ublox-red">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-red-500" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">ZED-X20P <span className="text-slate-400 font-light">Integration Tool</span></h1>
              <p className="text-xs text-slate-400">UBX-NAV-PVT Message Analyzer</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={triggerFileUpload}
                disabled={loading}
                className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-slate-600"
              >
                {loading ? <span className="animate-spin">⌛</span> : <Upload size={16} />}
                Load File
              </button>
             {parseHistory.length > 0 && (
               <button 
                  onClick={exportToCSV}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download size={16} /> Export ASCII
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Input & Controls */}
        <div className="xl:col-span-1 space-y-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Terminal size={18} /> Manual Input
              </h2>
              <button 
                onClick={loadSample}
                className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
              >
                <PlayCircle size={12} /> Load Sample
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <textarea 
                className="w-full h-40 font-mono text-xs bg-slate-900 text-green-400 p-3 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 outline-none border border-slate-700"
                placeholder="Paste HEX string here (e.g. B5 62 01 07 ...)"
                value={inputHex}
                onChange={(e) => setInputHex(e.target.value)}
              />
              
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button 
                onClick={handleParse}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm"
              >
                Parse Hex String
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Database size={18} /> Packet Log ({parseHistory.length})
              </h2>
              <button 
                onClick={clearHistory}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Clear History"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {parseHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No packets parsed yet. <br/>
                  <span className="text-xs text-slate-300">Upload a binary UBX file or paste Hex.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {parseHistory.slice().reverse().map((pkt, i) => (
                    <div key={i} className="p-3 hover:bg-slate-50 transition-colors cursor-default">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {pkt.timestamp}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pkt.fixType === 3 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {pkt.fixType === 3 ? '3D FIX' : `FIX: ${pkt.fixType}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <span>Lat: {pkt.lat.toFixed(5)}</span>
                        <span>Lon: {pkt.lon.toFixed(5)}</span>
                        <span>Alt: {(pkt.hMSL/1000).toFixed(1)}m</span>
                        <span>SVs: {pkt.numSV}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Visualization */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Latest Packet Analysis</h2>
            <InfoPanel data={latestData} />
          </div>

          <div className="space-y-4">
             <h2 className="text-lg font-semibold text-slate-800">Real-time Telemetry</h2>
             <Charts history={parseHistory} />
          </div>

        </div>

      </main>
    </div>
  );
};

export default App;