import React, { useState } from 'react';
import { X } from 'lucide-react';

interface InfoModalProps {
  onClose: () => void;
}

export default function InfoModal({ onClose }: InfoModalProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'gestures' | 'features'>('guide');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">X-Ray Hand Tracker</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6">
          {['guide', 'gestures', 'features'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'guide' && (
            <div className="space-y-4 text-gray-300">
              <h3 className="text-lg font-semibold text-white mb-4">How to Use</h3>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-white">Show Both Hands</p>
                  <p className="text-sm">Position both hands in front of your camera to activate the effect panel.</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Control the Panel</p>
                  <p className="text-sm">Move your hands to reposition and resize the rectangular panel. The panel is defined by your index and thumb tips.</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Cycle Effects</p>
                  <p className="text-sm">Pinch one hand (bring thumb and index finger together) to cycle to the next visual effect.</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Adjust Parameters</p>
                  <p className="text-sm">Use the slider in the bottom-left corner to fine-tune the active effect's key parameter.</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Switch Effects</p>
                  <p className="text-sm">Click the colored dots at the bottom-left to jump directly to any effect mode.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gestures' && (
            <div className="space-y-4 text-gray-300">
              <h3 className="text-lg font-semibold text-white mb-4">Gesture Controls</h3>
              <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded">
                  <p className="font-semibold text-white mb-2">👐 Both Hands Visible</p>
                  <p className="text-sm">Rectangular panel appears between your hands with the active effect applied inside.</p>
                </div>
                <div className="bg-gray-800 p-4 rounded">
                  <p className="font-semibold text-white mb-2">🤏 Pinch Gesture</p>
                  <p className="text-sm">Bring your thumb and index finger together to cycle to the next effect (1.5s cooldown).</p>
                </div>
                <div className="bg-gray-800 p-4 rounded">
                  <p className="font-semibold text-white mb-2">✋ One Hand Only</p>
                  <p className="text-sm">Hand skeleton is drawn but no effect panel appears.</p>
                </div>
                <div className="bg-gray-800 p-4 rounded">
                  <p className="font-semibold text-white mb-2">🤐 Both Hands Pinching</p>
                  <p className="text-sm">Panel transforms into a horizontal strip between your pinch centers.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-3 text-gray-300">
              <h3 className="text-lg font-semibold text-white mb-4">13 Visual Effects</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="text-sm">
                  <span className="font-semibold text-cyan-400">X-RAY</span> - Blue volume with cyan edge detection, scanlines, and film grain
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-orange-500">THERMAL</span> - Heat-map gradient from blue to red to yellow
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-green-500">MATRIX</span> - Green digital rain with scrolling columns
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-magenta-500">NEON</span> - Dark background with vivid magenta/cyan edge glow
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-pink-500">PARTICLE</span> - Color-cycling blocky grid with strobing particles
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-yellow-500">MOSAIC</span> - Adaptive block pixels with gold edge outlines
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-cyan-400">OPT FLOW</span> - Motion detection via frame differencing
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-purple-400">TIME SLICE</span> - Temporal distortion with 20-frame rolling buffer
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-green-400">ASCII</span> - ASCII characters on dark background
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-yellow-300">ASCII OV</span> - Semi-transparent character overlay
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-white">TRACKING</span> - Real blob tracking with motion trails
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-orange-400">FLOWER</span> - Grid of 5-petal flower shapes
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-blue-300">GLASS</span> - 3D glass sphere with refraction and caustics
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
