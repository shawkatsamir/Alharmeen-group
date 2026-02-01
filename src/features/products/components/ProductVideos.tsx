"use client";

import { useState } from "react";
import { getYoutubeId } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PackageOpen, Sparkles, Wrench } from "lucide-react"; // Icons

export interface VideoUrls {
  unboxing?: string;
  features?: string;
  troubleshooting?: string;
}

export function ProductVideos({ videos }: { videos: VideoUrls | null }) {
  // If no videos exist at all, return null

  // Define our tabs configuration
  const tabs = [
    { key: "unboxing", label: "Unboxing", icon: PackageOpen },
    { key: "features", label: "المميزات", icon: Sparkles },
    { key: "troubleshooting", label: "حلول الأعطال", icon: Wrench },
  ].filter((tab) => videos?.[tab.key as keyof VideoUrls]); // Only show tabs that have URLs

  const [activeTab, setActiveTab] = useState(tabs[0]?.key);
  if (!videos || Object.keys(videos).length === 0) return null;
  if (tabs.length === 0) return null;

  const activeUrl = videos[activeTab as keyof VideoUrls];
  const videoId = getYoutubeId(activeUrl);

  return (
    <div className="mt-8 border rounded-xl overflow-hidden bg-white shadow-sm">
      {/* 1. Header / Tabs */}
      <div className="flex border-b bg-gray-50 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-white text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2. The Video Player (Responsive!) */}
      <div className="p-4 bg-black/5">
        {videoId ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              width="445"
              height="250"
            />
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400">
            Invalid Video URL
          </div>
        )}
      </div>
    </div>
  );
}
