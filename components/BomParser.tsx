
import React from 'react';

interface BomParserProps {
  markdown: string;
}

export const BomParser: React.FC<BomParserProps> = ({ markdown }) => {
  // Simple parser for the specific Gemini BOM format
  // format usually: ## Title \n - **Key**: Value
  
  const lines = markdown.split('\n').filter(line => line.trim().length > 0);
  
  const renderLine = (line: string, index: number) => {
    // Header
    if (line.startsWith('##')) {
      return (
        <h3 key={index} className="text-emerald-400 font-bold text-xs uppercase tracking-widest mt-6 mb-3 border-b border-emerald-500/20 pb-2">
          {line.replace(/^#+\s*/, '')}
        </h3>
      );
    }
    
    // List item with bold key
    const match = line.match(/^\s*-\s*\*\*(.*?)\*\*:\s*(.*)/);
    if (match) {
      return (
        <div key={index} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-2 border-b border-white/5 hover:bg-white/5 transition-colors px-3 rounded-md">
          <span className="text-indigo-300 font-mono text-[10px] uppercase font-bold sm:w-36 flex-shrink-0 tracking-tight">
            {match[1]}
          </span>
          <span className="text-slate-300 font-mono text-xs leading-relaxed">
            {match[2]}
          </span>
        </div>
      );
    }

    // Standard list item
    if (line.startsWith('-')) {
       return (
        <div key={index} className="flex gap-3 py-1.5 px-3">
            <span className="text-emerald-500 text-xs mt-0.5">▹</span>
            <span className="text-slate-400 text-xs font-mono leading-relaxed">{line.replace(/^-\s*/, '')}</span>
        </div>
       )
    }

    // Fallback paragraph
    return <p key={index} className="text-slate-500 text-xs py-1.5 px-3 leading-relaxed">{line}</p>;
  };

  return (
    <div className="w-full pb-4">
      {lines.map((line, i) => renderLine(line, i))}
    </div>
  );
};
