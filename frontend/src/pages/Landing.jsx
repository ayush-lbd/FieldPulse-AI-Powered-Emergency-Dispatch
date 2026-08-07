import { Link } from 'react-router-dom';
import { Activity, ShieldAlert, Map, Clock } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2 text-blue-600">
          <Activity size={28} />
          <span className="text-xl font-bold text-gray-800">Field Pulse</span>
        </div>
        <Link to="/login" className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition">
          Dispatcher Login
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 mt-12">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Real-Time Disaster <br/><span className="text-blue-600">Response Intelligence</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-10">
          Field Pulse ingests citizen distress signals, processes them using advanced AI, and visualizes live emergencies on an interactive dashboard for rapid deployment.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          <FeatureCard icon={<ShieldAlert size={32} className="text-red-500"/>} title="AI Triage" desc="Automatically categorizes and prioritizes incoming WhatsApp reports." />
          <FeatureCard icon={<Map size={32} className="text-blue-500"/>} title="Live Mapping" desc="Pinpoints victim locations instantly on a centralized dispatch map." />
          <FeatureCard icon={<Clock size={32} className="text-green-500"/>} title="Rapid Response" desc="Connects field personnel with real-time status updates." />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
      <div className="mb-4 p-3 bg-gray-50 rounded-full">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{desc}</p>
    </div>
  );
}