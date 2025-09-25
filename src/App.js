import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Clock, FolderOpen, Download, Upload } from 'lucide-react';
import './App.css';

const App = () => {
  const [activities, setActivities] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [newActivity, setNewActivity] = useState({ name: '', startTime: 0, duration: 1, color: '#3B82F6' });
  const [hoveredActivity, setHoveredActivity] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showImportExport, setShowImportExport] = useState(false);
  const fileInputRef = useRef(null);

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  // Format duration for display
  const formatDuration = (duration) => {
    const hours = Math.floor(duration / 2);
    const minutes = (duration % 2) * 30;
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  // Handle mouse movement for tooltip positioning
  const handleMouseMove = (e) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // Convert time slot (0-47) to clock time
  const slotToTime = (slot) => {
    const hours = Math.floor(slot / 2);
    const minutes = (slot % 2) * 30;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Generate SVG path for activity segment
  const generateActivityPath = (startSlot, duration) => {
    const centerX = 200;
    const centerY = 200;
    const outerRadius = 180;
    const innerRadius = 140;
    
    const startAngle = (startSlot / 48) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((startSlot + duration) / 48) * 2 * Math.PI - Math.PI / 2;
    
    const x1 = centerX + outerRadius * Math.cos(startAngle);
    const y1 = centerY + outerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(endAngle);
    const y2 = centerY + outerRadius * Math.sin(endAngle);
    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(startAngle);
    const y4 = centerY + innerRadius * Math.sin(startAngle);
    
    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;
    
    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  };

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

  const deleteActivity = (id) => {
    setActivities(activities.filter(act => act.id !== id));
  };

  const startEdit = (activity) => {
    setEditingActivity({ ...activity });
  };

  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Get day name for filename
  const getDayName = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Export schedule to JSON with improved filename
  const exportSchedule = () => {
    const currentDate = getCurrentDate();
    const dayName = getDayName();
    
    const scheduleData = {
      date: currentDate,
      dayName: dayName,
      activities: activities,
      exportedAt: new Date().toISOString(),
      totalActivities: activities.length
    };
    
    const dataStr = JSON.stringify(scheduleData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule-${currentDate}-${dayName.toLowerCase()}.json`;
    
    link.setAttribute('download', `schedule-${currentDate}-${dayName.toLowerCase()}.json`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Schedule saved as: schedule-${currentDate}-${dayName.toLowerCase()}.json\n\nTip: Create a 'schedule' folder to organize your schedule files!`);
  };

  // Import schedule from JSON with better error handling
  const importSchedule = (event) => {
    const file = event.target.files[0];
    if (file) {
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
              alert(`Schedule imported successfully!\n\nOriginal date: ${importDate}\nActivities loaded: ${validActivities.length}`);
            } else {
              alert('No valid activities found in the schedule file.');
            }
          } else {
            alert('Invalid schedule file format. Please select a valid schedule file.');
          }
        } catch (error) {
          alert('Error reading schedule file. Please ensure it\'s a valid JSON file exported from this app.');
        }
      };
      reader.readAsText(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowImportExport(false);
  };

  // Trigger file picker
  const triggerFileImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Load sample schedule
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

  // Quick save feature - saves with current timestamp
  const quickSave = () => {
    if (activities.length === 0) {
      alert('No activities to save. Add some activities first!');
      return;
    }
    exportSchedule();
  };

  // Generate hour markers
  const hourMarkers = [];
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
    const x1 = 200 + 185 * Math.cos(angle);
    const y1 = 200 + 185 * Math.sin(angle);
    const x2 = 200 + 175 * Math.cos(angle);
    const y2 = 200 + 175 * Math.sin(angle);
    
    const textX = 200 + 195 * Math.cos(angle);
    const textY = 200 + 195 * Math.sin(angle);
    
    hourMarkers.push(
      <g key={i}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#374151" strokeWidth="2" />
        <text x={textX} y={textY} textAnchor="middle" dominantBaseline="middle" 
              className="text-xs fill-gray-600 font-medium">
          {i}
        </text>
      </g>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Daily Schedule Watch</h1>
        
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Watch Interface */}
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <svg width="400" height="400" className="drop-shadow-2xl">
                {/* Outer circle */}
                <circle cx="200" cy="200" r="190" fill="none" stroke="#1F2937" strokeWidth="2" />
                
                {/* Inner circle */}
                <circle cx="200" cy="200" r="135" fill="#111827" stroke="#374151" strokeWidth="1" />
                
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
                
                {/* Center dot */}
                <circle cx="200" cy="200" r="4" fill="#EF4444" />
                
                {/* Current time indicator */}
                <g>
                  <line x1="200" y1="200" x2="200" y2="40" stroke="#EF4444" strokeWidth="3" className="animate-pulse" />
                  <circle cx="200" cy="40" r="6" fill="#EF4444" />
                </g>
              </svg>
              
              {/* Center time display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-gray-800 rounded-full px-4 py-2 text-white text-sm font-mono">
                  <Clock className="inline w-4 h-4 mr-2" />
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="w-full lg:w-96 space-y-6">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Activity
              </button>
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FolderOpen className="w-5 h-5" />
                Manage Files
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={quickSave}
                disabled={activities.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Quick Save
              </button>
              <button
                onClick={triggerFileImport}
                className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                Quick Load
              </button>
            </div>

            {/* Import/Export Panel */}
            {showImportExport && (
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <h3 className="text-white text-lg font-semibold">File Management</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={exportSchedule}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    disabled={activities.length === 0}
                  >
                    <Download className="w-5 h-5" />
                    Save Current Schedule
                  </button>
                  
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importSchedule}
                      className="hidden"
                      id="import-schedule"
                      ref={fileInputRef}
                    />
                    <label
                      htmlFor="import-schedule"
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded transition-colors cursor-pointer block text-center flex items-center justify-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      Load Saved Schedule
                    </label>
                  </div>
                  
                  <button
                    onClick={loadSampleSchedule}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    Load Sample Schedule
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

            {/* Add/Edit Form */}
            {(showAddForm || editingActivity) && (
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <h3 className="text-white text-lg font-semibold">
                  {editingActivity ? 'Edit Activity' : 'Add New Activity'}
                </h3>
                
                <input
                  type="text"
                  placeholder="Activity name"
                  value={editingActivity ? editingActivity.name : newActivity.name}
                  onChange={(e) => editingActivity 
                    ? setEditingActivity({...editingActivity, name: e.target.value})
                    : setNewActivity({...newActivity, name: e.target.value})
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Start Time</label>
                    <select
                      value={editingActivity ? editingActivity.startTime : newActivity.startTime}
                      onChange={(e) => editingActivity
                        ? setEditingActivity({...editingActivity, startTime: e.target.value})
                        : setNewActivity({...newActivity, startTime: e.target.value})
                      }
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      {Array.from({length: 48}, (_, i) => (
                        <option key={i} value={i}>{slotToTime(i)}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Duration (30min blocks)</label>
                    <select
                      value={editingActivity ? editingActivity.duration : newActivity.duration}
                      onChange={(e) => editingActivity
                        ? setEditingActivity({...editingActivity, duration: e.target.value})
                        : setNewActivity({...newActivity, duration: e.target.value})
                      }
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      {Array.from({length: 16}, (_, i) => (
                        <option key={i+1} value={i+1}>{i+1} block{i > 0 ? 's' : ''} ({(i+1) * 0.5}h)</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Color</label>
                  <div className="flex gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => editingActivity
                          ? setEditingActivity({...editingActivity, color})
                          : setNewActivity({...newActivity, color})
                        }
                        className={`w-8 h-8 rounded-full border-2 ${
                          (editingActivity ? editingActivity.color : newActivity.color) === color
                            ? 'border-white' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={editingActivity ? updateActivity : addActivity}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                  >
                    {editingActivity ? 'Update' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingActivity(null);
                      setShowAddForm(false);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Activities List */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-semibold">Today's Schedule</h3>
                {activities.length > 0 && (
                  <span className="text-gray-400 text-sm">{activities.length} activities</span>
                )}
              </div>
              {activities.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No activities scheduled</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {activities.sort((a, b) => a.startTime - b.startTime).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: activity.color }}></div>
                        <div>
                          <div className="text-white font-medium">{activity.name}</div>
                          <div className="text-gray-400 text-sm">
                            {slotToTime(activity.startTime)} - {slotToTime(activity.startTime + activity.duration)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(activity)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteActivity(activity.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <div 
            className="fixed pointer-events-none z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-600 max-w-xs"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 10
            }}
          >
            <div className="font-semibold text-sm mb-1">{hoveredActivity.name}</div>
            <div className="text-xs text-gray-300">
              {slotToTime(hoveredActivity.startTime)} - {slotToTime(hoveredActivity.startTime + hoveredActivity.duration)}
            </div>
            <div className="text-xs text-gray-400">
              Duration: {formatDuration(hoveredActivity.duration)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
