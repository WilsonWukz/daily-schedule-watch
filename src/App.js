import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, FolderOpen, Download, Upload, ZoomIn, ZoomOut, CornerDownLeft } from 'lucide-react';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const App = () => {
  const [activities, setActivities] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [newActivity, setNewActivity] = useState({ name: '', startTime: 0, duration: 1, color: '#3B82F6' });
  const [hoveredActivity, setHoveredActivity] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showImportExport, setShowImportExport] = useState(false);
  const fileInputRef = useRef(null);

  // Layout constants
  const CANVAS_SIZE = 700;
  const CENTER = CANVAS_SIZE / 2;
  const OUTER_RADIUS = 140;
  const INNER_RADIUS = 110;
  const LABEL_RADIUS = 250;
  const LABEL_BOX_WIDTH = 140;

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const minZoom = 0.5;
  const maxZoom = 2;
  const zoomStep = 0.1;
  const watchWrapperRef = useRef(null);

  // HUD position state (draggable zoom panel)
  const [hudPos, setHudPos] = useState({ x: 24, y: 24 });
  const hudRef = useRef(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hudStartPosRef = useRef({ x: 24, y: 24 });

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  // Helpers
  const formatDuration = (duration) => {
    const hours = Math.floor(duration / 2);
    const minutes = (duration % 2) * 30;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });

  const slotToTime = (slot) => {
    const hours = Math.floor(slot / 2) % 24;
    const minutes = (slot % 2) * 30;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const generateActivityPath = (startSlot, duration) => {
    const startAngle = (startSlot / 48) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((startSlot + duration) / 48) * 2 * Math.PI - Math.PI / 2;

    const x1 = CENTER + OUTER_RADIUS * Math.cos(startAngle);
    const y1 = CENTER + OUTER_RADIUS * Math.sin(startAngle);
    const x2 = CENTER + OUTER_RADIUS * Math.cos(endAngle);
    const y2 = CENTER + OUTER_RADIUS * Math.sin(endAngle);
    const x3 = CENTER + INNER_RADIUS * Math.cos(endAngle);
    const y3 = CENTER + INNER_RADIUS * Math.sin(endAngle);
    const x4 = CENTER + INNER_RADIUS * Math.cos(startAngle);
    const y4 = CENTER + INNER_RADIUS * Math.sin(startAngle);

    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;

    return `M ${x1} ${y1} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  };

  const calculateLabelPosition = (activity, index) => {
    const middleSlot = activity.startTime + (activity.duration / 2);
    const middleAngle = (middleSlot / 48) * 2 * Math.PI - Math.PI / 2;

    const connectionX = CENTER + OUTER_RADIUS * Math.cos(middleAngle);
    const connectionY = CENTER + OUTER_RADIUS * Math.sin(middleAngle);

    let labelX = CENTER + LABEL_RADIUS * Math.cos(middleAngle);
    let labelY = CENTER + LABEL_RADIUS * Math.sin(middleAngle);

    const totalActivities = activities.length;
    if (totalActivities > 1) {
      const spread = Math.min(0.45, 0.9 / Math.max(1, totalActivities));
      const offsetAngle = (index * spread) - (totalActivities * spread / 2);
      const adjustmentRadius = 14 + Math.min(30, totalActivities);
      labelX += adjustmentRadius * Math.sin(middleAngle + offsetAngle);
      labelY -= adjustmentRadius * Math.cos(middleAngle + offsetAngle);
    }

    let textAnchor = 'middle';
    if (labelX > CENTER + 50) textAnchor = 'start';
    else if (labelX < CENTER - 50) textAnchor = 'end';

    return { labelX, labelY, connectionX, connectionY, textAnchor };
  };

  // Activities CRUD
  const addActivity = () => {
    if (newActivity.name.trim()) {
      const activity = {
        id: Date.now(),
        ...newActivity,
        startTime: parseInt(newActivity.startTime),
        duration: parseInt(newActivity.duration)
      };
      setActivities([...activities, activity]);
      setNewActivity({ name: '', startTime: 0, duration: 1, color: colors[activities.length % colors.length] });
      setShowAddForm(false);
    }
  };

  const updateActivity = () => {
    setActivities(activities.map(act =>
      act.id === editingActivity.id
        ? { ...editingActivity, startTime: parseInt(editingActivity.startTime), duration: parseInt(editingActivity.duration) }
        : act
    ));
    setEditingActivity(null);
  };

  const deleteActivity = (id) => setActivities(activities.filter(act => act.id !== id));
  const startEdit = (activity) => setEditingActivity({ ...activity });

  const getCurrentDate = () => new Date().toISOString().split('T')[0];
  const getDayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const exportSchedule = () => {
    const currentDate = getCurrentDate();
    const dayName = getDayName();
    const scheduleData = {
      date: currentDate, dayName, activities, exportedAt: new Date().toISOString(), totalActivities: activities.length
    };
    const dataStr = JSON.stringify(scheduleData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule-${currentDate}-${dayName.toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert(`Schedule saved as: schedule-${currentDate}-${dayName.toLowerCase()}.json

Tip: Create a 'schedule' folder to organize your schedule files!`);
  };

  const importSchedule = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const scheduleData = JSON.parse(e.target.result);
        if (scheduleData.activities && Array.isArray(scheduleData.activities)) {
          const validActivities = scheduleData.activities.filter(activity =>
            activity.name &&
            typeof activity.startTime === 'number' &&
            typeof activity.duration === 'number' &&
            activity.color
          );
          if (validActivities.length > 0) {
            setActivities(validActivities);
            const importDate = scheduleData.date ? new Date(scheduleData.date).toLocaleDateString() : 'Unknown date';
            alert(`Schedule imported successfully!

Original date: ${importDate}
Activities loaded: ${validActivities.length}`);
          } else {
            alert('No valid activities found in the schedule file.');
          }
        } else {
          alert('Invalid schedule file format. Please select a valid schedule file.');
        }
      } catch (err) {
        alert('Error reading schedule file. Please ensure it\'s a valid JSON file exported from this app.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowImportExport(false);
  };

  const triggerFileImport = () => fileInputRef.current && fileInputRef.current.click();

  const loadSampleSchedule = () => {
    const sampleActivities = [
      { id: 1, name: 'Morning Workout', startTime: 14, duration: 2, color: '#10B981' },
      { id: 2, name: 'Work - Focus Time', startTime: 18, duration: 8, color: '#3B82F6' },
      { id: 3, name: 'Lunch Break', startTime: 26, duration: 2, color: '#F59E0B' },
      { id: 4, name: 'Meetings', startTime: 28, duration: 4, color: '#EF4444' },
      { id: 5, name: 'Evening Walk', startTime: 36, duration: 2, color: '#84CC16' },
      { id: 6, name: 'Dinner & Family', startTime: 38, duration: 3, color: '#EC4899' }
    ];
    setActivities(sampleActivities);
    setShowImportExport(false);
  };

  const quickSave = () => {
    if (activities.length === 0) return alert('No activities to save. Add some activities first!');
    exportSchedule();
  };

  // hour markers (small fonts)
  const hourMarkers = [];
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
    const x1 = CENTER + (OUTER_RADIUS + 5) * Math.cos(angle);
    const y1 = CENTER + (OUTER_RADIUS + 5) * Math.sin(angle);
    const x2 = CENTER + (OUTER_RADIUS - 5) * Math.cos(angle);
    const y2 = CENTER + (OUTER_RADIUS - 5) * Math.sin(angle);
    const textX = CENTER + (OUTER_RADIUS + 12) * Math.cos(angle);
    const textY = CENTER + (OUTER_RADIUS + 12) * Math.sin(angle);

    hourMarkers.push(
      <g key={i}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#374151" strokeWidth="1.5" />
        <text x={textX} y={textY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10 }} className="fill-gray-600 font-medium">
          {i}
        </text>
      </g>
    );
  }

  // Zoom controls
  const zoomIn = () => setZoom(z => clamp(Number((z + zoomStep).toFixed(2)), minZoom, maxZoom));
  const zoomOut = () => setZoom(z => clamp(Number((z - zoomStep).toFixed(2)), minZoom, maxZoom));
  const resetZoom = () => setZoom(1);
  const handleZoomSlider = (e) => setZoom(Number(e.target.value));

  // wheel -> zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const sensitivity = 0.0015;
    setZoom(z => clamp(Number((z + delta * sensitivity).toFixed(3)), minZoom, maxZoom));
  };

  useEffect(() => {
    const node = watchWrapperRef.current;
    if (!node) return;
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, []);

  // HUD drag handlers (only start when pressing the handle)
  const onHudPointerDown = (e) => {
    // start dragging
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hudStartPosRef.current = { ...hudPos };
    try { hudRef.current && hudRef.current.setPointerCapture && hudRef.current.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  };
  const onHudPointerMove = (e) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setHudPos({ x: hudStartPosRef.current.x + dx, y: hudStartPosRef.current.y + dy });
  };
  const onHudPointerUp = (e) => {
    draggingRef.current = false;
    try { hudRef.current && hudRef.current.releasePointerCapture && hudRef.current.releasePointerCapture(e.pointerId); } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col xl:flex-row gap-6 items-start h-screen">
          {/* Watch Interface */}
          <div className="flex-1 flex justify-center items-center min-h-screen">
            {/* outer wrapper stays fixed and scrollable (so scaled content can overflow and be scrolled to) */}
            <div
              ref={watchWrapperRef}
              style={{
                width: CANVAS_SIZE,
                height: CANVAS_SIZE,
                overflow: 'auto',
                borderRadius: 8,
                margin: '0 auto',
                position: 'relative',
                background: 'transparent'
              }}
              className="mx-auto"
            >
              {/* SVG viewport remains fixed size. Only the inner <g> is scaled */}
              <svg width={CANVAS_SIZE} height={CANVAS_SIZE} className="drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                <g transform={`translate(${CENTER}, ${CENTER}) scale(${zoom}) translate(${-CENTER}, ${-CENTER})`}>
                  {/* Outer / Inner circles */}
                  <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS} fill="none" stroke="#1F2937" strokeWidth="2" />
                  <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="#111827" stroke="#374151" strokeWidth="1" />

                  {/* Hour markers */}
                  {hourMarkers}

                  {/* Activity segments */}
                  {activities.map((activity) => (
                    <g key={activity.id}>
                      <path
                        d={generateActivityPath(activity.startTime, activity.duration)}
                        fill={activity.color}
                        stroke="#1F2937"
                        strokeWidth="1"
                        className="hover:brightness-110 cursor-pointer transition-all"
                        onClick={() => startEdit(activity)}
                        onMouseEnter={() => setHoveredActivity(activity)}
                        onMouseLeave={() => setHoveredActivity(null)}
                        onMouseMove={handleMouseMove}
                      />
                    </g>
                  ))}

                  {/* Labels & connectors */}
                  {activities.map((activity, index) => {
                    const { labelX, labelY, connectionX, connectionY, textAnchor } = calculateLabelPosition(activity, index);
                    const rectX = labelX + (textAnchor === 'end' ? -LABEL_BOX_WIDTH : textAnchor === 'start' ? 0 : -LABEL_BOX_WIDTH / 2);
                    const textX = labelX + (textAnchor === 'end' ? -LABEL_BOX_WIDTH / 2 : textAnchor === 'start' ? LABEL_BOX_WIDTH / 2 : 0);
                    const dotX = labelX + (textAnchor === 'end' ? -LABEL_BOX_WIDTH + 12 : textAnchor === 'start' ? 18 : -45);

                    return (
                      <g key={`label-${activity.id}`}>
                        <line x1={connectionX} y1={connectionY} x2={labelX} y2={labelY} stroke={activity.color} strokeWidth="1.6" strokeDasharray="3,3" className="opacity-80" />
                        <rect x={rectX} y={labelY - 22} width={LABEL_BOX_WIDTH} height={44} rx="8" fill="#1F2937" stroke={activity.color} strokeWidth="1" className="opacity-95" />
                        <text x={textX} y={labelY - 6} textAnchor="middle" className="fill-white font-medium" style={{ fontSize: '11px' }}>
                          {activity.name.length > 20 ? activity.name.substring(0, 20) + '...' : activity.name}
                        </text>
                        <text x={textX} y={labelY + 11} textAnchor="middle" className="fill-gray-300" style={{ fontSize: '10px' }}>
                          {slotToTime(activity.startTime)} - {slotToTime(activity.startTime + activity.duration)}
                        </text>
                        <circle cx={dotX} cy={labelY} r="5" fill={activity.color} className="cursor-pointer" onClick={() => startEdit(activity)} />
                      </g>
                    );
                  })}

                  {/* Center dot & current time indicator */}
                  <circle cx={CENTER} cy={CENTER} r="4" fill="#EF4444" />
                  <g>
                    <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - (INNER_RADIUS + 40)} stroke="#EF4444" strokeWidth="2.5" className="animate-pulse" />
                    <circle cx={CENTER} cy={CENTER - (INNER_RADIUS + 40)} r="6" fill="#EF4444" />
                  </g>
                </g>
              </svg>

              {/* Center time overlay (not scaled) */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div className="bg-gray-800 rounded-full px-3 py-2 text-white text-sm font-mono" style={{ fontSize: 12 }}>
                  <Clock className="inline w-4 h-4 mr-2" />
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Zoom HUD (draggable by handle only) */}
            <div
              ref={hudRef}
              onPointerMove={onHudPointerMove}
              onPointerUp={onHudPointerUp}
              style={{ position: 'absolute', left: hudPos.x, top: hudPos.y, zIndex: 40 }}
              className="bg-black/40 backdrop-blur rounded-md p-2 flex items-center gap-2"
            >
              {/* Drag handle: only when this is pressed dragging starts - prevents interfering with slider/input */}
              <div onPointerDown={onHudPointerDown} style={{ cursor: 'grab' }} className="p-1 select-none no-drag">
                {/* simple handle visual */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="5" cy="5" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/></svg>
              </div>

              <button onClick={zoomOut} aria-label="Zoom out" className="p-1 hover:bg-white/10 rounded no-drag">
                <ZoomOut className="w-4 h-4 text-white" />
              </button>

              <input
                aria-label="Zoom slider"
                type="range"
                min={minZoom}
                max={maxZoom}
                step={0.01}
                value={zoom}
                onChange={handleZoomSlider}
                className="w-32 no-drag"
              />

              <button onClick={zoomIn} aria-label="Zoom in" className="p-1 hover:bg-white/10 rounded no-drag">
                <ZoomIn className="w-4 h-4 text-white" />
              </button>

              <button onClick={resetZoom} title="Reset zoom" className="p-1 hover:bg-white/10 rounded no-drag">
                <CornerDownLeft className="w-4 h-4 text-white" />
              </button>

              {/* numeric input to set zoom directly (proportion like 1.25) */}
              <input
                type="number"
                min={minZoom}
                max={maxZoom}
                step={0.01}
                value={zoom}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setZoom(clamp(v, minZoom, maxZoom));
                }}
                className="w-20 bg-black/20 text-white p-1 rounded text-sm no-drag"
                title="Set zoom proportion (e.g. 1.2 = 120%)"
              />

              <div className="text-xs text-white/90 ml-2">{Math.round(zoom * 100)}%</div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="w-full xl:w-96 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowAddForm(!showAddForm)} className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Plus className="w-5 h-5" /> Add Activity
              </button>
              <button onClick={() => setShowImportExport(!showImportExport)} className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <FolderOpen className="w-5 h-5" /> Manage Files
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={quickSave} disabled={activities.length === 0} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
                <Download className="w-4 h-4" /> Quick Save
              </button>
              <button onClick={triggerFileImport} className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
                <Upload className="w-4 h-4" /> Quick Load
              </button>
            </div>

            {showImportExport && (
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <h3 className="text-white text-lg font-semibold">File Management</h3>

                <div className="space-y-3">
                  <button onClick={exportSchedule} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2" disabled={activities.length === 0}>
                    <Download className="w-5 h-5" /> Save Current Schedule
                  </button>

                  <div>
                    <input type="file" accept=".json" onChange={importSchedule} className="hidden" id="import-schedule" ref={fileInputRef} />
                    <label htmlFor="import-schedule" className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded transition-colors cursor-pointer block text-center flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5" /> Load Saved Schedule
                    </label>
                  </div>

                  <button onClick={loadSampleSchedule} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5" /> Load Sample Schedule
                  </button>

                  <div className="text-xs text-gray-300 mt-4 p-4 bg-gray-700 rounded border-l-4 border-blue-500">
                    <div className="font-semibold text-blue-300 mb-2">💡 File Organization Tips:</div>
                    <div className="space-y-1 text-gray-300">
                      <div>• Create a <code className="bg-gray-600 px-2 py-1 rounded text-xs">schedule</code> folder to organize your files</div>
                      <div>• Files are automatically named with date and day</div>
                      <div>• Your browser remembers the last used folder</div>
                      <div>• Use "Quick Save" for faster saving</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(showAddForm || editingActivity) && (
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <h3 className="text-white text-lg font-semibold">{editingActivity ? 'Edit Activity' : 'Add New Activity'}</h3>

                <input type="text" placeholder="Activity name" value={editingActivity ? editingActivity.name : newActivity.name} onChange={(e) => editingActivity ? setEditingActivity({ ...editingActivity, name: e.target.value }) : setNewActivity({ ...newActivity, name: e.target.value })} className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Start Time</label>
                    <select value={editingActivity ? editingActivity.startTime : newActivity.startTime} onChange={(e) => editingActivity ? setEditingActivity({ ...editingActivity, startTime: e.target.value }) : setNewActivity({ ...newActivity, startTime: e.target.value })} className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
                      {Array.from({ length: 48 }, (_, i) => (<option key={i} value={i}>{slotToTime(i)}</option>))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Duration (30min blocks)</label>
                    <select value={editingActivity ? editingActivity.duration : newActivity.duration} onChange={(e) => editingActivity ? setEditingActivity({ ...editingActivity, duration: e.target.value }) : setNewActivity({ ...newActivity, duration: e.target.value })} className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
                      {Array.from({ length: 16 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1} block{i > 0 ? 's' : ''} ({(i + 1) * 0.5}h)</option>))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Color</label>
                  <div className="flex gap-2">
                    {colors.map((color) => (
                      <button key={color} onClick={() => editingActivity ? setEditingActivity({ ...editingActivity, color }) : setNewActivity({ ...newActivity, color })} className={`w-8 h-8 rounded-full border-2 ${(editingActivity ? editingActivity.color : newActivity.color) === color ? 'border-white' : 'border-gray-600'}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={editingActivity ? updateActivity : addActivity} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors">{editingActivity ? 'Update' : 'Add'}</button>
                  <button onClick={() => { setEditingActivity(null); setShowAddForm(false); }} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-semibold">Today's Schedule</h3>
                {activities.length > 0 && <span className="text-gray-400 text-sm">{activities.length} activities</span>}
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No activities scheduled</p>
                  <p className="text-gray-500 text-sm">Try loading the sample schedule to see the labels in action!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {activities.sort((a, b) => a.startTime - b.startTime).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: activity.color }} />
                        <div>
                          <div className="text-white font-medium">{activity.name}</div>
                          <div className="text-gray-400 text-sm">{slotToTime(activity.startTime)} - {slotToTime(activity.startTime + activity.duration)}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(activity)} className="text-blue-400 hover:text-blue-300 p-1"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteActivity(activity.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredActivity && (
          <div className="fixed pointer-events-none z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-600 max-w-xs" style={{ left: mousePosition.x + 10, top: mousePosition.y - 10 }}>
            <div className="font-semibold text-sm mb-1">{hoveredActivity.name}</div>
            <div className="text-xs text-gray-300">{slotToTime(hoveredActivity.startTime)} - {slotToTime(hoveredActivity.startTime + hoveredActivity.duration)}</div>
            <div className="text-xs text-gray-400">Duration: {formatDuration(hoveredActivity.duration)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
