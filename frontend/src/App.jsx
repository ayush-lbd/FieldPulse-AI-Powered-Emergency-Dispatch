import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { AlertCircle, CheckCircle, Truck, Users, MapPin, MessageSquare, Clock, Phone, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const socket = io('http://localhost:3000');

const getColoredPin = (status) => {
  let color = 'green';
  if (status === 'pending') color = 'red';
  if (status === 'dispatched') color = 'gold';

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

function MapRecenter({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      map.flyTo([location.latitude, location.longitude], 14, { duration: 1.5 });
    }
  }, [location, map]);
  return null;
}

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, dispatched: 0, safe: 0 });
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactMessages, setContactMessages] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const defaultCenter = [25.5941, 85.1376];

  // 1. FIXED: Initial Data Fetch (Runs ONLY once when the app loads)
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 2. FIXED: Socket Listeners (Runs independently when a live event happens)
  useEffect(() => {
    socket.on('dashboard:new_message', (data) => {
      fetchDashboardData();
      if (selectedContact && data.contact?._id === selectedContact._id) {
        fetchMessages(selectedContact._id);
      }
    });

    socket.on('dashboard:status_updated', () => {
      fetchDashboardData();
    });

    return () => {
      socket.off('dashboard:new_message');
      socket.off('dashboard:status_updated');
    };
  }, [selectedContact]);

  // 3. Fetch messages when a contact is selected
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact._id);
    }
  }, [selectedContact]);

  const fetchDashboardData = async () => {
    try {
      const [contactsRes, statsRes] = await Promise.all([
        axios.get('http://localhost:3000/api/v1/contacts'),
        axios.get('http://localhost:3000/api/v1/contacts/stats')
      ]);
      const latestContacts = contactsRes.data.data;
      setContacts(latestContacts);
      setStats(statsRes.data.data);

      // Update the open panel with the freshest data (No more infinite loops!)
      setSelectedContact((currentSnapshot) => {
        if (!currentSnapshot) return null;
        const freshContact = latestContacts.find(c => c._id === currentSnapshot._id);
        return freshContact || currentSnapshot;
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      const res = await axios.get(`http://localhost:3000/api/v1/messages/${contactId}`);
      setContactMessages(res.data.data.reverse());
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (isUpdating || selectedContact.rescueStatus === newStatus) return;
    
    setIsUpdating(true); 
    
    try {
      // 1. Tell the database to update via the Express API
      await axios.patch(`http://localhost:3000/api/v1/contacts/${selectedContact._id}/status`, {
        rescueStatus: newStatus
      });
      
      // 2. Alert the Socket.io server so it can update any OTHER dispatchers' screens
      socket.emit('dispatcher:status_updated', { _id: selectedContact._id, rescueStatus: newStatus });

      // 3. Instantly fetch the fresh data to update OUR screen
      await fetchDashboardData();
      
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsUpdating(false); 
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      
      {/* 📊 TOP HEADER */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Field Pulse Dispatch</h1>
        <div className="flex space-x-4">
          <StatBadge icon={<Users size={18}/>} label="Total" count={stats.total} color="bg-blue-100 text-blue-800" />
          <StatBadge icon={<AlertCircle size={18}/>} label="Pending" count={stats.pending} color="bg-red-100 text-red-800" />
          <StatBadge icon={<Truck size={18}/>} label="Dispatched" count={stats.dispatched} color="bg-yellow-100 text-yellow-800" />
          <StatBadge icon={<CheckCircle size={18}/>} label="Safe" count={stats.safe} color="bg-green-100 text-green-800" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* 📋 SIDEBAR */}
        <aside className="w-80 bg-white border-r overflow-y-auto shadow-md z-10 flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-700">Active Signals</h2>
          </div>
          <div className="flex-1 p-2 space-y-2">
            {contacts.map(contact => (
              <div 
                key={contact._id} 
                onClick={() => setSelectedContact(contact)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${
                  selectedContact?._id === contact._id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 truncate">{contact.profileName}</h3>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                    contact.rescueStatus === 'pending' ? 'bg-red-100 text-red-700' : 
                    contact.rescueStatus === 'dispatched' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {contact.rescueStatus}
                  </span>
                  {contact.lastKnownLocation && <MapPin size={14} className="text-blue-500" />}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* 💬 MIDDLE PANEL */}
        {selectedContact && (
          <section className="w-96 bg-gray-50 border-r flex flex-col z-10 shadow-lg relative">
            
            <button 
              onClick={() => setSelectedContact(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full p-1 transition"
            >
              <X size={18} />
            </button>

            {/* Contact Info & Status Controls */}
            <div className="p-4 bg-white border-b">
              <h2 className="text-xl font-bold text-gray-800">{selectedContact.profileName}</h2>
              <p className="text-sm text-gray-500 flex items-center mt-1"><Phone size={14} className="mr-1"/> {selectedContact.phoneNumber}</p>
              
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button 
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('pending')} 
                  className={`py-1.5 text-xs font-bold rounded transition-colors ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''} ${selectedContact.rescueStatus === 'pending' ? 'bg-red-500 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                  PENDING
                </button>
                <button 
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('dispatched')} 
                  className={`py-1.5 text-xs font-bold rounded transition-colors ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''} ${selectedContact.rescueStatus === 'dispatched' ? 'bg-yellow-500 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                  DISPATCH
                </button>
                <button 
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('safe')} 
                  className={`py-1.5 text-xs font-bold rounded transition-colors ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''} ${selectedContact.rescueStatus === 'safe' ? 'bg-green-500 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                  SAFE
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {contactMessages.map(msg => (
                <div key={msg._id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center"><MessageSquare size={12} className="mr-1"/> {msg.messageType}</span>
                    <span className="text-xs text-gray-400 flex items-center"><Clock size={12} className="mr-1"/> {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  
                  {msg.textContent && <p className="text-gray-800 text-sm">{msg.textContent}</p>}
                  {msg.locationData?.latitude && <p className="text-blue-600 text-xs mt-1">📍 Location Pinned</p>}

                  {msg.aiAnalysis && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded text-xs">
                      <p><strong>Category:</strong> {msg.aiAnalysis.category}</p>
                      <p><strong>Urgency:</strong> <span className={msg.aiAnalysis.urgency === 'Critical' ? 'text-red-600 font-bold' : ''}>{msg.aiAnalysis.urgency}</span></p>
                      <p className="mt-1 text-gray-600">"{msg.aiAnalysis.summary}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🗺️ MAIN AREA: Live Map */}
        <main className="flex-1 relative bg-gray-200">
          <MapContainer center={defaultCenter} zoom={7} className="w-full h-full z-0">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {selectedContact && <MapRecenter location={selectedContact.lastKnownLocation} />}
            
            {contacts.filter(c => c.lastKnownLocation?.latitude && c.lastKnownLocation?.longitude).map(contact => (
              <Marker 
                key={contact._id} 
                position={[contact.lastKnownLocation.latitude, contact.lastKnownLocation.longitude]}
                icon={getColoredPin(contact.rescueStatus)}
              >
                <Popup>
                  <div className="p-1">
                    <strong className="text-sm">{contact.profileName}</strong><br/>
                    <span className="text-xs font-bold uppercase text-blue-600">Status: {contact.rescueStatus}</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </main>

      </div>
    </div>
  );
}

function StatBadge({ icon, label, count, color }) {
  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md ${color}`}>
      {icon}
      <span className="font-semibold">{label}: {count}</span>
    </div>
  );
}